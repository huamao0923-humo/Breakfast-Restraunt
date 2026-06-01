import sql from '@/lib/db'
import { emit } from '@/lib/events'

export interface ShopSettings {
  is_open: boolean
  closed_message: string
  auto_close_time: string | null   // 'HH:MM'
  auto_closed_on: string | null    // 'YYYY-MM-DD'
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
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,   // 'YYYY-MM-DD'
    time: `${parts.hour}:${parts.minute}`,               // 'HH:MM'
  }
}

/**
 * 讀取目前店況。同時做 lazy auto-close：
 *  - 若已超過 auto_close_time 且今天還沒被自動關過 → 原子更新關門並廣播 SSE。
 * 所有需要判斷 is_open 的地方都應該呼叫這個 helper（包括 API GET、orders POST）。
 */
export async function getCurrentShopSettings(): Promise<ShopSettings> {
  const [row] = await sql<ShopSettings[]>`
    SELECT is_open, closed_message, auto_close_time,
           to_char(auto_closed_on, 'YYYY-MM-DD') AS auto_closed_on
    FROM shop_settings WHERE id = 'current'
  `
  if (!row) {
    // 萬一 instrumentation 沒跑到（理論不會），返回安全預設
    return { is_open: false, closed_message: '目前未營業，請稍後再試', auto_close_time: null, auto_closed_on: null }
  }

  if (row.is_open && row.auto_close_time) {
    const { date, time } = nowTaipei()
    const pastClose = time >= row.auto_close_time
    const notClosedToday = row.auto_closed_on !== date
    if (pastClose && notClosedToday) {
      const [updated] = await sql<ShopSettings[]>`
        UPDATE shop_settings
        SET is_open = false,
            auto_closed_on = ${date}::date,
            updated_at = NOW()
        WHERE id = 'current' AND is_open = true
          AND (auto_closed_on IS NULL OR auto_closed_on <> ${date}::date)
        RETURNING is_open, closed_message, auto_close_time,
                  to_char(auto_closed_on, 'YYYY-MM-DD') AS auto_closed_on
      `
      if (updated) {
        emit('menu-updates', 'shop-settings-changed', updated)
        emit('kitchen', 'shop-settings-changed', updated)
        return updated
      }
    }
  }
  return row
}

export async function updateShopSettings(patch: Partial<ShopSettings>): Promise<ShopSettings> {
  const { is_open, closed_message, auto_close_time } = patch

  // 手動切換 is_open（管它是開還是關）→ 清掉 auto_closed_on，讓自動關門邏輯隔天重新計算
  const shouldResetAutoClosedOn = is_open !== undefined

  const [row] = await sql<ShopSettings[]>`
    UPDATE shop_settings SET
      is_open         = COALESCE(${is_open ?? null}, is_open),
      closed_message  = COALESCE(${closed_message ?? null}, closed_message),
      auto_close_time = ${auto_close_time === undefined ? sql`auto_close_time` : auto_close_time},
      auto_closed_on  = ${shouldResetAutoClosedOn ? null : sql`auto_closed_on`},
      updated_at      = NOW()
    WHERE id = 'current'
    RETURNING is_open, closed_message, auto_close_time,
              to_char(auto_closed_on, 'YYYY-MM-DD') AS auto_closed_on
  `
  emit('menu-updates', 'shop-settings-changed', row)
  emit('kitchen', 'shop-settings-changed', row)
  return row
}
