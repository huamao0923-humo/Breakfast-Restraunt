import type { Order } from '@/types'

const ESC = '\x1B'
const GS  = '\x1D'
const FS  = '\x1C'

const INIT         = ESC + '\x40'
const ALIGN_LEFT   = ESC + '\x61\x00'
const ALIGN_CENTER = ESC + '\x61\x01'
const BOLD_ON      = ESC + '\x45\x01'
const BOLD_OFF     = ESC + '\x45\x00'
const CHINESE_ON   = FS  + '\x26'
const LF           = '\n'
const CUT          = GS  + '\x56\x41\x10'

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

export function formatReceiptString(order: Order, storeName = '早餐店'): string {
  const parts: string[] = []
  const push = (...lines: string[]) => parts.push(...lines)

  push(INIT, CHINESE_ON)

  push(ALIGN_CENTER, BOLD_ON, center(storeName), BOLD_OFF, LF)
  push(divider(), LF)

  push(ALIGN_LEFT)
  const label = order.table_id === 'takeout'
    ? `外帶 #${String(order.pickup_number ?? 0).padStart(3, '0')}`
    : `${order.table_id} 桌`
  const time = new Date(order.created_at).toLocaleTimeString('zh-TW', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })

  push(BOLD_ON, label, BOLD_OFF, LF)
  push(`時間: ${time}`, LF)
  push(divider(), LF)

  for (const item of order.items) {
    const right = `x${item.qty}  $${item.price * item.qty}`
    push(padEnd(item.name, PAPER_WIDTH - strWidth(right)) + right, LF)
    if (item.options?.length) {
      push('  ' + item.options.map(o => o.label).join(' '), LF)
    }
  }

  push(divider(), LF)

  const totalStr = `$${order.total}`
  push(BOLD_ON, padEnd('合計', PAPER_WIDTH - strWidth(totalStr)) + totalStr, BOLD_OFF, LF)

  if (order.note) {
    push(divider('.'), LF)
    push(`備註: ${order.note}`, LF)
  }

  push(LF, LF, ALIGN_CENTER, center('謝謝光臨'), LF)
  push(LF, LF, LF, CUT)

  return parts.join('')
}
