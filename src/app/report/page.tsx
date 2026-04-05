// Path: src/app/report/page.tsx
'use client'

import { useEffect, useState } from 'react'
import type { Order } from '@/types'

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export const dynamic = 'force-dynamic'

export default function ReportPage() {
  const [authed, setAuthed] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [date, setDate] = useState(() => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  })

  const handleLogin = async () => {
    const tomorrow = new Date(date)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const to = tomorrow.toISOString().split('T')[0]
    const res = await fetch(
      `/api/orders?password=${encodeURIComponent(input)}&from=${date}&to=${to}`
    )
    if (res.ok) {
      const data = await res.json()
      setOrders(data as Order[])
      setAuthed(true)
      setError(false)
    } else {
      setError(true)
    }
  }

  useEffect(() => {
    if (!authed) return
    const fetchOrders = async () => {
      const tomorrow = new Date(date)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const to = tomorrow.toISOString().split('T')[0]
      const res = await fetch(
        `/api/orders?password=${encodeURIComponent(input)}&from=${date}&to=${to}`
      )
      if (res.ok) {
        const data = await res.json()
        setOrders(data as Order[])
      }
    }
    fetchOrders()
  }, [authed, date, input])

  const totalOrders = orders.length
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0)
  const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

  // 密碼頁
  if (!authed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 mx-auto max-w-md border-l border-r" style={{ background: '#FFFDF7', fontFamily: "'Noto Serif TC', serif", borderColor: '#D4B896' }}>
        <h1 className="text-xl font-bold tracking-[4px] mb-8" style={{ color: '#5C3D2E' }}>
          忠國豆漿
        </h1>
        <div className="w-full max-w-xs">
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="輸入密碼"
            className="w-full border rounded-lg px-4 py-3 text-sm tracking-widest text-center outline-none mb-3"
            style={{ borderColor: '#D4B896', color: '#3D2B1F', background: '#FFFDF7' }}
          />
          {error && (
            <p className="text-xs text-center mb-2 tracking-wide" style={{ color: '#A32D2D' }}>
              密碼錯誤
            </p>
          )}
          <button
            onClick={handleLogin}
            className="w-full rounded-lg py-3 text-sm font-bold tracking-[3px]"
            style={{ background: '#5C3D2E', color: '#F5E6C8', fontFamily: "'Noto Serif TC', serif" }}
          >
            進入報表
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-5 py-5 mx-auto max-w-lg border-l border-r" style={{ background: '#FFFDF7', fontFamily: "'Noto Serif TC', serif", borderColor: '#D4B896' }}>
      {/* Header */}
      <div className="flex justify-between items-end border-b-2 pb-3 mb-4" style={{ borderColor: '#5C3D2E' }}>
        <h1 className="text-[17px] font-bold tracking-[3px]" style={{ color: '#5C3D2E' }}>
          今日結算
        </h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="text-[11px] bg-transparent border-none outline-none tracking-wide"
          style={{ color: '#9C7A5A' }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-[18px]">
        {[
          { num: totalOrders.toString(), label: '筆訂單' },
          { num: `$${totalRevenue.toLocaleString()}`, label: '總營收' },
          { num: `$${avgOrder}`, label: '平均客單' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-md p-2.5 sm:p-3 text-center border border-dashed"
            style={{ background: '#F5EFE6', borderColor: '#D4B896' }}
          >
            <div className="text-lg sm:text-[22px] font-bold" style={{ color: '#5C3D2E' }}>
              {s.num}
            </div>
            <div className="text-[9px] sm:text-[10px] tracking-[1px] sm:tracking-[2px] mt-0.5" style={{ color: '#9C7A5A' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Orders */}
      <div className="text-[10px] font-bold tracking-[3px] mb-2" style={{ color: '#9C7A5A' }}>
        訂單明細
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-center mt-10 tracking-wide" style={{ color: '#C9A97A' }}>
          當天尚無訂單紀錄
        </p>
      ) : (
        orders.map((order) => (
          <div key={order.id} className="rounded-md mb-2 overflow-hidden border" style={{ borderColor: '#E8DDD0' }}>
            <div className="px-3 py-2 flex justify-between" style={{ background: '#F5EFE6' }}>
              <span className="text-[12px] font-bold tracking-wide" style={{ color: '#5C3D2E' }}>
                {order.table_id} 桌
              </span>
              <span className="text-[11px]" style={{ color: '#9C7A5A' }}>
                {formatTime(order.created_at)}
              </span>
            </div>
            <div className="px-3 py-2">
              {order.items.map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between text-[12px] py-0.5 border-b border-dashed last:border-b-0"
                  style={{ color: '#5C4030', borderColor: '#EDE5D8' }}
                >
                  <span>
                    {item.name} ×{item.qty}
                  </span>
                  <span>${item.price * item.qty}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[13px] font-bold px-3 py-2 border-t" style={{ color: '#5C3D2E', borderColor: '#E0D0BC' }}>
              <span>小計</span>
              <span>${order.total}</span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
