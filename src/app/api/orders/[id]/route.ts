import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { emit } from '@/lib/events'

function parseOrder(row: any) {
  return {
    ...row,
    items: Array.isArray(row.items)
      ? row.items
      : typeof row.items === 'string'
      ? JSON.parse(row.items)
      : [],
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { id } = await params

    const allowedFields = ['status', 'paid']
    const updates = Object.fromEntries(
      Object.entries(body).filter(([key]) => allowedFields.includes(key))
    )

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    let updated: any
    const status = updates.status as string | undefined
    const paid = updates.paid as boolean | undefined

    if (status !== undefined && paid !== undefined) {
      ;[updated] = await sql`
        UPDATE orders SET status = ${status}, paid = ${paid}
        WHERE id = ${id} RETURNING *
      `
    } else if (status !== undefined) {
      ;[updated] = await sql`
        UPDATE orders SET status = ${status}
        WHERE id = ${id} RETURNING *
      `
    } else {
      ;[updated] = await sql`
        UPDATE orders SET paid = ${paid!}
        WHERE id = ${id} RETURNING *
      `
    }

    if (updated) {
      emit('kitchen', 'order-updated', parseOrder(updated))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH /api/orders/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
