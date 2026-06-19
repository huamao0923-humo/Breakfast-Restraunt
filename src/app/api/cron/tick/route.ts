import { NextResponse } from 'next/server'
import { getCurrentShopSettings } from '@/lib/shop'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    await getCurrentShopSettings()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('cron tick error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
