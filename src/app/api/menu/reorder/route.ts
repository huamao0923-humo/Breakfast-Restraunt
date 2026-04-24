import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

// PATCH /api/menu/reorder
// Body: { categoryOrder: string[], itemOrders: Record<string, string[]> }
// Assigns globally-unique sort_order values:
//   category 0 → items get 0, 1, 2, …
//   category 1 → items get 1000, 1001, 1002, …
//   (max 999 items per category)
export async function PATCH(request: NextRequest) {
  try {
    const { categoryOrder, itemOrders } = (await request.json()) as {
      categoryOrder: string[]
      itemOrders: Record<string, string[]>
    }

    if (!Array.isArray(categoryOrder) || typeof itemOrders !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const updates: { id: string; sort_order: number }[] = []

    categoryOrder.forEach((cat, catIdx) => {
      const ids: string[] = Array.isArray(itemOrders[cat]) ? itemOrders[cat] : []
      ids.forEach((id, itemIdx) => {
        updates.push({ id, sort_order: catIdx * 1000 + itemIdx })
      })
    })

    // Bulk update — run all updates concurrently
    await Promise.all(
      updates.map(({ id, sort_order }) =>
        sql`UPDATE menu_items SET sort_order = ${sort_order} WHERE id = ${id}`
      )
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PATCH /api/menu/reorder error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
