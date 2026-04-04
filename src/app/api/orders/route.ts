import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { emit } from '@/lib/events'
import { getTodayRange } from '@/lib/utils'
import type { OrderItem } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { table_id, items, total, note } = body

    if (!table_id || !items || total === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let pickup_number: number | null = null

    if (table_id === 'takeout') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const [{ max_num }] = await sql`
        SELECT COALESCE(MAX(pickup_number), 0) AS max_num
        FROM orders
        WHERE table_id = 'takeout'
        AND created_at >= ${today.toISOString()}
      `
      pickup_number = (Number(max_num) || 0) + 1
    }

    const [order] = await sql`
      INSERT INTO orders (table_id, pickup_number, items, total, note, status, paid)
      VALUES (
        ${table_id},
        ${pickup_number},
        ${JSON.stringify(items as OrderItem[])},
        ${total},
        ${note || null},
        'pending',
        false
      )
      RETURNING *
    `

    emit('kitchen', 'new-order', order)

    return NextResponse.json({ id: order.id, pickup_number }, { status: 201 })
  } catch (error) {
    console.error('POST /api/orders error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode')

    // 廚房模式：今天所有未取消的訂單，不需要密碼
    if (mode === 'kitchen') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const rows = await sql`
        SELECT * FROM orders
        WHERE created_at >= ${today.toISOString()}
        AND status != 'cancelled'
        ORDER BY created_at DESC
      `
      return NextResponse.json(rows)
    }

    // 報表模式：需要密碼
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const password = searchParams.get('password')

    if (password !== process.env.REPORT_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const range = from && to ? { from, to } : getTodayRange()

    const rows = await sql`
      SELECT * FROM orders
      WHERE status != 'cancelled'
      AND created_at >= ${`${range.from}T00:00:00`}
      AND created_at < ${`${range.to}T00:00:00`}
      ORDER BY created_at DESC
    `

    return NextResponse.json(rows)
  } catch (error) {
    console.error('GET /api/orders error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
