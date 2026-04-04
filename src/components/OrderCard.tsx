'use client'

import { timeAgo, formatDate } from '@/lib/utils'
import type { Order } from '@/types'

interface OrderCardProps {
  order: Order
  onComplete: (id: string) => void
  onCancel: (id: string) => void
  onMarkPaid: (id: string) => void
}

export function OrderCard({
  order,
  onComplete,
  onCancel,
  onMarkPaid,
}: OrderCardProps) {
  const isPickup = order.table_id === 'takeout'

  return (
    <div
      className={`border-l-4 rounded-lg p-5 bg-white shadow-sm transition ${
        order.paid
          ? 'border-l-green-500 bg-green-50'
          : 'border-l-orange-500 bg-orange-50'
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold">
            {isPickup ? `外帶 #${String(order.pickup_number).padStart(3, '0')}` : `桌號 ${order.table_id}`}
          </h3>
          <p className="text-sm text-gray-600">{formatDate(order.created_at)}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">${order.total}</div>
          {order.paid && (
            <div className="text-xs font-semibold text-green-600 mt-1">已結帳</div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="mb-4 space-y-2 border-b pb-4">
        {order.items.map((item, idx) => (
          <div key={idx} className="text-sm">
            <div className="font-semibold">
              {item.name} × {item.qty}
            </div>
            {item.options && item.options.length > 0 && (
              <div className="text-xs text-gray-600 ml-2">
                {item.options.map((opt) => opt.label).join('、')}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Note */}
      {order.note && (
        <div className="mb-4 p-3 bg-yellow-100 rounded text-sm border-l-2 border-yellow-500">
          <strong>備註：</strong> {order.note}
        </div>
      )}

      {/* Time */}
      <div className="text-xs text-gray-500 mb-4">{timeAgo(order.created_at)}</div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onComplete(order.id)}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-3 rounded transition text-sm"
        >
          ✅ 完成
        </button>
        <button
          onClick={() => onMarkPaid(order.id)}
          className={`flex-1 font-bold py-2 px-3 rounded transition text-sm ${
            order.paid
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
          }`}
        >
          💰 {order.paid ? '已結帳' : '收款'}
        </button>
        <button
          onClick={() => onCancel(order.id)}
          className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded transition text-sm"
        >
          ✖ 取消
        </button>
      </div>
    </div>
  )
}
