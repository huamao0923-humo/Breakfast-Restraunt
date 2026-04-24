'use client'

import { useState } from 'react'
import type { MenuItem, CartItemOption } from '@/types'
import { TOPPINGS } from '@/lib/toppings'

interface OptionSheetProps {
  item: MenuItem
  showToppings?: boolean
  onAdd: (options: CartItemOption[]) => void
  onClose: () => void
}

const C = {
  primary:  '#D97706',
  primaryD: '#B45309',
  text:     '#1C1C1E',
  sub:      '#6B6B6B',
  border:   '#E5E5EA',
  bg:       '#F7F4F0',
  pill:     '#F0EBE3',
}

export function OptionSheet({ item, showToppings, onAdd, onClose }: OptionSheetProps) {
  const [selected, setSelected]             = useState<string[]>([])
  const [selectedToppings, setSelectedToppings] = useState<string[]>([])

  if (item.options.length === 0 && !showToppings) return null

  const toggle = (id: string, setter: React.Dispatch<React.SetStateAction<string[]>>) =>
    setter((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const handleAdd = () => {
    const itemOpts    = item.options.filter((o) => selected.includes(o.id))
    const toppingOpts = showToppings ? TOPPINGS.filter((t) => selectedToppings.includes(t.id)) : []
    onAdd([...itemOpts, ...toppingOpts])
    onClose()
  }

  const OptionRow = ({
    id, label, priceDelta, checked, onToggle,
  }: { id: string; label: string; priceDelta: number; checked: boolean; onToggle: () => void }) => (
    <button
      key={id}
      onClick={onToggle}
      className="w-full flex items-center justify-between rounded-2xl px-4 transition-all active:scale-[0.98]"
      style={{
        minHeight: 56,
        background: checked ? '#FEF3C7' : C.pill,
        border: `2px solid ${checked ? C.primary : 'transparent'}`,
      }}
    >
      <span className="text-base font-semibold" style={{ color: C.text }}>{label}</span>
      <div className="flex items-center gap-3 shrink-0">
        {priceDelta > 0 && (
          <span className="text-sm font-medium" style={{ color: C.sub }}>+${priceDelta}</span>
        )}
        {/* 自訂 checkbox */}
        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: checked ? C.primary : '#fff',
            border: `2px solid ${checked ? C.primary : C.border}`,
          }}>
          {checked && (
            <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
              <path d="M1 4L4.5 7.5L11 1" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </div>
    </button>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overlay-enter font-sans"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-t-3xl overflow-hidden sheet-enter"
        style={{
          background: '#fff',
          maxHeight: '82vh',
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* 拖曳條 */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* 品名 */}
        <div className="px-6 pb-4 border-b shrink-0" style={{ borderColor: C.border }}>
          <div className="flex justify-between items-baseline">
            <h3 className="text-xl font-bold" style={{ color: C.text }}>{item.name}</h3>
            <span className="text-lg font-bold ml-4 shrink-0" style={{ color: C.primary }}>
              ${item.price}
            </span>
          </div>
        </div>

        {/* 選項區（可捲動） */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">

          {item.options.length > 0 && (
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: C.sub }}>
                客製選項
              </p>
              <div className="space-y-2">
                {item.options.map((opt) => (
                  <OptionRow
                    key={opt.id}
                    id={opt.id}
                    label={opt.label}
                    priceDelta={opt.price_delta}
                    checked={selected.includes(opt.id)}
                    onToggle={() => toggle(opt.id, setSelected)}
                  />
                ))}
              </div>
            </div>
          )}

          {showToppings && (
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: C.sub }}>
                加配料
              </p>
              <div className="space-y-2">
                {TOPPINGS.map((t) => (
                  <OptionRow
                    key={t.id}
                    id={t.id}
                    label={t.label}
                    priceDelta={t.price_delta}
                    checked={selectedToppings.includes(t.id)}
                    onToggle={() => toggle(t.id, setSelectedToppings)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部按鈕 */}
        <div className="px-6 pt-3 pb-5 flex gap-3 border-t shrink-0" style={{ borderColor: C.border }}>
          <button
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl text-base font-bold transition-all active:scale-95"
            style={{ border: `2px solid ${C.border}`, color: C.sub, background: '#fff' }}>
            取消
          </button>
          <button
            onClick={handleAdd}
            className="py-4 rounded-2xl text-base font-bold transition-all active:scale-[0.98]"
            style={{ flex: 2, background: C.primary, color: '#fff' }}>
            加入購物車
          </button>
        </div>
      </div>
    </div>
  )
}
