export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.DATABASE_URL) {
    const { default: sql } = await import('./lib/db')

    await sql`
      CREATE TABLE IF NOT EXISTS menu_items (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        name TEXT NOT NULL,
        price INTEGER NOT NULL,
        options JSONB NOT NULL DEFAULT '[]'::jsonb,
        sort_order INTEGER NOT NULL DEFAULT 0
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        table_id TEXT NOT NULL,
        pickup_number INTEGER,
        items JSONB NOT NULL DEFAULT '[]'::jsonb,
        total INTEGER NOT NULL,
        note TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        paid BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `

    // 自動列印用：紀錄訂單被列印的時間，原子佔位避免重複列印
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS printed_at TIMESTAMPTZ`

    // 品項說明（給客人/廚房看的內部備註，不列印在紙本上）
    await sql`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS description TEXT`

    // 營業狀態 singleton row（id='current'）
    await sql`
      CREATE TABLE IF NOT EXISTS shop_settings (
        id TEXT PRIMARY KEY DEFAULT 'current',
        is_open BOOLEAN NOT NULL DEFAULT false,
        closed_message TEXT NOT NULL DEFAULT '目前未營業，請稍後再試',
        auto_close_time TEXT,
        auto_closed_on DATE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await sql`
      INSERT INTO shop_settings (id, is_open)
      VALUES ('current', false)
      ON CONFLICT (id) DO NOTHING
    `

    // 自動開店 / 每週公休 / 特定休假日 欄位
    await sql`ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS auto_opened_on DATE`
    await sql`ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS off_weekdays JSONB NOT NULL DEFAULT '[1,2]'::jsonb`
    await sql`ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS holidays JSONB NOT NULL DEFAULT '[]'::jsonb`

    // auto_open_time：首次新增時帶入預設 05:30（之後使用者可在後台改）
    const col = await sql`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'shop_settings' AND column_name = 'auto_open_time'
    `
    if (col.length === 0) {
      await sql`ALTER TABLE shop_settings ADD COLUMN auto_open_time TEXT`
      await sql`UPDATE shop_settings SET auto_open_time = '05:30' WHERE id = 'current'`
    }

    // 伺服器端排程器：每分鐘檢查自動開 / 關店（廚房平板不一定開著也能準時生效）
    const g = globalThis as unknown as { __shopScheduler?: ReturnType<typeof setInterval> }
    if (!g.__shopScheduler) {
      const { getCurrentShopSettings } = await import('./lib/shop')
      const tick = () => { getCurrentShopSettings().catch((e) => console.error('shop scheduler error:', e)) }
      g.__shopScheduler = setInterval(tick, 60_000)
      tick()  // 啟動時先跑一次
    }
  }
}
