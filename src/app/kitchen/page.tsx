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
    fetch('/api/orders?mode=kitchen')
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((data: Order[]) => { setOrders(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))

    const es = new EventSource('/api/events?channel=kitchen')

    es.addEventListener('new-order', (e) => {
      const order = JSON.parse(e.data) as Order
      order.items = Array.isArray(order.items) ? order.items
        : typeof order.items === 'string' ? JSON.parse(order.items) : []
      setOrders((prev) => [order, ...prev])
    })

    es.addEventListener('order-updated', (e) => {
      const updated = JSON.parse(e.data) as Order
      updated.items = Array.isArray(updated.items) ? updated.items
        : typeof updated.items === 'string' ? JSON.parse(updated.items) : []
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
    })

    return () => es.close()
  }, [])

  const markDone = (id: string) =>
    setDone((prev) => new Set([...prev, id]))

  const activeOrders = orders.filter((o) => !done.has(o.id) && o.status !== 'completed')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen"
        style={{ background: '#2A1A0E', color: '#C9A97A', fontFamily: "'Noto Serif TC', serif", fontSize: 16 }}>
        載入中…
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#FFF6E9', fontFamily: "'Noto Serif TC', serif" }}>

      {/* ── Header ── */}
      <div className="sticky top-0 z-10 flex justify-between items-center px-4 py-3 border-b"
        style={{
          background: '#FFDDA9',
          backdropFilter: 'blur(8px)',
          borderColor: '#F5C07A',
          paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
        }}>
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold tracking-[4px]" style={{ color: '#3D2B1F' }}>
            廚房出單
          </h1>
          {activeOrders.length > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: '#D97706', color: '#fff' }}>
              {activeOrders.length} 筆
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block"
            style={{ background: '#16A34A', animation: 'pulse 2s infinite' }} />
          <span className="text-xs tracking-wide" style={{ color: '#7A4F2A' }}>即時同步中</span>
        </div>
      </div>

      {/* ── 訂單列表 ── */}
      <div className="px-3 py-3 max-w-xl mx-auto" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
        {activeOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center" style={{ height: '60vh' }}>
            <div className="text-5xl mb-4 opacity-30">🍳</div>
            <p className="text-sm tracking-widest" style={{ color: '#B07840' }}>目前沒有待處理訂單</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeOrders.map((order, idx) => {
              const isNew = idx === 0
              return (
                <div key={order.id}
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: '#FFFFFF',
                    boxShadow: isNew
                      ? '0 0 0 2px #D97706, 0 4px 16px rgba(217,119,6,0.15)'
                      : '0 1px 6px rgba(0,0,0,0.08)',
                  }}>

                  {/* Card Header */}
                  <div className="px-4 py-3 flex justify-between items-center"
                    style={{ background: isNew ? '#FFDDA9' : '#FFF0D0', borderBottom: '1px solid #F5C07A' }}>
                    <div className="flex items-center gap-2">
                      {order.table_id === 'takeout' ? (
                        <span className="text-base font-bold tracking-[2px]" style={{ color: '#B45309' }}>
                          外帶 #{order.pickup_number != null ? String(order.pickup_number).padStart(3, '0') : '---'}
                        </span>
                      ) : (
                        <span className="text-base font-bold tracking-[2px]" style={{ color: '#3D2B1F' }}>
                          {order.table_id} 桌
                        </span>
                      )}
                      {isNew && (
                        <span className="text-[10px] rounded-full px-2 py-0.5 font-bold tracking-wide"
                          style={{ background: '#D97706', color: '#fff' }}>
                          新單
                        </span>
                      )}
                    </div>
                    <span className="text-xs" style={{ color: '#7A4F2A' }}>
                      {timeAgo(order.created_at)}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="px-4 py-3">
                    {order.items.map((item, i) => (
                      <div key={i}
                        className="flex justify-between items-center py-2 border-b border-dashed last:border-b-0"
                        style={{ borderColor: '#F0E4CC' }}>
                        <span className="text-[14px]" style={{ color: '#1C1C1E' }}>{item.name}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[13px] font-bold rounded-full px-2 py-0.5"
                            style={{ background: '#FEF3C7', color: '#92400E' }}>
                            ×{item.qty}
                          </span>
                          <span className="text-[13px] font-bold" style={{ color: '#B45309' }}>
                            ${item.price * item.qty}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Note */}
                  {order.note && (
                    <div className="mx-4 mb-2 px-3 py-2 rounded-lg text-xs italic"
                      style={{ background: '#FFFBEB', color: '#92400E', border: '1px dashed #FCD34D' }}>
                      📝 {order.note}
                    </div>
                  )}

                  {/* Total */}
                  <div className="flex justify-between items-center px-4 py-2.5 border-t"
                    style={{ borderColor: '#F0E4CC' }}>
                    <span className="text-sm" style={{ color: '#9C7A5A' }}>合計</span>
                    <span className="text-base font-bold" style={{ color: '#3D2B1F' }}>${order.total}</span>
                  </div>

                  {/* Done Button */}
                  <button
                    onClick={() => markDone(order.id)}
                    className="w-full font-bold tracking-[3px] transition-all active:scale-[0.98]"
                    style={{
                      background: '#D97706',
                      color: '#fff',
                      fontFamily: "'Noto Serif TC', serif",
                      fontSize: 14,
                      padding: '14px 0',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    完成出餐  ✓
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function KitchenPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen"
        style={{ background: '#2A1A0E', color: '#C9A97A', fontFamily: "'Noto Serif TC', serif" }}>
        載入中…
      </div>
    }>
      <KitchenContent />
    </Suspense>
  )
}
