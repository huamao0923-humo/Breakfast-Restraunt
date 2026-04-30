import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import type { MenuCategory } from '@/types'

export async function GET() {
  try {
    // Order by the category's minimum sort_order first (gives category ordering),
    // then by each item's own sort_order within the category.
    const rows = await sql`
      SELECT mi.*,
             cat_rank.cat_min
      FROM   menu_items mi
      JOIN   (
               SELECT category, MIN(sort_order) AS cat_min
               FROM   menu_items
               GROUP  BY category
             ) cat_rank ON mi.category = cat_rank.category
      ORDER  BY cat_rank.cat_min ASC, mi.sort_order ASC
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
        sort_order: row.sort_order,
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

    const [{ max_sort }] = await sql`
      SELECT COALESCE(MAX(sort_order), -1) AS max_sort
      FROM menu_items
      WHERE category = ${category}
    `
    const nextSortOrder = Number(max_sort) + 1

    const [row] = await sql`
      INSERT INTO menu_items (id, category, name, price, options, sort_order)
      VALUES (${id}, ${category}, ${name}, ${Number(price)}, ${options ?? []}, ${nextSortOrder})
      RETURNING *
    `

    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    console.error('POST /api/menu error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
