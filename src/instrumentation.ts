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
  }
}
