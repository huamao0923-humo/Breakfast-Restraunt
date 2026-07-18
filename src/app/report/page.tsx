// Path: src/app/report/page.tsx
'use client'

import { useEffect, useState } from 'react'
import type { Order } from '@/types'
import { orderOptionsForDisplay } from '@/lib/optionGroup'

export const dynamic = 'force-dynamic'

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('zh-TW', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

// ── 彙總每個品項的銷售數量與金額 ─────────────────────────
function buildItemStats(orders: Order[]) {
  const map: Record<string, { name: string; qty: number; revenue: number }> = {}
  for (const order of orders) {
    for (const item of order.items) {
      if (!map[item.name]) map[item.name] = { name: item.name, qty: 0, revenue: 0 }
      map[item.name].qty     += item.qty
      map[item.name].revenue += item.price * item.qty
    }
  }
  return Object.values(map).sort((a, b) => b.revenue - a.revenue)
}

export default function ReportPage() {
  const [authed, setAuthed] = useState(false)
  const [input, setInput]   = useState('')
  const [pwError, setPwError] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [date, setDate]     = useState(() => new Date().toISOString().split('T')[0])
  const [tab, setTab]       = useState<'items' | 'orders'>('items')

  const buildUrl = (pwd: string, d: string) => {
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    return `/api/orders?password=${encodeURIComponent(pwd)}&from=${d}&to=${next.toISOString().split('T')[0]}`
  }

  const handleLogin = async () => {
    const res = await fetch(buildUrl(input, date))
    if (res.ok) { setOrders(await res.json() as Order[]); setAuthed(true); setPwError(false) }
    else setPwError(true)
  }

  useEffect(() => {
    if (!authed) return
    fetch(buildUrl(input, date)).then((r) => r.ok ? r.json() : []).then(setOrders)
  }, [authed, date, input])

  // ── 統計數字 ──────────────────────────────────────────
  const totalOrders  = orders.length
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0)
  const totalItems   = orders.flatMap((o) => o.items).reduce((s, i) => s + i.qty, 0)
  const avgOrder     = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0
  const itemStats    = buildItemStats(orders)
  const topRevenue   = itemStats[0]?.revenue ?? 0

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
            type="password" value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="輸入密碼"
            className="w-full rounded-xl px-4 py-4 text-center tracking-widest focus:outline-none mb-3"
            style={{ border: `1.5px solid ${pwError ? '#C05050' : '#D4B896'}`, background: '#FDFAF5', color: '#3D2B1F', fontFamily: "'Noto Serif TC', serif", fontSize: 16 }}
          />
          {pwError && (
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
        style={{ background: '#5C3D2E', borderColor: '#7A5240', paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))' }}>
        <h1 className="text-base font-bold tracking-[4px]" style={{ color: '#F5E6C8' }}>
          今日結算
        </h1>
        <input
          type="date" value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-transparent border-none focus:outline-none tracking-wide"
          style={{ color: '#C9A97A', fontSize: 14 }}
        />
      </div>

      <div className="px-4 py-4 max-w-sm mx-auto"
        style={{ paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))' }}>

        {/* ── 統計數字卡片 ── */}
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {[
            { num: totalOrders.toString(),            label: '筆訂單',   icon: '🧾' },
            { num: `$${totalRevenue.toLocaleString()}`, label: '總營收',   icon: '💰' },
            { num: totalItems.toString(),              label: '售出品項', icon: '🍱' },
            { num: `$${avgOrder}`,                     label: '平均客單', icon: '📊' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl p-3.5 flex items-center gap-3"
              style={{ background: '#FFFDF7', boxShadow: '0 1px 4px rgba(92,61,46,0.08)' }}>
              <span className="text-2xl">{s.icon}</span>
              <div>
                <div className="font-bold leading-tight" style={{ color: '#5C3D2E', fontSize: 20 }}>
                  {s.num}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: '#9C7A5A' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── 空狀態 ── */}
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-4xl mb-3 opacity-30">📋</div>
            <p className="text-sm tracking-wide" style={{ color: '#C9A97A' }}>當天尚無訂單紀錄</p>
          </div>
        ) : (
          <>
            {/* ── Tab 切換 ── */}
            <div className="flex rounded-xl p-1 mb-4"
              style={{ background: '#E8DDD0' }}>
              {([
                { key: 'items',  label: '品項統計' },
                { key: 'orders', label: '訂單明細' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-150"
                  style={{
                    background: tab === key ? '#FFFDF7' : 'transparent',
                    color:      tab === key ? '#5C3D2E'  : '#9C7A5A',
                    boxShadow:  tab === key ? '0 1px 3px rgba(92,61,46,0.12)' : 'none',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ══ 品項統計 Tab ══ */}
            {tab === 'items' && (
              <div className="rounded-2xl overflow-hidden"
                style={{ background: '#FFFDF7', boxShadow: '0 1px 4px rgba(92,61,46,0.08)' }}>

                {/* 表頭 */}
                <div className="flex items-center px-4 py-2.5 border-b"
                  style={{ background: '#F5EFE6', borderColor: '#EDE5D8' }}>
                  <span className="flex-1 text-[11px] font-bold tracking-[2px]" style={{ color: '#9C7A5A' }}>
                    品項名稱
                  </span>
                  <span className="w-12 text-center text-[11px] font-bold tracking-[1px]" style={{ color: '#9C7A5A' }}>
                    數量
                  </span>
                  <span className="w-16 text-right text-[11px] font-bold tracking-[1px]" style={{ color: '#9C7A5A' }}>
                    金額
                  </span>
                </div>

                {/* 品項列 */}
                {itemStats.map((item, idx) => {
                  const barPct = topRevenue > 0 ? (item.revenue / topRevenue) * 100 : 0
                  return (
                    <div key={item.name}
                      className="px-4 pt-3 pb-2 border-b last:border-b-0 relative overflow-hidden"
                      style={{ borderColor: '#F0EBE3' }}>

                      {/* 背景進度條 */}
                      <div className="absolute inset-y-0 left-0"
                        style={{ width: `${barPct}%`, background: idx === 0 ? '#FEF3C720' : '#F5EFE660', transition: 'width 0.4s ease' }} />

                      <div className="relative flex items-center">
                        {/* 排名 badge */}
                        <span className="text-[10px] font-bold w-5 shrink-0"
                          style={{ color: idx < 3 ? '#C67C3A' : '#C9A97A' }}>
                          {idx + 1}
                        </span>

                        {/* 品項名 */}
                        <span className="flex-1 text-sm font-medium" style={{ color: '#3D2B1F' }}>
                          {item.name}
                        </span>

                        {/* 數量 */}
                        <span className="w-12 text-center text-sm font-semibold"
                          style={{ color: '#7A5240' }}>
                          ×{item.qty}
                        </span>

                        {/* 金額 */}
                        <span className="w-16 text-right text-sm font-bold"
                          style={{ color: '#5C3D2E' }}>
                          ${item.revenue.toLocaleString()}
                        </span>
                      </div>

                      {/* 品項佔比 bar */}
                      <div className="relative mt-1.5 h-1 rounded-full overflow-hidden"
                        style={{ background: '#EDE5D8' }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${barPct}%`,
                            background: idx === 0 ? '#C67C3A' : idx === 1 ? '#D4956A' : idx === 2 ? '#DFB090' : '#C9A97A',
                          }} />
                      </div>
                    </div>
                  )
                })}

                {/* 合計列 */}
                <div className="flex items-center px-4 py-3 border-t"
                  style={{ background: '#F5EFE6', borderColor: '#D4B896' }}>
                  <span className="flex-1 text-sm font-bold" style={{ color: '#5C3D2E' }}>合計</span>
                  <span className="w-12 text-center text-sm font-bold" style={{ color: '#5C3D2E' }}>
                    {totalItems}
                  </span>
                  <span className="w-16 text-right text-sm font-bold" style={{ color: '#5C3D2E' }}>
                    ${totalRevenue.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* ══ 訂單明細 Tab ══ */}
            {tab === 'orders' && (
              <div className="space-y-2.5">
                {orders.map((order) => (
                  <div key={order.id} className="rounded-2xl overflow-hidden"
                    style={{ background: '#FFFDF7', boxShadow: '0 1px 3px rgba(92,61,46,0.07)' }}>

                    {/* 訂單 Header */}
                    <div className="px-4 py-3 flex justify-between items-center"
                      style={{ background: '#F5EFE6', borderBottom: '1px solid #EDE5D8' }}>
                      <span className="font-bold tracking-wide" style={{ color: '#5C3D2E', fontSize: 14 }}>
                        {order.table_id === 'takeout'
                          ? `外帶 #${String(order.pickup_number ?? 0).padStart(3, '0')}`
                          : `${order.table_id} 桌`}
                      </span>
                      <span className="text-xs" style={{ color: '#9C7A5A' }}>
                        {formatTime(order.created_at)}
                      </span>
                    </div>

                    {/* 品項 */}
                    <div className="px-4 py-2">
                      {order.items.map((item, i) => (
                        <div key={i} className="py-1.5 border-b border-dashed last:border-b-0"
                          style={{ borderColor: '#EDE5D8' }}>
                          <div className="flex justify-between">
                            <span className="text-[13px]" style={{ color: '#5C4030' }}>
                              {item.name} ×{item.qty}
                            </span>
                            <span className="text-[13px]" style={{ color: '#8B5E3C' }}>
                              ${item.price * item.qty}
                            </span>
                          </div>
                          {Array.isArray(item.options) && item.options.length > 0 && (
                            <p className="text-xs mt-0.5" style={{ color: '#9C7A5A' }}>
                              {orderOptionsForDisplay(item.options).map((o) => o.qty && o.qty > 1 ? `${o.label} ×${o.qty}` : o.label).join('・')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* 備註 */}
                    {order.note && (
                      <div className="px-4 pb-2 text-xs italic" style={{ color: '#9C7A5A' }}>
                        備註：{order.note}
                      </div>
                    )}

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
          </>
        )}
      </div>
    </div>
  )
}
