// Path: src/app/kitchen/page.tsx
'use client'

import { useEffect, useState, Suspense } from 'react'
import type { Order } from '@/types'
import { usePrinter } from '@/hooks/usePrinter'

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
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [printingId, setPrintingId] = useState<string | null>(null)
  const printer = usePrinter()

  useEffect(() => {
    const fetchOrders = () =>
      fetch('/api/orders?mode=kitchen')
        .then((res) => res.ok ? res.json() : Promise.reject(res))
        .then((data: Order[]) => { setOrders(Array.isArray(data) ? data : []); setLoading(false) })
        .catch(() => setLoading(false))

    fetchOrders()
    const poll = setInterval(fetchOrders, 5000)

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

    return () => { es.close(); clearInterval(poll) }
  }, [])

  const markDone = async (id: string) => {
    setDone((prev) => new Set([...prev, id]))
    await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
  }

  const printOrder = async (order: Order) => {
    if (printer.status !== 'connected') {
      await printer.connect()
      return
    }
    setPrintingId(order.id)
    await printer.print(order)
    setPrintingId(null)
  }

  const cancelOrder = async (id: string) => {
    setCancelling(true)
    try {
      await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: 'cancelled' } : o))
    } finally {
      setCancelling(false)
      setCancelConfirm(null)
    }
  }

  const activeOrders = orders.filter((o) => !done.has(o.id) && o.status !== 'completed' && o.status !== 'cancelled')

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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full inline-block"
              style={{ background: '#6EE7B7', animation: 'pulse 2s infinite' }} />
            <span className="text-xs tracking-wide" style={{ color: '#3D2010' }}>即時同步中</span>
          </div>
          <button
            onClick={printer.status === 'connected' ? printer.disconnect : printer.connect}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(0,0,0,0.12)', border: 'none', borderRadius: 20,
              padding: '4px 10px', cursor: 'pointer',
            }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
              background: printer.status === 'connected' ? '#6EE7B7'
                        : printer.status === 'connecting' ? '#FCD34D' : '#F87171',
            }} />
            <span style={{ fontSize: 11, color: '#3D2010' }}>
              {printer.status === 'connected' ? '印表機'
               : printer.status === 'connecting' ? '連線中…' : '連接印表機'}
            </span>
          </button>
        </div>
      </div>

      {/* ── 訂單列表 ── */}
      <div className="px-6 py-6 max-w-2xl mx-auto" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
        {activeOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center" style={{ height: '60vh' }}>
            <div className="text-5xl mb-4 opacity-40">🍳</div>
            <p className="text-sm tracking-widest" style={{ color: '#3D2010' }}>目前沒有待處理訂單</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {activeOrders.map((order, idx) => {
              const isOdd = (idx + 1) % 2 !== 0   // 單號
              const cardBg = isOdd ? '#F5DEB3' : '#FFF8DC'
              const headerBg = isOdd ? '#E8C98A' : '#F0E8B0'
              const isNew = idx === 0
              return (
                <div key={order.id}
                  className="rounded-2xl overflow-hidden flex flex-col"
                  style={{
                    background: cardBg,
                    boxShadow: isNew
                      ? '0 0 0 2px #F5EDE3, 0 4px 16px rgba(0,0,0,0.25)'
                      : '0 1px 6px rgba(0,0,0,0.15)',
                  }}>

                  {/* Card Header */}
                  <div className="flex justify-between items-center"
                    style={{ background: headerBg, borderBottom: '1px solid rgba(0,0,0,0.12)', padding: '15px 25px' }}>
                    <div className="flex items-center gap-2">
                      {order.table_id === 'takeout' ? (
                        <span className="text-base font-bold tracking-[2px]" style={{ color: '#3D2010' }}>
                          外帶 #{order.pickup_number != null ? String(order.pickup_number).padStart(3, '0') : '---'}
                        </span>
                      ) : order.table_id === 'online' ? (
                        <div>
                          <span className="text-base font-bold tracking-[2px]" style={{ color: '#3D2010' }}>
                            線上自取 #{order.pickup_number != null ? String(order.pickup_number).padStart(3, '0') : '---'}
                          </span>
                          {order.note?.startsWith('[線上自取]') && (
                            <p className="text-xs mt-0.5" style={{ color: '#5C3D2E' }}>
                              {order.note.split('\n')[0].replace('[線上自取] ', '')}
                            </p>
                          )}
                        </div>
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
                  <div style={{ padding: '4px 25px 0' }}>
                    {order.items.map((item, i) => (
                      <div key={i}
                        className="flex justify-between items-center border-b border-dashed last:border-b-0"
                        style={{ borderColor: 'rgba(0,0,0,0.15)', padding: '12px 0' }}>
                        <div className="flex-1 min-w-0" style={{ paddingRight: 16 }}>
                          <span style={{ fontSize: 16, color: '#1C1C1E' }}>{item.name}</span>
                          {Array.isArray(item.options) && item.options.length > 0 && (
                            <p style={{ fontSize: 13, marginTop: 6, color: '#7A5C3A' }}>
                              {item.options.map((o: { label: string }) => o.label).join('・')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center shrink-0" style={{ gap: 16 }}>
                          <span className="font-bold rounded-full"
                            style={{ background: 'rgba(0,0,0,0.12)', color: '#3D2010', fontSize: 14, padding: '4px 12px' }}>
                            ×{item.qty}
                          </span>
                          <span className="font-bold" style={{ color: '#3D2010', fontSize: 14 }}>
                            ${item.price * item.qty}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Note */}
                  {(() => {
                    const displayNote = order.table_id === 'online' && order.note?.startsWith('[線上自取]')
                      ? order.note.split('\n').slice(1).join('\n').trim()
                      : order.note
                    return displayNote ? (
                      <div className="rounded-lg italic"
                        style={{ margin: '0 25px 12px', padding: '10px 14px', fontSize: 13, background: 'rgba(255,255,255,0.35)', color: '#3D2010', border: '1px dashed rgba(0,0,0,0.2)' }}>
                        📝 {displayNote}
                      </div>
                    ) : null
                  })()}

                  {/* Total */}
                  <div className="flex justify-between items-center border-t"
                    style={{ borderColor: 'rgba(0,0,0,0.12)', padding: '15px 25px' }}>
                    <span className="text-sm" style={{ color: '#5C3D2E' }}>合計</span>
                    <span className="text-base font-bold" style={{ color: '#1C1C1E' }}>${order.total}</span>
                  </div>

                  {/* Print Button */}
                  <button
                    onClick={() => printOrder(order)}
                    disabled={printingId === order.id || printer.status === 'connecting'}
                    className="w-full font-bold tracking-[2px] transition-all active:scale-[0.98]"
                    style={{
                      background: printer.status === 'connected' ? '#5C3D2E' : '#8C7455',
                      color: '#FFF8DC',
                      fontFamily: "'Noto Serif TC', serif",
                      fontSize: 14,
                      padding: '13px 0',
                      border: 'none',
                      cursor: 'pointer',
                      opacity: printingId === order.id ? 0.6 : 1,
                    }}>
                    {printingId === order.id ? '列印中…' : '🖨  列印出單'}
                  </button>

                  {/* Action Buttons */}
                  <div className="flex mt-auto">
                    <button
                      onClick={() => setCancelConfirm(order.id)}
                      className="font-bold tracking-[2px] transition-all active:scale-[0.98]"
                      style={{
                        flex: 1,
                        background: 'rgba(0,0,0,0.08)',
                        color: '#5C3010',
                        fontFamily: "'Noto Serif TC', serif",
                        fontSize: 13,
                        padding: '14px 0',
                        border: 'none',
                        cursor: 'pointer',
                        borderRight: '1px solid rgba(0,0,0,0.1)',
                      }}
                    >
                      取消訂單
                    </button>
                    <button
                      onClick={() => markDone(order.id)}
                      className="font-bold tracking-[3px] transition-all active:scale-[0.98]"
                      style={{
                        flex: 2,
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
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 取消確認彈窗 ── */}
      {cancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.55)' }}>
          <div className="w-full max-w-xs rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: '#FFF8DC', fontFamily: "'Noto Serif TC', serif" }}>
            <div className="px-6 pt-6 pb-4 text-center">
              <p className="text-lg font-bold mb-2" style={{ color: '#3D2010' }}>確認取消訂單？</p>
              <p className="text-sm" style={{ color: '#7A5240' }}>此訂單將從廚房移除，無法復原</p>
            </div>
            <div className="flex border-t" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
              <button
                onClick={() => setCancelConfirm(null)}
                disabled={cancelling}
                className="flex-1 py-4 text-sm font-semibold transition-all active:scale-95"
                style={{ color: '#7A5240', borderRight: '1px solid rgba(0,0,0,0.1)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                返回
              </button>
              <button
                onClick={() => cancelOrder(cancelConfirm)}
                disabled={cancelling}
                className="flex-1 py-4 text-sm font-bold transition-all active:scale-95"
                style={{ color: '#fff', background: '#A0522D', border: 'none', cursor: 'pointer' }}>
                {cancelling ? '取消中…' : '確認取消'}
              </button>
            </div>
          </div>
        </div>
      )}
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
