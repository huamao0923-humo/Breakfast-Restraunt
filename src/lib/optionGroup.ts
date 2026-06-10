import type { CartItemOption, OptionGroup } from '@/types'

/** 解析選項分類：未手動指定時，加價 > 0 視為加料，否則為特殊（免費）選項 */
export function resolveOptionGroup(o: { price_delta: number; group?: OptionGroup }): OptionGroup {
  return o.group ?? (o.price_delta > 0 ? 'addon' : 'special')
}

/**
 * 將訂單品項的選項依顯示順序重排：
 * 無 group 的結構性選項（規格/溫度/必選）保持原順序排最前，再接加料，再接特殊。
 */
export function orderOptionsForDisplay<T extends CartItemOption>(options: T[]): T[] {
  return [
    ...options.filter(o => !o.group),
    ...options.filter(o => o.group === 'addon'),
    ...options.filter(o => o.group === 'special'),
  ]
}
