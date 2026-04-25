import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { linePayRequest } from '@/lib/linepay'

export async function POST(request: NextRequest) {
  try {
    const { orderId, amount, productName } = await request.json()
    if (!orderId || !amount || !productName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const base = process.env.NEXT_PUBLIC_BASE_URL
    const confirmUrl = `${base}/api/linepay/confirm?orderId=${orderId}`
    const cancelUrl  = `${base}/payment/failed?orderId=${orderId}`

    const result = await linePayRequest(orderId, amount, productName, confirmUrl, cancelUrl)

    if (result.returnCode !== '0000') {
      console.error('LINE Pay request failed:', result)
      return NextResponse.json({ error: result.returnMessage }, { status: 502 })
    }

    const transactionId = String(result.info.transactionId)
    await sql`UPDATE orders SET transaction_id = ${transactionId} WHERE id = ${orderId}`

    return NextResponse.json({ paymentUrl: result.info.paymentUrl.web })
  } catch (error) {
    console.error('POST /api/linepay/request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
