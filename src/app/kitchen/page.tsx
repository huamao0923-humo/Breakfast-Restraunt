// Path: src/app/kitchen/page.tsx
'use client'

import { useEffect, useState, Suspense } from 'react'
import type { Order } from '@/types'

export const dynamic = 'force-dynamic'

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return '剛剛'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`
  return `${Math.floor(diff / 3600)} 小時前`
}

function KitchenContent() {
  const [orders, setOrders] = useState<Order[]>([])
  const [done, setDone] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 載入當天未完成訂單
    fetch('/api/orders?mode=kitchen')
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((data: Order[]) => {
        setOrders(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // SSE 訂閱即時更新
    const es = new EventSource('/api/events?channel=kitchen')

    es.addEventListener('new-order', (e) => {
      setOrders((prev) => [JSON.parse(e.data) as Order, ...prev])
    })

    es.addEventListener('order-updated', (e) => {
      const updated = JSON.parse(e.data) as Order
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
    })

    return () => es.close()
  }, [])

  const markDone = (id: string) => {
    setDone((prev) => new Set([...prev, id]))
  }

  const activeOrders = orders.filter((o) => !done.has(o.id) && o.status !== 'completed')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-lg" style={{ background: '#3D2512', color: '#F5E6C8', fontFamily: "'Noto Serif TC', serif" }}>
        載入中...
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-4 sm:px-5 mx-auto max-w-3xl border-l border-r" style={{ background: '#3D2512', fontFamily: "'Noto Serif TC', serif", borderColor: '#7A5240' }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-3.5 border-b border-dashed pb-2.5" style={{ borderColor: '#7A5240' }}>
        <h1 className="text-[15px] font-bold tracking-[3px]" style={{ color: '#F5E6C8' }}>
          廚房出單
        </h1>
        <div className="flex items-center gap-1.5">
          <span
            className="w-[7px] h-[7px] rounded-full inline-block"
            style={{ background: '#6EBF8B', animation: 'pulse 2s infinite' }}
          />
          <span className="text-[11px] tracking-wide" style={{ color: '#9C7A5A' }}>
            即時同步中
          </span>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>

      {/* Order Grid */}
      {activeOrders.length === 0 ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-sm tracking-widest" style={{ color: '#7A5240' }}>
            目前沒有待處理訂單
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {activeOrders.map((order, idx) => {
            const isNew = idx === 0
            return (
              <div
                key={order.id}
                className="rounded-lg overflow-hidden border"
                style={{ background: '#FFFDF7', borderColor: '#E0D0BC' }}
              >
                {/* Card Header */}
                <div
                  className="px-3 py-2.5 flex justify-between items-center"
                  style={{ background: isNew ? '#8B3A1A' : '#5C3D2E' }}
                >
                  <span className="text-[13px] font-bold tracking-[2px]" style={{ color: '#F5E6C8' }}>
                    {order.table_id} 桌
                    {isNew && (
                      <span className="ml-1 text-[9px] rounded px-1.5 py-0.5 font-bold tracking-wide inline-block" style={{ background: '#F5C842', color: '#3D2B1F' }}>
                        新
                      </span>
                    )}
                  </span>
                  <span className="text-[11px]" style={{ color: '#C9A97A' }}>
                    {timeAgo(order.created_at)}
                  </span>
                </div>

                {/* Items */}
                <div className="px-3 py-2.5">
                  {order.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-[13px] py-1 border-b border-dashed last:border-b-0"
                      style={{ color: '#3D2B1F', borderColor: '#EDE5D8' }}
                    >
                      <span>{item.name}</span>
                      <span className="font-bold" style={{ color: '#8B5E3C' }}>
                        ×{item.qty}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Note */}
                {order.note && (
                  <p className="text-[11px] italic px-3 pb-2" style={{ color: '#9C7A5A' }}>
                    {order.note}
                  </p>
                )}

                {/* Done Button */}
                <button
                  onClick={() => markDone(order.id)}
                  className="w-full py-2.5 text-[13px] font-bold tracking-[2px] border-none cursor-pointer"
                  style={{
                    background: '#C67C3A',
                    color: '#FFF8EE',
                    fontFamily: "'Noto Serif TC', serif",
                  }}
                >
                  完成出餐
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function KitchenPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen text-lg" style={{ background: '#3D2512', color: '#F5E6C8', fontFamily: "'Noto Serif TC', serif" }}>
          載入中...
        </div>
      }
    >
      <KitchenContent />
    </Suspense>
  )
}
