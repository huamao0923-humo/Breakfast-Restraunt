'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

const C = {
  header:   '#3D2B1F',
  primary:  '#D97706',
  primaryD: '#B45309',
  text:     '#1C1C1E',
  sub:      '#6B6B6B',
  muted:    '#AEAEB2',
  border:   '#E5E5EA',
}

interface OrderItem {
  name: string
  qty: number
  price: number
}

interface OrderData {
  pickup_number: number | null
  table_id: string
  items: OrderItem[]
  total: number
}

function SuccessContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const orderId      = searchParams.get('orderId')
  const [order, setOrder] = useState<OrderData | null>(null)

  useEffect(() => {
    if (!orderId) return
    fetch(`/api/orders/${orderId}`)
      .then(r => r.json())
      .then(data => setOrder(data))
      .catch(() => {})
  }, [orderId])

  const isTakeout = order?.table_id === 'takeout'

  return (
    <div className="fixed inset-0 flex flex-col font-sans" style={{ background: C.header }}>
      <div className="h-2 w-full" style={{ background: C.primary }} />

      <div className="flex-1 overflow-y-auto flex flex-col items-center px-6 py-8">
        <p className="text-sm tracking-[4px] mb-1" style={{ color: '#C9A97A' }}>忠國豆漿</p>
        <p className="text-xs tracking-[2px] mb-6" style={{ color: '#7A5240' }}>
          付款成功 · {isTakeout ? '外帶取餐號碼單' : `內用 ${order?.table_id} 桌`}
        </p>

        {/* 綠色勾 */}
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 pop-in"
          style={{ background: '#16A34A' }}>
          <svg width="36" height="28" viewBox="0 0 36 28" fill="none">
            <path d="M3 14L13 24L33 4" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {isTakeout && order?.pickup_number != null && (
          <div className="w-full max-w-xs rounded-3xl flex flex-col items-center py-8 mb-8 pop-in"
            style={{ background: C.primary, boxShadow: '0 8px 32px rgba(217,119,6,0.4)' }}>
            <p className="text-sm font-semibold tracking-[3px] mb-2" style={{ color: 'rgba(255,255,255,0.75)' }}>
              取餐號碼
            </p>
            <p className="font-black leading-none" style={{ color: '#fff', fontSize: 96 }}>
              {String(order.pickup_number).padStart(3, '0')}
            </p>
            <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.6)' }}>
              聽到叫號請至櫃台取餐
            </p>
          </div>
        )}

        {!isTakeout && (
          <div className="mb-8 text-center">
            <p className="text-lg font-bold" style={{ color: '#F5E6C8' }}>訂單已送出廚房！</p>
            <p className="text-sm mt-1" style={{ color: '#C9A97A' }}>請稍候 🍳</p>
          </div>
        )}

        {order && (
          <div className="w-full max-w-xs rounded-2xl overflow-hidden mb-6"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <p className="text-xs font-bold tracking-[3px]" style={{ color: '#C9A97A' }}>訂單明細</p>
            </div>
            <div className="px-4 py-2">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center py-2.5 border-b last:border-b-0"
                  style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <span className="text-sm" style={{ color: '#F5E6C8' }}>{item.name}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.1)', color: '#C9A97A' }}>
                      ×{item.qty}
                    </span>
                    <span className="text-sm font-bold" style={{ color: '#F5E6C8' }}>
                      ${item.price * item.qty}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center px-4 py-3 border-t"
              style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)' }}>
              <span className="text-sm" style={{ color: '#C9A97A' }}>合計</span>
              <span className="text-base font-bold" style={{ color: '#F5E6C8' }}>${order.total}</span>
            </div>
          </div>
        )}
      </div>

      <div className="px-6"
        style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))', paddingTop: 12,
          background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={() => router.push('/menu?table=' + (order?.table_id ?? 'takeout'))}
          className="w-full rounded-2xl py-4 text-base font-bold tracking-[3px] transition-all active:scale-[0.98]"
          style={{ background: C.primary, color: '#fff' }}>
          完成，繼續點餐
        </button>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#3D2B1F', color: '#C9A97A' }}>
        載入中…
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
