import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { linePayConfirm } from '@/lib/linepay'
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const transactionId = searchParams.get('transactionId')
  const orderId       = searchParams.get('orderId')

  if (!transactionId || !orderId) {
    return NextResponse.redirect(new URL('/payment/failed?reason=missing_params', request.url))
  }

  try {
    const [order] = await sql`SELECT * FROM orders WHERE id = ${orderId}`
    if (!order) {
      return NextResponse.redirect(new URL('/payment/failed?reason=not_found', request.url))
    }

    const result = await linePayConfirm(transactionId, order.total)

    if (result.returnCode !== '0000') {
      console.error('LINE Pay confirm failed:', result)
      return NextResponse.redirect(
        new URL(`/payment/failed?orderId=${orderId}&reason=${encodeURIComponent(result.returnMessage)}`, request.url)
      )
    }

    await sql`UPDATE orders SET paid = true, transaction_id = ${transactionId} WHERE id = ${orderId}`

    const [updated] = await sql`SELECT * FROM orders WHERE id = ${orderId}`
    emit('kitchen', 'new-order', parseOrder(updated))

    return NextResponse.redirect(
      new URL(`/payment/success?orderId=${orderId}`, request.url)
    )
  } catch (error) {
    console.error('GET /api/linepay/confirm error:', error)
    return NextResponse.redirect(new URL('/payment/failed?reason=server_error', request.url))
  }
}
