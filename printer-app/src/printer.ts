// Path: printer-app/src/printer.ts
// ESC/POS 格式化工具 — Xprinter Q90EC 58mm 紙寬（32字元/行）

import { Order, orderOptionsForDisplay } from './types'

// ── ESC/POS 指令 ──────────────────────────────────────────
const ESC = '\x1B'
const GS  = '\x1D'

const INIT          = ESC + '@'          // 初始化印表機
const ALIGN_LEFT    = ESC + 'a\x00'     // 靠左
const ALIGN_CENTER  = ESC + 'a\x01'     // 置中
const BOLD_ON       = ESC + 'E\x01'     // 粗體開
const BOLD_OFF      = ESC + 'E\x00'     // 粗體關
const LF            = '\n'              // 換行
const CUT           = GS + 'V\x41\x10' // 部分裁紙

const PAPER_WIDTH = 32 // 58mm ≈ 32 ASCII 字元

// ── 工具函式 ──────────────────────────────────────────────

/** 計算字串在打印紙上的寬度（中文字算 2，英數算 1） */
function strWidth(s: string): number {
  let w = 0
  for (const c of s) {
    w += c.charCodeAt(0) > 0x7f ? 2 : 1
  }
  return w
}

/** 靠左補空格至目標寬度 */
function padEnd(s: string, width: number): string {
  const sw = strWidth(s)
  return s + ' '.repeat(Math.max(0, width - sw))
}

/** 置中 */
function center(s: string): string {
  const sw = strWidth(s)
  const pad = Math.max(0, Math.floor((PAPER_WIDTH - sw) / 2))
  return ' '.repeat(pad) + s
}

/** 分隔線 */
function divider(char = '-'): string {
  return char.repeat(PAPER_WIDTH)
}

// ── 主要格式化函式 ────────────────────────────────────────

export function formatReceipt(order: Order, storeName = '早餐店'): string {
  const parts: string[] = []

  const push = (...lines: string[]) => parts.push(...lines)

  // 初始化
  push(INIT)

  // 店名標題
  push(ALIGN_CENTER, BOLD_ON)
  push(center(storeName), LF)
  push(BOLD_OFF)
  push(divider(), LF)

  // 訂單資訊
  push(ALIGN_LEFT)
  const orderLabel =
    order.table_id === 'takeout'
      ? `外帶 #${String(order.pickup_number ?? 0).padStart(3, '0')}`
      : `${order.table_id} 桌`

  const time = new Date(order.created_at).toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  push(BOLD_ON, orderLabel, BOLD_OFF, LF)
  push(`時間: ${time}`, LF)
  push(divider(), LF)

  // 品項列表
  for (const item of order.items) {
    const rightPart = `x${item.qty}  $${item.price * item.qty}`
    const rightWidth = strWidth(rightPart)
    const nameWidth = PAPER_WIDTH - rightWidth
    push(padEnd(item.name, nameWidth) + rightPart, LF)

    // 加料選項（加料在前、特殊在後）
    if (item.options && item.options.length > 0) {
      const optStr = '  ' + orderOptionsForDisplay(item.options).map((o) => o.qty && o.qty > 1 ? `${o.label} ×${o.qty}` : o.label).join(' ')
      push(optStr, LF)
    }
  }

  push(divider(), LF)

  // 合計
  const totalStr = `$${order.total}`
  const totalWidth = strWidth(totalStr)
  push(BOLD_ON)
  push(padEnd('合計', PAPER_WIDTH - totalWidth) + totalStr)
  push(BOLD_OFF, LF)

  // 備註
  if (order.note) {
    push(divider('.'), LF)
    push(`備註: ${order.note}`, LF)
  }

  // 頁尾
  push(LF, LF)
  push(ALIGN_CENTER)
  push(center('謝謝光臨'), LF)
  push(LF, LF, LF)
  push(CUT)

  return parts.join('')
}
