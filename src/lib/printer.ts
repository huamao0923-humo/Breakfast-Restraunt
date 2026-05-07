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

/** 將文字依 maxWidth 自動斷行，回傳各行陣列 */
function wrapText(text: string, maxWidth: number): string[] {
  const lines: string[] = []
  let current = ''
  let currentW = 0
  for (const char of text) {
    const charW = char.charCodeAt(0) > 0x7f ? 2 : 1
    if (currentW + charW > maxWidth) {
      lines.push(current)
      current = char
      currentW = charW
    } else {
      current += char
      currentW += charW
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

/**
 * 品項區塊：
 * - 品項名靠左，數量+金額靠右同行（若放得下）
 * - 名稱太長時自動換行，數量+金額接在最後一行右側
 * - 加料文字靠左縮排，超長自動換行
 */
function itemBlock(
  name: string,
  qty: number,
  subtotal: number,
  options: { label: string }[],
): string[] {
  const right  = `x${qty}  $${subtotal}`
  const rightW = strWidth(right)
  const lines: string[] = []

  if (strWidth(name) + rightW <= PAPER_WIDTH) {
    lines.push(padEnd(name, PAPER_WIDTH - rightW) + right)
  } else {
    const nameLines = wrapText(name, PAPER_WIDTH)
    const lastIdx   = nameLines.length - 1
    if (strWidth(nameLines[lastIdx]) + rightW <= PAPER_WIDTH) {
      nameLines[lastIdx] = padEnd(nameLines[lastIdx], PAPER_WIDTH - rightW) + right
    } else {
      nameLines.push(' '.repeat(PAPER_WIDTH - rightW) + right)
    }
    lines.push(...nameLines)
  }

  if (options.length) {
    const optText   = options.map(o => o.label).join(' ')
    const optLines  = wrapText(optText, PAPER_WIDTH - 2)
    lines.push(...optLines.map(l => '  ' + l))
  }

  return lines
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
    const block = itemBlock(item.name, item.qty, item.price * item.qty, item.options ?? [])
    for (const line of block) push(line, LF)
  }

  push(divider(), LF)

  const totalStr = `$${order.total}`
  push(BOLD_ON, padEnd('合計', PAPER_WIDTH - strWidth(totalStr)) + totalStr, BOLD_OFF, LF)

  if (order.note) {
    push(divider('.'), LF)
    const notePrefix = '備註: '
    const noteLines  = wrapText(notePrefix + order.note, PAPER_WIDTH)
    for (const line of noteLines) push(line, LF)
  }

  push(LF, LF, ALIGN_CENTER, center('謝謝光臨'), LF)
  push(LF, LF, LF, CUT)

  return parts.join('')
}
