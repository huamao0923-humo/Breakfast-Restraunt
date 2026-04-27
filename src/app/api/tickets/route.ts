import { NextResponse } from 'next/server'
import sql from '@/lib/db'

// Returns the next available takeout pickup number for today
export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const [{ max_num }] = await sql`
      SELECT COALESCE(MAX(pickup_number), 0) AS max_num
      FROM orders
      WHERE table_id = 'takeout'
      AND created_at >= ${today.toISOString()}
    `
    return NextResponse.json({ number: (Number(max_num) || 0) + 1 })
  } catch (error) {
    console.error('GET /api/tickets error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
