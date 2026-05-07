import { NextRequest, NextResponse } from 'next/server'
import iconv from 'iconv-lite'
import { formatReceiptString } from '@/lib/printer'
import type { Order } from '@/types'

export async function POST(req: NextRequest) {
  const order = await req.json() as Order
  const str = formatReceiptString(order)
  const gbkBytes = iconv.encode(str, 'gbk')
  const base64 = Buffer.from(gbkBytes).toString('base64')
  return NextResponse.json({ data: base64 })
}
