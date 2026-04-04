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

export function OptionSheet({ item, showToppings, onAdd, onClose }: OptionSheetProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [selectedToppings, setSelectedToppings] = useState<string[]>([])

  if (item.options.length === 0 && !showToppings) {
    return null
  }

  const handleToggle = (optionId: string) => {
    setSelected((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId]
    )
  }

  const handleToggleTopping = (toppingId: string) => {
    setSelectedToppings((prev) =>
      prev.includes(toppingId)
        ? prev.filter((id) => id !== toppingId)
        : [...prev, toppingId]
    )
  }

  const handleAdd = () => {
    const itemOpts = item.options.filter((opt) => selected.includes(opt.id))
    const toppingOpts = showToppings
      ? TOPPINGS.filter((t) => selectedToppings.includes(t.id))
      : []
    onAdd([...itemOpts, ...toppingOpts])
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50">
      <div className="bg-white w-full rounded-t-lg p-6 max-h-[80vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">{item.name}</h3>

        {item.options.length > 0 && (
          <div className="space-y-3 mb-4">
            {item.options.map((option) => (
              <label
                key={option.id}
                className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option.id)}
                  onChange={() => handleToggle(option.id)}
                  className="w-5 h-5"
                />
                <div className="flex-1">
                  <div className="font-medium">{option.label}</div>
                  {option.price_delta > 0 && (
                    <div className="text-sm text-gray-500">+${option.price_delta}</div>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}

        {showToppings && (
          <>
            <div
              className="text-xs font-bold tracking-[3px] py-2 mt-2 mb-3"
              style={{ color: '#9C7A5A' }}
            >
              加配料
            </div>
            <div className="space-y-3 mb-6">
              {TOPPINGS.map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedToppings.includes(t.id)}
                    onChange={() => handleToggleTopping(t.id)}
                    className="w-5 h-5"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{t.label}</div>
                    <div className="text-sm text-gray-500">+${t.price_delta}</div>
                  </div>
                </label>
              ))}
            </div>
          </>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleAdd}
            className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
          >
            加入購物車
          </button>
        </div>
      </div>
    </div>
  )
}
