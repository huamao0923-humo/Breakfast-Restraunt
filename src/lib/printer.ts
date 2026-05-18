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
const LINE_SPACING = ESC + '\x33\x3C'  // ESC 3 60：行距調高一個級距（預設約 30）
const LF           = '\n'
const CUT          = GS  + '\x56\x41\x10'

// 字體大小
const SIZE_NORMAL   = GS + '!\x00'  // 標準
const SIZE_LARGE    = GS + '!\x01'  // 加高（寬不變，行容量維持 32）
const SIZE_TITLE    = GS + '!\x11'  // 標題：加寬加高（行容量縮為 16）

const PAPER_WIDTH       = 32  // 標準 / 加高模式下的行寬
const PAPER_WIDTH_TITLE = 16  // 加寬加高模式下的行寬

function strWidth(s: string): number {
  let w = 0
  for (const c of s) w += c.charCodeAt(0) > 0x7f ? 2 : 1
  return w
}

function padEnd(s: string, targetW: number): string {
  return s + ' '.repeat(Math.max(0, targetW - strWidth(s)))
}

function centerIn(s: string, width: number): string {
  const pad = Math.max(0, Math.floor((width - strWidth(s)) / 2))
  return ' '.repeat(pad) + s
}

function divider(char = '-'): string {
  return char.repeat(PAPER_WIDTH)
}

/** 將文字依 maxWidth 自動斷行 */
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
 * - 品項名靠左，數量+金額靠右同行；名稱過長則換行，金額接在最後一行右側
 * - 每項加料各自獨立一行，靠左縮排，超長自動換行
 */
function itemBlock(
  name: string,
  qty: number,
  subtotal: number,
  options: { label: string }[],
  width: number = PAPER_WIDTH,
): string[] {
  const right  = `x${qty}  $${subtotal}`
  const rightW = strWidth(right)
  const lines: string[] = []

  if (strWidth(name) + rightW <= width) {
    lines.push(padEnd(name, width - rightW) + right)
  } else {
    const nameLines = wrapText(name, width)
    const lastIdx   = nameLines.length - 1
    if (strWidth(nameLines[lastIdx]) + rightW <= width) {
      nameLines[lastIdx] = padEnd(nameLines[lastIdx], width - rightW) + right
    } else {
      nameLines.push(' '.repeat(width - rightW) + right)
    }
    lines.push(...nameLines)
  }

  // 每項加料各自一行
  for (const opt of options) {
    const optLines = wrapText(opt.label, width - 2)
    lines.push(...optLines.map(l => '  ' + l))
  }

  return lines
}

export function formatReceiptString(order: Order, storeName = '忠國豆漿店'): string {
  const parts: string[] = []
  const push = (...lines: string[]) => parts.push(...lines)

  push(INIT, CHINESE_ON, LINE_SPACING)

  // ── 標題（大字）─────────────────────────────
  push(ALIGN_CENTER, SIZE_TITLE)
  push(BOLD_ON, storeName, BOLD_OFF, LF)

  // ── 副標題────────────────────────────────
  push(ALIGN_CENTER, SIZE_TITLE)
  push('現點現做，感謝您耐心等待', LF)
  push(SIZE_NORMAL, divider(), LF)

  // ── 訂單資訊────────────────────────────────
  push(ALIGN_LEFT, SIZE_TITLE)

  // 解析線上自取的姓名
  const isOnline = order.table_id === 'online'
  const onlineFirstLine = isOnline && order.note?.startsWith('[線上自取]')
    ? order.note.split('\n')[0].replace('[線上自取] ', '')
    : null
  const onlineName = onlineFirstLine ? onlineFirstLine.split('・')[0] : ''

  const label = order.table_id === 'takeout'
    ? `外帶 #${String(order.pickup_number ?? 0).padStart(3, '0')}`
    : isOnline
      ? `線上 ${onlineName}`
      : `${order.table_id} 桌`
  const pickupStr = isOnline
    ? `#${String(order.pickup_number ?? 0).padStart(3, '0')}`
    : null
  const time = new Date(order.created_at).toLocaleTimeString('zh-TW', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei',
  })
  push(BOLD_ON, label, BOLD_OFF, LF)
  if (pickupStr) push(pickupStr, LF)
  push(`時間: ${time}`, LF)
  push(SIZE_NORMAL, divider(), LF)

  // ── 品項────────────────────────────────────
  push(SIZE_TITLE)
  for (const item of order.items) {
    const block = itemBlock(item.name, item.qty, item.price * item.qty, item.options ?? [], PAPER_WIDTH_TITLE)
    for (const line of block) push(line, LF)
  }
  push(SIZE_NORMAL, divider(), LF)

  // ── 合計────────────────────────────────────
  push(SIZE_TITLE)
  const totalStr = `$${order.total}`
  push(BOLD_ON, padEnd('合計', PAPER_WIDTH_TITLE - strWidth(totalStr)) + totalStr, BOLD_OFF, LF)

  // ── 備註（線上自取過濾掉第一行姓名電話）──────
  const rawNote = isOnline && order.note?.startsWith('[線上自取]')
    ? order.note.split('\n').slice(1).join('\n').trim()
    : order.note
  if (rawNote) {
    push(SIZE_NORMAL, divider('.'), LF, SIZE_LARGE)
    const noteLines = wrapText('備註: ' + rawNote, PAPER_WIDTH)
    for (const line of noteLines) push(line, LF)
  }

  // ── 頁尾────────────────────────────────────
  push(SIZE_NORMAL, LF, ALIGN_CENTER)
  push('謝謝光臨', LF)
  push('[System by 華宇資訊]', LF)
  push(LF, LF, CUT)

  return parts.join('')
}
