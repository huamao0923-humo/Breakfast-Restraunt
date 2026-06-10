import { NextRequest, NextResponse } from 'next/server'
import { getCurrentShopSettings, updateShopSettings } from '@/lib/shop'

export async function GET() {
  try {
    const settings = await getCurrentShopSettings()
    return NextResponse.json(settings)
  } catch (error) {
    console.error('GET /api/shop-settings error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const patch: {
      is_open?: boolean; closed_message?: string
      auto_open_time?: string | null; auto_close_time?: string | null
      off_weekdays?: number[]; holidays?: string[]
    } = {}
    if (typeof body.is_open === 'boolean')                          patch.is_open = body.is_open
    if (typeof body.closed_message === 'string')                    patch.closed_message = body.closed_message
    if (body.auto_open_time === null || typeof body.auto_open_time === 'string') {
      patch.auto_open_time = body.auto_open_time
    }
    if (body.auto_close_time === null || typeof body.auto_close_time === 'string') {
      patch.auto_close_time = body.auto_close_time
    }
    if (Array.isArray(body.off_weekdays)) {
      patch.off_weekdays = body.off_weekdays.filter((n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 6)
    }
    if (Array.isArray(body.holidays)) {
      patch.holidays = body.holidays.filter((s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s as string))
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'no_fields' }, { status: 400 })
    }
    const updated = await updateShopSettings(patch)
    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/shop-settings error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
