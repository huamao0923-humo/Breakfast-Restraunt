import type { Order } from '@/types'

const ESC = 0x1b
const GS  = 0x1d

const INIT         = [ESC, 0x40]
const ALIGN_LEFT   = [ESC, 0x61, 0x00]
const ALIGN_CENTER = [ESC, 0x61, 0x01]
const BOLD_ON      = [ESC, 0x45, 0x01]
const BOLD_OFF     = [ESC, 0x45, 0x00]
const LF           = [0x0a]
const CUT          = [GS, 0x56, 0x41, 0x10]

const PAPER_WIDTH = 32

function strWidth(s: string): number {
  let w = 0
  for (const c of s) w += c.charCodeAt(0) > 0x7f ? 2 : 1
  return w
}

function padEnd(s: string, width: number): string {
  return s + ' '.repeat(Math.max(0, width - strWidth(s)))
}

function center(s: string): string {
  const pad = Math.max(0, Math.floor((PAPER_WIDTH - strWidth(s)) / 2))
  return ' '.repeat(pad) + s
}

function divider(char = '-'): string {
  return char.repeat(PAPER_WIDTH)
}

export function formatReceiptBytes(order: Order, storeName = '早餐店'): Uint8Array {
  const enc   = new TextEncoder()
  const parts: number[] = []
  const push  = (...chunks: (number[] | Uint8Array)[]) => {
    for (const c of chunks) parts.push(...c)
  }

  push(INIT)

  push(ALIGN_CENTER, BOLD_ON)
  push(enc.encode(center(storeName)), LF)
  push(BOLD_OFF, enc.encode(divider()), LF)

  push(ALIGN_LEFT)
  const label = order.table_id === 'takeout'
    ? `外帶 #${String(order.pickup_number ?? 0).padStart(3, '0')}`
    : `${order.table_id} 桌`
  const time = new Date(order.created_at).toLocaleTimeString('zh-TW', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  push(BOLD_ON, enc.encode(label), BOLD_OFF, LF)
  push(enc.encode(`時間: ${time}`), LF)
  push(enc.encode(divider()), LF)

  for (const item of order.items) {
    const right = `x${item.qty}  $${item.price * item.qty}`
    push(enc.encode(padEnd(item.name, PAPER_WIDTH - strWidth(right)) + right), LF)
    if (item.options?.length) {
      push(enc.encode('  ' + item.options.map(o => o.label).join(' ')), LF)
    }
  }

  push(enc.encode(divider()), LF)

  const totalStr = `$${order.total}`
  push(BOLD_ON, enc.encode(padEnd('合計', PAPER_WIDTH - strWidth(totalStr)) + totalStr), BOLD_OFF, LF)

  if (order.note) {
    push(enc.encode(divider('.')), LF)
    push(enc.encode(`備註: ${order.note}`), LF)
  }

  push(LF, LF, ALIGN_CENTER)
  push(enc.encode(center('謝謝光臨')), LF)
  push(LF, LF, LF, CUT)

  return new Uint8Array(parts)
}
