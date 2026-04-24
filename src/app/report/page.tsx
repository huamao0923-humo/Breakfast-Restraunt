// Path: src/app/report/page.tsx
'use client'

import { useEffect, useState } from 'react'
import type { Order } from '@/types'

export const dynamic = 'force-dynamic'

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('zh-TW', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

export default function ReportPage() {
  const [authed, setAuthed] = useState(false)
  const [input, setInput]   = useState('')
  const [error, setError]   = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [date, setDate]     = useState(() => new Date().toISOString().split('T')[0])

  const buildUrl = (pwd: string, d: string) => {
    const tomorrow = new Date(d)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return `/api/orders?password=${encodeURIComponent(pwd)}&from=${d}&to=${tomorrow.toISOString().split('T')[0]}`
  }

  const handleLogin = async () => {
    const res = await fetch(buildUrl(input, date))
    if (res.ok) {
      setOrders(await res.json() as Order[])
      setAuthed(true)
      setError(false)
    } else {
      setError(true)
    }
  }

  useEffect(() => {
    if (!authed) return
    fetch(buildUrl(input, date)).then((r) => r.ok ? r.json() : []).then(setOrders)
  }, [authed, date, input])

  const totalOrders  = orders.length
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0)
  const avgOrder     = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

  /* ── 密碼頁 ── */
  if (!authed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: '#FFFDF7', fontFamily: "'Noto Serif TC', serif" }}>
        <div className="w-full max-w-xs">
          <h1 className="text-2xl font-bold tracking-[6px] text-center mb-2" style={{ color: '#5C3D2E' }}>
            忠國豆漿
          </h1>
          <p className="text-xs tracking-[2px] text-center mb-10" style={{ color: '#C9A97A' }}>
            老闆報表
          </p>

          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="輸入密碼"
            className="w-full rounded-xl px-4 py-4 text-center tracking-widest focus:outline-none mb-3"
            style={{
              border: `1.5px solid ${error ? '#C05050' : '#D4B896'}`,
              background: '#FDFAF5',
              color: '#3D2B1F',
              fontFamily: "'Noto Serif TC', serif",
              fontSize: 16,
            }}
          />
          {error && (
            <p className="text-xs text-center mb-3 tracking-wide" style={{ color: '#C05050' }}>
              密碼錯誤，請再試一次
            </p>
          )}
          <button onClick={handleLogin}
            className="w-full rounded-xl font-bold tracking-[3px] transition-all active:scale-[0.98]"
            style={{ background: '#5C3D2E', color: '#F5E6C8', fontFamily: "'Noto Serif TC', serif", padding: '15px 0', fontSize: 15 }}>
            進入報表
          </button>
        </div>
      </div>
    )
  }

  /* ── 報表頁 ── */
  return (
    <div className="min-h-screen" style={{ background: '#F5EFE6', fontFamily: "'Noto Serif TC', serif" }}>

      {/* Header */}
      <div className="px-5 py-4 border-b flex justify-between items-center"
        style={{
          background: '#5C3D2E',
          borderColor: '#7A5240',
          paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
        }}>
        <h1 className="text-base font-bold tracking-[4px]" style={{ color: '#F5E6C8' }}>
          今日結算
        </h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-transparent border-none focus:outline-none text-sm tracking-wide"
          style={{ color: '#C9A97A', fontSize: 14 }}
        />
      </div>

      <div className="px-4 py-4 max-w-sm mx-auto"
        style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {[
            { num: totalOrders.toString(), label: '筆訂單', icon: '🧾' },
            { num: `$${totalRevenue.toLocaleString()}`, label: '總營收', icon: '💰' },
            { num: `$${avgOrder}`, label: '平均客單', icon: '📊' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl p-3 text-center"
              style={{ background: '#FFFDF7', boxShadow: '0 1px 4px rgba(92,61,46,0.08)' }}>
              <div className="text-xl mb-0.5">{s.icon}</div>
              <div className="font-bold leading-tight" style={{ color: '#5C3D2E', fontSize: 18 }}>
                {s.num}
              </div>
              <div className="text-[10px] tracking-[1px] mt-0.5" style={{ color: '#9C7A5A' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* 訂單明細標題 */}
        <p className="text-[11px] font-bold tracking-[3px] mb-2.5 px-1" style={{ color: '#9C7A5A' }}>
          訂單明細
        </p>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-4xl mb-3 opacity-30">📋</div>
            <p className="text-sm tracking-wide" style={{ color: '#C9A97A' }}>當天尚無訂單紀錄</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {orders.map((order) => (
              <div key={order.id} className="rounded-2xl overflow-hidden"
                style={{ background: '#FFFDF7', boxShadow: '0 1px 3px rgba(92,61,46,0.07)' }}>

                {/* 訂單 Header */}
                <div className="px-4 py-3 flex justify-between items-center"
                  style={{ background: '#F5EFE6', borderBottom: '1px solid #EDE5D8' }}>
                  <span className="font-bold tracking-wide" style={{ color: '#5C3D2E', fontSize: 14 }}>
                    {order.table_id} 桌
                  </span>
                  <span className="text-xs" style={{ color: '#9C7A5A' }}>
                    {formatTime(order.created_at)}
                  </span>
                </div>

                {/* 品項 */}
                <div className="px-4 py-2">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between py-1.5 border-b border-dashed last:border-b-0"
                      style={{ borderColor: '#EDE5D8' }}>
                      <span className="text-[13px]" style={{ color: '#5C4030' }}>
                        {item.name} ×{item.qty}
                      </span>
                      <span className="text-[13px]" style={{ color: '#8B5E3C' }}>
                        ${item.price * item.qty}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 小計 */}
                <div className="flex justify-between items-center px-4 py-3 border-t"
                  style={{ borderColor: '#EDE5D8' }}>
                  <span className="text-sm" style={{ color: '#9C7A5A' }}>小計</span>
                  <span className="text-base font-bold" style={{ color: '#5C3D2E' }}>${order.total}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
