'use client'

import { formatPrice, formatDate } from '@/lib/utils'
import type { Order } from '@/types'

interface ReportSummaryProps {
  orders: Order[]
}

export function ReportSummary({ orders }: ReportSummaryProps) {
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0)

  // 計算熱門品項
  const itemStats: Record<string, { name: string; qty: number }> = {}
  orders.forEach((order) => {
    order.items.forEach((item) => {
      if (!itemStats[item.id]) {
        itemStats[item.id] = { name: item.name, qty: 0 }
      }
      itemStats[item.id].qty += item.qty
    })
  })

  const topItems = Object.values(itemStats)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10)

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="text-gray-600 text-sm font-medium">訂單筆數</div>
          <div className="text-4xl font-bold text-blue-600 mt-2">{orders.length}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="text-gray-600 text-sm font-medium">總營收</div>
          <div className="text-4xl font-bold text-green-600 mt-2">
            ${totalRevenue}
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <div className="text-gray-600 text-sm font-medium">平均客單</div>
          <div className="text-4xl font-bold text-purple-600 mt-2">
            {orders.length > 0 ? `$${Math.round(totalRevenue / orders.length)}` : '$0'}
          </div>
        </div>
      </div>

      {/* Top Items */}
      {topItems.length > 0 && (
        <div className="border rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">熱門品項排行</h3>
          <div className="space-y-3">
            {topItems.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-200 text-gray-700 font-bold w-8 h-8 rounded-full flex items-center justify-center text-sm">
                    {idx + 1}
                  </div>
                  <div className="font-medium">{item.name}</div>
                </div>
                <div className="text-lg font-bold text-gray-800">
                  × {item.qty}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Details */}
      <div className="border rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">訂單明細</h3>
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="border rounded p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-semibold">
                    {order.table_id === 'takeout'
                      ? `外帶 #${String(order.pickup_number).padStart(3, '0')}`
                      : `桌號 ${order.table_id}`}
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatDate(order.created_at)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">
                    ${order.total}
                  </div>
                  <div className="text-xs text-gray-500">
                    {order.paid ? '✓ 已結帳' : '未結帳'}
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-700 mb-2">
                {order.items.map((item) => `${item.name} ×${item.qty}`).join('、')}
              </div>

              {order.note && (
                <div className="text-sm text-gray-500">備註：{order.note}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
