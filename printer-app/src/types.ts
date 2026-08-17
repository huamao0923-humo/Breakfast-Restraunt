// Path: printer-app/src/types.ts

export type OptionGroup = 'addon' | 'special'

export interface OrderOption {
  id?: string
  label: string
  price_delta?: number
  group?: OptionGroup
  qty?: number
}

export interface OrderItem {
  name: string
  qty: number
  price: number
  options?: OrderOption[]
  description?: string
}

/**
 * 選項顯示順序：無 group 的結構性選項（規格/溫度/必選）保持原順序排最前，
 * 再接加料，再接特殊。與網頁端 src/lib/optionGroup.ts 規則一致。
 */
export function orderOptionsForDisplay(options: OrderOption[]): OrderOption[] {
  return [
    ...options.filter((o) => !o.group),
    ...options.filter((o) => o.group === 'addon'),
    ...options.filter((o) => o.group === 'special'),
  ]
}

export interface Order {
  id: string
  table_id: string
  pickup_number: number | null
  items: OrderItem[]
  note?: string
  total: number
  status: string
  created_at: string
}
