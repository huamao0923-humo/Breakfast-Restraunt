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
  }
}
