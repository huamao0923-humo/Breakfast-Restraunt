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
    const patch: { is_open?: boolean; closed_message?: string; auto_close_time?: string | null } = {}
    if (typeof body.is_open === 'boolean')                          patch.is_open = body.is_open
    if (typeof body.closed_message === 'string')                    patch.closed_message = body.closed_message
    if (body.auto_close_time === null || typeof body.auto_close_time === 'string') {
      patch.auto_close_time = body.auto_close_time
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
