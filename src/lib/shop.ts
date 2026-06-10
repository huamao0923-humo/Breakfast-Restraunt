import sql from '@/lib/db'
import { emit } from '@/lib/events'

export interface ShopSettings {
  is_open: boolean
  closed_message: string
  auto_open_time: string | null     // 'HH:MM' or null = 停用自動開店
  auto_close_time: string | null    // 'HH:MM' or null = 停用自動關店
  auto_opened_on: string | null     // 'YYYY-MM-DD'：今天已自動/手動開過的日期
  auto_closed_on: string | null     // 'YYYY-MM-DD'：今天已自動/手動關過的日期
  off_weekdays: number[]            // 每週固定公休（0=日 .. 6=六）
  holidays: string[]                // 一次性休假日期 ['YYYY-MM-DD']
}

// 回傳欄位（含 JSONB 與日期格式化），多處共用
function returnCols() {
  return sql`
    is_open, closed_message, auto_open_time, auto_close_time,
    to_char(auto_opened_on, 'YYYY-MM-DD') AS auto_opened_on,
    to_char(auto_closed_on, 'YYYY-MM-DD') AS auto_closed_on,
    off_weekdays, holidays
  `
}

const FALLBACK: ShopSettings = {
  is_open: false,
  closed_message: '目前未營業，請稍後再試',
  auto_open_time: '05:30',
  auto_close_time: null,
  auto_opened_on: null,
  auto_closed_on: null,
  off_weekdays: [1, 2],
  holidays: [],
}

function nowTaipei() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date()).map(p => [p.type, p.value])
  )
  const date = `${parts.year}-${parts.month}-${parts.day}`   // 'YYYY-MM-DD'
  const time = `${parts.hour}:${parts.minute}`               // 'HH:MM'
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay()  // 0=日 .. 6=六
  return { date, time, weekday }
}

function broadcast(s: ShopSettings) {
  emit('menu-updates', 'shop-settings-changed', s)
  emit('kitchen', 'shop-settings-changed', s)
}

/**
 * 讀取目前店況，並 lazy / scheduler 觸發自動開關店：
 *  1. 公休日（每週固定 or 特定日期）+ 仍開著 + 非今天手動開 → 強制關店
 *  2. 非公休日 + 已關 + 到了開店時間 + 今天還沒開過 + 還沒到關店時間 → 自動開店
 *  3. 開著 + 到了關店時間 + 今天還沒關過 → 自動關店
 * 由 API GET、orders POST、與伺服器端每分鐘排程器共同呼叫。
 */
export async function getCurrentShopSettings(): Promise<ShopSettings> {
  const [row] = await sql<ShopSettings[]>`
    SELECT ${returnCols()} FROM shop_settings WHERE id = 'current'
  `
  if (!row) return FALLBACK

  const { date, time, weekday } = nowTaipei()
  const offWeekdays = Array.isArray(row.off_weekdays) ? row.off_weekdays : []
  const holidays    = Array.isArray(row.holidays) ? row.holidays : []
  const isDayOff    = offWeekdays.includes(weekday) || holidays.includes(date)

  // 1. 公休日強制關店（除非今天是手動開的）
  if (isDayOff && row.is_open && row.auto_opened_on !== date) {
    const [updated] = await sql<ShopSettings[]>`
      UPDATE shop_settings
      SET is_open = false, auto_closed_on = ${date}::date, updated_at = NOW()
      WHERE id = 'current' AND is_open = true
        AND (auto_opened_on IS NULL OR auto_opened_on <> ${date}::date)
      RETURNING ${returnCols()}
    `
    if (updated) { broadcast(updated); return updated }
    return row
  }

  // 2. 自動開店
  if (!isDayOff && !row.is_open && row.auto_open_time
      && time >= row.auto_open_time
      && row.auto_opened_on !== date
      && (!row.auto_close_time || time < row.auto_close_time)) {
    const [updated] = await sql<ShopSettings[]>`
      UPDATE shop_settings
      SET is_open = true, auto_opened_on = ${date}::date, updated_at = NOW()
      WHERE id = 'current' AND is_open = false
        AND (auto_opened_on IS NULL OR auto_opened_on <> ${date}::date)
      RETURNING ${returnCols()}
    `
    if (updated) { broadcast(updated); return updated }
    return row
  }

  // 3. 自動關店
  if (row.is_open && row.auto_close_time
      && time >= row.auto_close_time
      && row.auto_closed_on !== date) {
    const [updated] = await sql<ShopSettings[]>`
      UPDATE shop_settings
      SET is_open = false, auto_closed_on = ${date}::date, updated_at = NOW()
      WHERE id = 'current' AND is_open = true
        AND (auto_closed_on IS NULL OR auto_closed_on <> ${date}::date)
      RETURNING ${returnCols()}
    `
    if (updated) { broadcast(updated); return updated }
    return row
  }

  return row
}

export async function updateShopSettings(patch: Partial<ShopSettings>): Promise<ShopSettings> {
  const { date } = nowTaipei()

  // 手動開/關店 → 把對應的「今天已開/已關」標記設為今天，避免排程器立刻反向觸發
  const openedOnFrag = patch.is_open === true  ? sql`${date}::date` : sql`auto_opened_on`
  const closedOnFrag = patch.is_open === false ? sql`${date}::date` : sql`auto_closed_on`

  const [row] = await sql<ShopSettings[]>`
    UPDATE shop_settings SET
      is_open         = ${patch.is_open         === undefined ? sql`is_open`         : patch.is_open},
      closed_message  = ${patch.closed_message  === undefined ? sql`closed_message`  : patch.closed_message},
      auto_open_time  = ${patch.auto_open_time  === undefined ? sql`auto_open_time`  : patch.auto_open_time},
      auto_close_time = ${patch.auto_close_time === undefined ? sql`auto_close_time` : patch.auto_close_time},
      off_weekdays    = ${patch.off_weekdays    === undefined ? sql`off_weekdays`    : sql.json(patch.off_weekdays)},
      holidays        = ${patch.holidays        === undefined ? sql`holidays`        : sql.json(patch.holidays)},
      auto_opened_on  = ${openedOnFrag},
      auto_closed_on  = ${closedOnFrag},
      updated_at      = NOW()
    WHERE id = 'current'
    RETURNING ${returnCols()}
  `
  broadcast(row)
  return row
}
