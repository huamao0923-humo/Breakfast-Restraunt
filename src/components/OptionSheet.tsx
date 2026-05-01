'use client'

import { useState } from 'react'
import type { MenuItem, CartItemOption } from '@/types'

interface OptionSheetProps {
  item: MenuItem
  onAdd: (options: CartItemOption[], qty: number) => void
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

// 虛擬 ID 代表「大杯（原價）」
const LARGE_ID = '__large__'

export function OptionSheet({ item, onAdd, onClose }: OptionSheetProps) {
  // 拆分規格選項（含「杯」字）、溫度選項（id 以 temp_ 開頭）與一般客製選項
  const sizeOptions    = item.options.filter(o => o.label.includes('杯'))
  const tempOptions    = item.options.filter(o => o.id.startsWith('temp_'))
  const regularOptions = item.options.filter(o => !o.label.includes('杯') && !o.id.startsWith('temp_'))
  const hasSizeOpts    = sizeOptions.length > 0
  const hasTempOpts    = tempOptions.length > 0

  // 規格：單選，必選（無預設）
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null)
  // 溫度：單選，必選（無預設）
  const [selectedTempId, setSelectedTempId] = useState<string | null>(null)
  // 一般客製：多選（以 index 追蹤，避免 DB 中重複 id 互相干擾）
  const [selected, setSelected] = useState<number[]>([])
  // 數量
  const [qty, setQty] = useState(1)

  if (item.options.length === 0) return null

  const toggleRegular = (idx: number) =>
    setSelected(prev => prev.includes(idx) ? prev.filter(x => x !== idx) : [...prev, idx])

  // 飲料兩題都必選才能送出
  const canAdd = hasSizeOpts
    ? (selectedSizeId !== null && (!hasTempOpts || selectedTempId !== null))
    : true

  const handleAdd = () => {
    if (!canAdd) return
    const sizeOpt: CartItemOption[] =
      hasSizeOpts && selectedSizeId !== LARGE_ID
        ? sizeOptions.filter(o => o.id === selectedSizeId)
        : []

    const tempOpt: CartItemOption[] = hasTempOpts && selectedTempId
      ? tempOptions.filter(t => t.id === selectedTempId)
      : []

    const regularOpts = regularOptions.filter((_, idx) => selected.includes(idx))
    onAdd([...sizeOpt, ...tempOpt, ...regularOpts], qty)
    onClose()
  }

  // 計算規格加入購物車後的實際單價（供按鈕顯示用）
  const currentPrice = (() => {
    if (!hasSizeOpts || selectedSizeId === null) return null
    if (selectedSizeId === LARGE_ID) return item.price
    const opt = sizeOptions.find(o => o.id === selectedSizeId)
    return opt ? item.price + opt.price_delta : item.price
  })()

  // ── 規格 Radio 列 ──────────────────────────────────────
  const SizeRow = ({
    id, label, totalPrice, selected: isSelected, onSelect,
  }: { id: string; label: string; totalPrice: number; selected: boolean; onSelect: () => void }) => (
    <button
      onClick={onSelect}
      className="w-full flex items-center justify-between rounded-2xl px-4 transition-all active:scale-[0.98]"
      style={{
        minHeight: 60,
        background: isSelected ? '#FEF3C7' : C.pill,
        border: `2px solid ${isSelected ? C.primary : 'transparent'}`,
      }}
    >
      <span className="text-base font-semibold" style={{ color: C.text }}>{label}</span>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-base font-bold" style={{ color: isSelected ? C.primaryD : C.sub }}>
          ${totalPrice}
        </span>
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: isSelected ? C.primary : '#fff',
            border: `2px solid ${isSelected ? C.primary : C.border}`,
          }}
        >
          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
        </div>
      </div>
    </button>
  )

  // ── 一般 Checkbox 列 ───────────────────────────────────
  const CheckRow = ({
    id, label, priceDelta, checked, onToggle,
  }: { id: string; label: string; priceDelta: number; checked: boolean; onToggle: () => void }) => (
    <button
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
        {priceDelta !== 0 && (
          <span className="text-sm font-medium" style={{ color: C.sub }}>
            {priceDelta > 0 ? `+$${priceDelta}` : `-$${Math.abs(priceDelta)}`}
          </span>
        )}
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: checked ? C.primary : '#fff',
            border: `2px solid ${checked ? C.primary : C.border}`,
          }}
        >
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

        {/* 品名 header */}
        <div className="px-6 pb-4 border-b shrink-0" style={{ borderColor: C.border }}>
          <div className="flex justify-between items-baseline">
            <h3 className="text-xl font-bold" style={{ color: C.text }}>{item.name}</h3>
            {!hasSizeOpts && (
              <span className="text-lg font-bold ml-4 shrink-0" style={{ color: C.primary }}>
                ${item.price}
              </span>
            )}
          </div>
        </div>

        {/* 選項區（可捲動） */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">

          {/* ── 規格（大杯 / 小杯）單選 ── */}
          {hasSizeOpts && (
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: C.sub }}>
                選擇規格
              </p>
              <div className="space-y-2">
                <SizeRow
                  id={LARGE_ID}
                  label="大杯"
                  totalPrice={item.price}
                  selected={selectedSizeId === LARGE_ID}
                  onSelect={() => setSelectedSizeId(LARGE_ID)}
                />
                {sizeOptions.map(opt => (
                  <SizeRow
                    key={opt.id}
                    id={opt.id}
                    label={opt.label}
                    totalPrice={item.price + opt.price_delta}
                    selected={selectedSizeId === opt.id}
                    onSelect={() => setSelectedSizeId(opt.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── 溫度，僅飲料且有設溫度選項時顯示 ── */}
          {hasSizeOpts && hasTempOpts && (
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: C.sub }}>
                選擇溫度
              </p>
              <div className="grid grid-cols-3 gap-2">
                {tempOptions.map(t => {
                  const isOn = selectedTempId === t.id
                  const emoji = t.id === 'temp_ice' ? '🧊' : t.id === 'temp_warm' ? '🌤️' : '🔥'
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTempId(t.id)}
                      className="flex flex-col items-center justify-center gap-1.5 rounded-2xl py-4 transition-all active:scale-[0.97]"
                      style={{
                        background: isOn ? '#FEF3C7' : C.pill,
                        border: `2px solid ${isOn ? C.primary : 'transparent'}`,
                      }}
                    >
                      <span className="text-2xl">{emoji}</span>
                      <span className="text-sm font-semibold" style={{ color: isOn ? C.primaryD : C.text }}>
                        {t.label}
                      </span>
                      {isOn && (
                        <div className="w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ background: C.primary }}>
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── 客製選項（多選） ── */}
          {regularOptions.length > 0 && (
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: C.sub }}>
                客製選項
              </p>
              <div className="space-y-2">
                {regularOptions.map((opt, idx) => (
                  <CheckRow
                    key={idx}
                    id={opt.id}
                    label={opt.label}
                    priceDelta={opt.price_delta}
                    checked={selected.includes(idx)}
                    onToggle={() => toggleRegular(idx)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 數量選擇 */}
        <div className="px-6 pt-3 pb-1 flex items-center justify-center gap-5 border-t shrink-0" style={{ borderColor: C.border }}>
          <button
            onClick={() => setQty(q => Math.max(1, q - 1))}
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold transition-all active:scale-90"
            style={{ background: qty <= 1 ? C.border : C.pill, color: qty <= 1 ? C.sub : C.text }}>
            －
          </button>
          <span className="text-lg font-bold w-6 text-center" style={{ color: C.text }}>{qty}</span>
          <button
            onClick={() => setQty(q => q + 1)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold transition-all active:scale-90"
            style={{ background: C.pill, color: C.text }}>
            ＋
          </button>
        </div>

        {/* 底部按鈕 */}
        <div className="px-6 pt-3 pb-5 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl text-base font-bold transition-all active:scale-95"
            style={{ border: `2px solid ${C.border}`, color: C.sub, background: '#fff' }}>
            取消
          </button>
          <button
            onClick={handleAdd}
            disabled={!canAdd}
            className="py-4 rounded-2xl text-base font-bold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ flex: 2, background: canAdd ? C.primary : C.sub, color: '#fff' }}>
            {!canAdd
              ? (selectedSizeId === null ? '請先選擇規格' : hasTempOpts ? '請先選擇溫度' : '請先選擇規格')
              : hasSizeOpts && currentPrice !== null
                ? `加入購物車 $${currentPrice * qty}`
                : qty > 1
                  ? `加入購物車 ×${qty}`
                  : '加入購物車'}
          </button>
        </div>
      </div>
    </div>
  )
}
