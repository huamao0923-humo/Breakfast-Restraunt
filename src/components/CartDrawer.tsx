// Path: src/components/CartDrawer.tsx
'use client'

import { useState } from 'react'
import type { CartItem } from '@/types'

interface CartDrawerProps {
  items: CartItem[]
  total: number
  onUpdateQty: (index: number, qty: number) => void
  onRemoveItem: (index: number) => void
  onSubmit: (note: string) => Promise<void>
  isOpen: boolean
  tableId: string
}

export function CartDrawer({
  items,
  total,
  onUpdateQty,
  onRemoveItem,
  onSubmit,
  isOpen,
  tableId,
}: CartDrawerProps) {
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [pickupNumber, setPickupNumber] = useState<number | null>(null)

  const handleSubmit = async () => {
    if (items.length === 0) return
    setSubmitting(true)
    try {
      const formattedItems = items.map((item) => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        price: item.price + item.options.reduce((sum, opt) => sum + opt.price_delta, 0),
        options: item.options,
      }))

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: tableId,
          items: formattedItems,
          total,
          note: note || null,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setSubmitted(true)
        setPickupNumber(data.pickup_number)
        setTimeout(() => {
          setSubmitted(false)
          setNote('')
          setPickupNumber(null)
        }, 3000)
      }
    } catch (error) {
      console.error('Failed to submit order:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="rounded-2xl p-10 text-center" style={{ background: '#FFFDF7', fontFamily: "'Noto Serif TC', serif" }}>
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold tracking-wide mb-2" style={{ color: '#3D2B1F' }}>訂單已送出</h2>
          {tableId === 'takeout' && pickupNumber && (
            <p className="text-lg font-bold mt-2" style={{ color: '#5C3D2E' }}>
              取餐號碼：#{String(pickupNumber).padStart(3, '0')}
            </p>
          )}
          <p className="text-sm mt-3" style={{ color: '#9C7A5A' }}>廚房收到了，請稍候</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', fontFamily: "'Noto Serif TC', serif" }}
    >
      <div
        className="w-full max-w-2xl rounded-t-2xl pt-6 px-5 pb-8 max-h-[85vh] overflow-y-auto"
        style={{ background: '#FFFDF7' }}
      >
        <h2 className="text-lg font-bold tracking-wider mb-5" style={{ color: '#3D2B1F' }}>
          訂單明細
        </h2>

        {items.length === 0 ? (
          <p className="text-center py-10 text-sm" style={{ color: '#B0A090' }}>購物車是空的</p>
        ) : (
          <>
            {/* 品項 */}
            <div className="mb-4">
              {items.map((item, index) => {
                const unitPrice = item.price + item.options.reduce((sum, opt) => sum + opt.price_delta, 0)
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between py-3.5 border-b"
                    style={{ borderColor: '#F0E8DC' }}
                  >
                    <div className="flex-1 pr-3">
                      <div className="text-sm font-medium" style={{ color: '#3D2B1F' }}>{item.name}</div>
                      {item.options.length > 0 && (
                        <div className="text-xs mt-0.5" style={{ color: '#9C7A5A' }}>
                          {item.options.map((opt) => opt.label).join('、')}
                        </div>
                      )}
                      <div className="text-xs mt-1" style={{ color: '#B0A090' }}>${unitPrice} 元</div>
                    </div>

                    {/* 加減 */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          if (item.qty > 1) onUpdateQty(index, item.qty - 1)
                          else onRemoveItem(index)
                        }}
                        className="w-7 h-7 rounded border flex items-center justify-center text-base font-bold"
                        style={{ borderColor: '#D4B896', color: '#8B5E3C', background: '#FFFDF7' }}
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-bold" style={{ color: '#5C3D2E' }}>
                        {item.qty}
                      </span>
                      <button
                        onClick={() => onUpdateQty(index, item.qty + 1)}
                        className="w-7 h-7 rounded border flex items-center justify-center text-base font-bold"
                        style={{ borderColor: '#D4B896', color: '#8B5E3C', background: '#FFFDF7' }}
                      >
                        +
                      </button>
                      <button
                        onClick={() => onRemoveItem(index)}
                        className="ml-1 text-sm"
                        style={{ color: '#C0A090' }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 合計 */}
            <div
              className="flex justify-between items-center py-3.5 mb-4"
              style={{ borderTop: '1px solid #D4B896' }}
            >
              <span className="font-bold tracking-wide" style={{ color: '#3D2B1F' }}>合計</span>
              <span className="text-xl font-bold" style={{ color: '#5C3D2E' }}>${total}</span>
            </div>

            {/* 備註 */}
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="備註（例：不加蔥、少辣）"
              className="w-full rounded-lg px-3 py-2.5 mb-5 text-sm focus:outline-none"
              style={{
                border: '1px solid #D4B896',
                background: '#FFFDF7',
                color: '#3D2B1F',
                fontFamily: "'Noto Serif TC', serif",
              }}
            />

            {/* 送出 */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3.5 rounded-lg text-base font-bold tracking-[3px] disabled:opacity-50"
              style={{ background: '#5C3D2E', color: '#F5E6C8', fontFamily: "'Noto Serif TC', serif" }}
            >
              {submitting ? '送出中...' : '確認送出'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
