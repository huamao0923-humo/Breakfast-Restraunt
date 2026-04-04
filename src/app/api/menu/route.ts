import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import type { MenuCategory } from '@/types'

export async function GET() {
  try {
    const rows = await sql`
      SELECT * FROM menu_items ORDER BY category, sort_order ASC
    `

    const grouped: Record<string, MenuCategory> = {}
    for (const row of rows) {
      if (!grouped[row.category]) {
        grouped[row.category] = { category: row.category, items: [] }
      }
      grouped[row.category].items.push({
        id: row.id,
        name: row.name,
        price: row.price,
        options: row.options ?? [],
      })
    }

    return NextResponse.json(Object.values(grouped))
  } catch (error) {
    console.error('GET /api/menu error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, category, name, price, options, sort_order } = body

    if (!id || !category || !name || price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const [row] = await sql`
      INSERT INTO menu_items (id, category, name, price, options, sort_order)
      VALUES (${id}, ${category}, ${name}, ${Number(price)}, ${options ?? []}, ${sort_order ?? 0})
      RETURNING *
    `

    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    console.error('POST /api/menu error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
