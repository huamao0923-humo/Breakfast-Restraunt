import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const password = new URL(req.url).searchParams.get('password')
    if (password !== process.env.REPORT_PASSWORD) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    const [{ total_count, revenue }] = await sql<{ total_count: string; revenue: string }[]>`
      SELECT
        COUNT(*)::text         AS total_count,
        COALESCE(SUM(total),0)::text AS revenue
      FROM orders
      WHERE created_at >= ${todayISO} AND status <> 'cancelled'
    `

    const [{ pending_count }] = await sql<{ pending_count: string }[]>`
      SELECT COUNT(*)::text AS pending_count
      FROM orders
      WHERE created_at >= ${todayISO} AND status = 'pending'
    `

    return NextResponse.json({
      today_order_count: Number(total_count),
      today_revenue:     Number(revenue),
      pending_count:     Number(pending_count),
    })
  } catch (error) {
    console.error('GET /api/admin/stats error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
