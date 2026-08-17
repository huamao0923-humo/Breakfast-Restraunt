import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { id } = await params
    const { id: newId, category, name, price, options, sort_order, description } = body

    if (!category || !name || price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // If the ID is being changed, verify the new ID is not already taken
    if (newId && newId !== id) {
      const [{ exists }] = await sql`
        SELECT EXISTS(SELECT 1 FROM menu_items WHERE id = ${newId}) AS exists
      `
      if (exists) {
        return NextResponse.json({ error: `ID「${newId}」已被其他品項使用` }, { status: 409 })
      }
    }

    const [row] = await sql`
      UPDATE menu_items
      SET id       = ${newId ?? id},
          category = ${category},
          name     = ${name},
          price    = ${Number(price)},
          options  = ${sql.json(options ?? [])},
          sort_order = ${sort_order ?? 0},
          description = ${description || null}
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json(row)
  } catch (error) {
    console.error('PUT /api/menu/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await sql`DELETE FROM menu_items WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/menu/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
