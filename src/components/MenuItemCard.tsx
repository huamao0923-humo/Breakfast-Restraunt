'use client'

import { formatPrice } from '@/lib/utils'
import type { MenuItem } from '@/types'

interface MenuItemCardProps {
  item: MenuItem
  soldOut: boolean
  onSelect: () => void
}

export function MenuItemCard({
  item,
  soldOut,
  onSelect,
}: MenuItemCardProps) {
  return (
    <button
      onClick={onSelect}
      disabled={soldOut}
      className={`p-4 border rounded-lg text-left transition ${
        soldOut
          ? 'bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed'
          : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="font-semibold text-lg">{item.name}</div>
        <div className="text-blue-600 font-bold">{formatPrice(item.price)}</div>
      </div>
      {item.options.length > 0 && (
        <div className="text-sm text-gray-500">可自訂選項</div>
      )}
      {soldOut && <div className="text-sm text-red-600 font-medium">售罄</div>}
    </button>
  )
}
