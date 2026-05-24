import { NextRequest, NextResponse } from 'next/server'
import iconv from 'iconv-lite'
import sql from '@/lib/db'
import { formatReceiptString } from '@/lib/printer'
import type { Order } from '@/types'

function parseOrder(row: any): Order {
  return {
    ...row,
    items: Array.isArray(row.items)
      ? row.items
      : typeof row.items === 'string'
      ? JSON.parse(row.items)
      : [],
  }
}

function encodeReceipt(order: Order): string {
  const str = formatReceiptString(order)
  const gbkBytes = iconv.encode(str, 'gbk')
  return Buffer.from(gbkBytes).toString('base64')
}

/**
 * POST /api/receipt
 * Body: { orderId: string, force?: boolean }
 *
 * force=false (預設、自動列印用)：原子佔位 — 只有 printed_at IS NULL 的訂單會被
 *   標記並回傳 receipt；已被標記過的回 409，呼叫端應跳過。
 * force=true（手動補印用）：直接撈取訂單回傳 receipt，不變更 printed_at。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const orderId: string | undefined = body?.orderId
    const force: boolean = body?.force === true

    if (!orderId) {
      return NextResponse.json({ error: 'missing_orderId' }, { status: 400 })
    }

    if (force) {
      const [row] = await sql`SELECT * FROM orders WHERE id = ${orderId}`
      if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 })
      return NextResponse.json({ data: encodeReceipt(parseOrder(row)) })
    }

    // Atomic claim：只有第一個成功 UPDATE 的呼叫會拿到資料
    const [row] = await sql`
      UPDATE orders
      SET printed_at = NOW()
      WHERE id = ${orderId} AND printed_at IS NULL
      RETURNING *
    `
    if (!row) {
      return NextResponse.json({ error: 'already_printed' }, { status: 409 })
    }
    return NextResponse.json({ data: encodeReceipt(parseOrder(row)) })
  } catch (error) {
    console.error('POST /api/receipt error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
