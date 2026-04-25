'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

const C = {
  header:  '#3D2B1F',
  primary: '#D97706',
  sub:     '#6B6B6B',
}

function FailedContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const orderId      = searchParams.get('orderId')
  const reason       = searchParams.get('reason')
  const [retrying, setRetrying] = useState(false)

  const handleRetry = async () => {
    if (!orderId) return
    setRetrying(true)
    try {
      const orderRes = await fetch(`/api/orders/${orderId}`)
      const order    = await orderRes.json()

      const productName = order.items?.map((i: { name: string; qty: number }) => `${i.name}×${i.qty}`).join(', ') || '餐點'

      const res = await fetch('/api/linepay/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, amount: order.total, productName }),
      })
      const data = await res.json()
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
      }
    } catch (e) {
      console.error(e)
      setRetrying(false)
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center font-sans px-6"
      style={{ background: C.header }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ background: '#DC2626' }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M8 8L24 24M24 8L8 24" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"/>
        </svg>
      </div>

      <h1 className="text-2xl font-bold mb-2" style={{ color: '#F5E6C8' }}>付款未完成</h1>
      <p className="text-sm text-center mb-2" style={{ color: '#C9A97A' }}>
        {reason === 'missing_params' && '付款資訊遺失，請重新下單'}
        {reason === 'not_found' && '找不到訂單，請重新下單'}
        {reason === 'server_error' && '伺服器發生錯誤，請稍後再試'}
        {!reason || (!['missing_params','not_found','server_error'].includes(reason)) && '付款取消或失敗，您的訂單已保留'}
      </p>
      {orderId && (
        <p className="text-xs mb-10" style={{ color: '#7A5240' }}>訂單編號：{orderId}</p>
      )}

      <div className="w-full max-w-xs flex flex-col gap-3">
        {orderId && (
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="w-full rounded-2xl py-4 text-base font-bold transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: C.primary, color: '#fff' }}>
            {retrying ? '處理中…' : '重新付款'}
          </button>
        )}
        <button
          onClick={() => router.push('/menu')}
          className="w-full rounded-2xl py-4 text-base font-bold transition-all active:scale-[0.98]"
          style={{ border: '2px solid rgba(255,255,255,0.2)', color: '#F5E6C8', background: 'transparent' }}>
          返回菜單
        </button>
      </div>
    </div>
  )
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#3D2B1F', color: '#C9A97A' }}>
        載入中…
      </div>
    }>
      <FailedContent />
    </Suspense>
  )
}
