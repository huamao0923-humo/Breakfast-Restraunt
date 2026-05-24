import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

/**
 * POST /api/receipt/release
 * Body: { orderId: string }
 *
 * 還原 printed_at = NULL，讓佇列下次可以重試列印。
 * 列印途中 BLE 失敗時由前端呼叫。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const orderId: string | undefined = body?.orderId
    if (!orderId) {
      return NextResponse.json({ error: 'missing_orderId' }, { status: 400 })
    }
    await sql`UPDATE orders SET printed_at = NULL WHERE id = ${orderId}`
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('POST /api/receipt/release error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
