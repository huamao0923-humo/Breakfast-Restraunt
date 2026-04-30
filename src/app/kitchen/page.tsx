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
        style={{ background: '#C3B091', color: '#3D2010', fontFamily: "'Noto Serif TC', serif", fontSize: 16 }}>
        載入中…
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#C3B091', fontFamily: "'Noto Serif TC', serif" }}>

      {/* ── Header ── */}
      <div className="sticky top-0 z-10 flex justify-between items-center px-4 py-3 border-b"
        style={{
          background: '#A8926E',
          backdropFilter: 'blur(8px)',
          borderColor: '#8C7455',
          paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
        }}>
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold tracking-[4px]" style={{ color: '#3D2010' }}>
            廚房出單
          </h1>
          {activeOrders.length > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: '#D2B48C', color: '#3D2010' }}>
              {activeOrders.length} 筆
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block"
            style={{ background: '#6EE7B7', animation: 'pulse 2s infinite' }} />
          <span className="text-xs tracking-wide" style={{ color: '#3D2010' }}>即時同步中</span>
        </div>
      </div>

      {/* ── 訂單列表 ── */}
      <div className="px-3 py-3 max-w-xl mx-auto" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
        {activeOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center" style={{ height: '60vh' }}>
            <div className="text-5xl mb-4 opacity-40">🍳</div>
            <p className="text-sm tracking-widest" style={{ color: '#3D2010' }}>目前沒有待處理訂單</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeOrders.map((order, idx) => {
              const isOdd = (idx + 1) % 2 !== 0   // 單號
              const cardBg = isOdd ? '#F5DEB3' : '#FFF8DC'
              const headerBg = isOdd ? '#E8C98A' : '#F0E8B0'
              const isNew = idx === 0
              return (
                <div key={order.id}
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: cardBg,
                    boxShadow: isNew
                      ? '0 0 0 2px #F5EDE3, 0 4px 16px rgba(0,0,0,0.25)'
                      : '0 1px 6px rgba(0,0,0,0.15)',
                  }}>

                  {/* Card Header */}
                  <div className="px-4 py-3 flex justify-between items-center"
                    style={{ background: headerBg, borderBottom: '1px solid rgba(0,0,0,0.12)' }}>
                    <div className="flex items-center gap-2">
                      {order.table_id === 'takeout' ? (
                        <span className="text-base font-bold tracking-[2px]" style={{ color: '#3D2010' }}>
                          外帶 #{order.pickup_number != null ? String(order.pickup_number).padStart(3, '0') : '---'}
                        </span>
                      ) : (
                        <span className="text-base font-bold tracking-[2px]" style={{ color: '#3D2010' }}>
                          {order.table_id} 桌
                        </span>
                      )}
                      {isNew && (
                        <span className="text-[10px] rounded-full px-2 py-0.5 font-bold tracking-wide"
                          style={{ background: '#8C7455', color: '#FFF8DC' }}>
                          新單
                        </span>
                      )}
                    </div>
                    <span className="text-xs" style={{ color: '#5C3D2E' }}>
                      {timeAgo(order.created_at)}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="px-4 py-3">
                    {order.items.map((item, i) => (
                      <div key={i}
                        className="flex justify-between items-center py-2 border-b border-dashed last:border-b-0"
                        style={{ borderColor: 'rgba(0,0,0,0.15)' }}>
                        <span className="text-[14px]" style={{ color: '#1C1C1E' }}>{item.name}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[13px] font-bold rounded-full px-2 py-0.5"
                            style={{ background: 'rgba(0,0,0,0.12)', color: '#3D2010' }}>
                            ×{item.qty}
                          </span>
                          <span className="text-[13px] font-bold" style={{ color: '#3D2010' }}>
                            ${item.price * item.qty}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Note */}
                  {order.note && (
                    <div className="mx-4 mb-2 px-3 py-2 rounded-lg text-xs italic"
                      style={{ background: 'rgba(255,255,255,0.35)', color: '#3D2010', border: '1px dashed rgba(0,0,0,0.2)' }}>
                      📝 {order.note}
                    </div>
                  )}

                  {/* Total */}
                  <div className="flex justify-between items-center px-4 py-2.5 border-t"
                    style={{ borderColor: 'rgba(0,0,0,0.12)' }}>
                    <span className="text-sm" style={{ color: '#5C3D2E' }}>合計</span>
                    <span className="text-base font-bold" style={{ color: '#1C1C1E' }}>${order.total}</span>
                  </div>

                  {/* Done Button */}
                  <button
                    onClick={() => markDone(order.id)}
                    className="w-full font-bold tracking-[3px] transition-all active:scale-[0.98]"
                    style={{
                      background: '#A8926E',
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
        style={{ background: '#C3B091', color: '#3D2010', fontFamily: "'Noto Serif TC', serif" }}>
        載入中…
      </div>
    }>
      <KitchenContent />
    </Suspense>
  )
}
