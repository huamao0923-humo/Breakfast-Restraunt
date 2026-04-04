import { NextRequest, NextResponse } from 'next/server'
import { emit } from '@/lib/events'

export async function POST(request: NextRequest) {
  try {
    const { soldOut } = await request.json()
    emit('menu-updates', 'sold-out-update', { soldOut })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
