// Path: src/app/menu/page.tsx
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useCart } from '@/hooks/useCart'
import { OptionSheet } from '@/components/OptionSheet'
import { TOPPING_CATEGORIES } from '@/lib/toppings'
import type { MenuItem, CartItemOption, MenuCategory } from '@/types'

export const dynamic = 'force-dynamic'

const C = {
  bg:       '#F7F4F0',
  sidebar:  '#FFFFFF',
  card:     '#FFFFFF',
  header:   '#3D2B1F',
  primary:  '#D97706',
  primaryD: '#B45309',
  text:     '#1C1C1E',
  sub:      '#6B6B6B',
  muted:    '#AEAEB2',
  border:   '#E5E5EA',
  pill:     '#F0EBE3',
}

function MenuContent() {
  const searchParams = useSearchParams()
  const table        = searchParams.get('table') || 'A1'
  const ticketParam  = searchParams.get('ticket')
  const ticketNumber = ticketParam ? Number(ticketParam) : null

  const [menuData, setMenuData]             = useState<MenuCategory[]>([])
  const [menuLoading, setMenuLoading]       = useState(true)
  const [soldOut, setSoldOut]               = useState<string[]>([])
  const [showOptions, setShowOptions]       = useState<MenuItem | null>(null)
  const [activeCategory, setActiveCategory] = useState('')
  const [orderNote, setOrderNote]           = useState('')
  const [submitting, setSubmitting]         = useState(false)
  const [submitted, setSubmitted]           = useState(false)
  const [pickupNumber, setPickupNumber]     = useState<number | null>(null)
  const [redirectingToPay, setRedirectingToPay] = useState(false)
  const [snapshot, setSnapshot]             = useState<{ name: string; qty: number; price: number }[]>([])
  const [snapshotTotal, setSnapshotTotal]   = useState(0)

  const { items, addItem, removeItem, updateQty, clearCart, total } = useCart()

  useEffect(() => {
    fetch('/api/menu')
      .then(r => r.json())
      .then((data: MenuCategory[]) => {
        setMenuData(data)
        if (data.length > 0) setActiveCategory(data[0].category)
      })
      .catch(() => setMenuData([]))
      .finally(() => setMenuLoading(false))
  }, [])

  useEffect(() => {
    const es = new EventSource('/api/events?channel=menu-updates')
    es.addEventListener('sold-out-update', (e) => setSoldOut(JSON.parse(e.data).soldOut))
    return () => es.close()
  }, [])

  const handleAddItem = (options: CartItemOption[]) => {
    if (!showOptions) return
    addItem(showOptions.id, showOptions.name, showOptions.price, options)
    setShowOptions(null)
  }

  const getItemQty = (id: string) =>
    items.filter(c => c.id === id).reduce((s, c) => s + c.qty, 0)

  const handleMinus = (itemId: string) => {
    const matched = items.map((c, i) => ({ c, i })).filter(({ c }) => c.id === itemId)
    if (!matched.length) return
    const last = matched[matched.length - 1]
    if (last.c.qty > 1) updateQty(last.i, last.c.qty - 1)
    else removeItem(last.i)
  }

  const handleSubmitOrder = async () => {
    if (!items.length) return
    setSubmitting(true)
    try {
      const formattedItems = items.map(i => ({
        id: i.id, name: i.name, qty: i.qty,
        price: i.price + i.options.reduce((s, o) => s + o.price_delta, 0),
        options: i.options,
      }))
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: table, items: formattedItems, total,
          note: orderNote || null,
          pickup_number: ticketNumber ?? undefined,
        }),
      })
      if (!res.ok) return
      const data = await res.json()

      setRedirectingToPay(true)
      const productName = formattedItems.map(i => `${i.name}×${i.qty}`).join(', ')
      const payRes = await fetch('/api/linepay/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: data.id, amount: total, productName }),
      })
      const payData = await payRes.json()
      if (payData.paymentUrl) {
        clearCart()
        window.location.href = payData.paymentUrl
      } else {
        setRedirectingToPay(false)
      }
    } catch (e) {
      console.error(e)
      setRedirectingToPay(false)
    } finally {
      setSubmitting(false)
    }
  }

  const activeCat  = menuData.find(c => c.category === activeCategory)
  const totalQty   = items.reduce((s, i) => s + i.qty, 0)

  if (menuLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-base font-sans"
        style={{ background: C.bg, color: C.muted }}>
        載入中…
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ background: C.bg }}>

      {/* ── 左側：分類 Sidebar ──────────────────────────── */}
      <aside className="flex flex-col shrink-0 border-r"
        style={{ width: 200, background: C.sidebar, borderColor: C.border }}>

        {/* 店名 */}
        <div className="px-5 py-5 border-b" style={{ borderColor: C.border, background: C.header }}>
          <h1 className="text-lg font-black tracking-[4px]" style={{ color: '#F5E6C8' }}>忠國豆漿</h1>
          <p className="text-xs mt-1 tracking-wide" style={{ color: '#C9A97A' }}>
            {table === 'takeout'
              ? ticketNumber != null
                ? `外帶 #${String(ticketNumber).padStart(3, '0')}`
                : '外帶'
              : `${table} 桌・內用`}
          </p>
        </div>

        {/* 分類按鈕 */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {menuData.map(cat => {
            const isOn = cat.category === activeCategory
            return (
              <button
                key={cat.category}
                onClick={() => setActiveCategory(cat.category)}
                className="w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-150 active:scale-[0.98]"
                style={{
                  background:  isOn ? C.primary : 'transparent',
                  color:       isOn ? '#fff'     : C.sub,
                  fontWeight:  isOn ? 700 : 500,
                  transform:   isOn ? 'translateX(2px)' : undefined,
                  boxShadow:   isOn ? '0 4px 12px rgba(217,119,6,0.25)' : undefined,
                }}
              >
                {cat.category}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* ── 中間：品項 Grid ─────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b shrink-0" style={{ borderColor: C.border, background: C.sidebar }}>
          <h2 className="text-xl font-bold" style={{ color: C.text }}>
            <span style={{ borderLeft: `4px solid ${C.primary}`, paddingLeft: 10 }}>
              {activeCategory}
            </span>
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {activeCat?.items.map(item => {
              const qty         = getItemQty(item.id)
              const isSoldOut   = soldOut.includes(item.id)
              const hasOpts     = item.options.length > 0 || TOPPING_CATEGORIES.has(activeCategory)
              const hasSizeOpts = item.options.some(o => o.label.includes('杯'))
              const minPrice    = hasSizeOpts
                ? item.price + Math.min(0, ...item.options.filter(o => o.label.includes('杯')).map(o => o.price_delta))
                : item.price

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (isSoldOut) return
                    if (item.options.length === 0 && !TOPPING_CATEGORIES.has(activeCategory))
                      addItem(item.id, item.name, item.price, [])
                    else
                      setShowOptions(item)
                  }}
                  className="flex flex-col rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 group"
                  style={{
                    background: C.card,
                    borderColor: qty > 0 ? C.primary : C.border,
                    boxShadow:   qty > 0
                      ? `0 0 0 2px ${C.primary}40, 0 4px 16px rgba(217,119,6,0.12)`
                      : '0 1px 4px rgba(0,0,0,0.06)',
                    opacity: isSoldOut ? 0.5 : 1,
                  }}
                >
                  {/* 圖示區 */}
                  <div
                    className="flex items-center justify-center text-5xl relative transition-colors duration-200"
                    style={{
                      height: 100,
                      background: qty > 0 ? '#FEF3C7' : C.pill,
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    🍽️
                    {/* 標籤 */}
                    {isSoldOut && (
                      <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: '#F2F2F7', color: C.muted }}>售罄</span>
                    )}
                    {hasSizeOpts && !isSoldOut && (
                      <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: '#E0F2FE', color: '#0369A1' }}>選規格</span>
                    )}
                    {!hasSizeOpts && hasOpts && !isSoldOut && (
                      <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: '#FEF3C7', color: '#92400E' }}>可客製</span>
                    )}
                    {/* 數量徽章 */}
                    {qty > 0 && (
                      <span className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white"
                        style={{ background: C.primary }}>
                        {qty}
                      </span>
                    )}
                  </div>

                  {/* 資訊區 */}
                  <div className="p-3 flex flex-col gap-2">
                    <p className="text-sm font-bold leading-snug" style={{ color: C.text }}>{item.name}</p>
                    <div className="flex items-center justify-between">
                      {hasSizeOpts ? (
                        <span className="text-xs font-medium" style={{ color: C.muted }}>${minPrice} 起</span>
                      ) : (
                        <span className="text-base font-black" style={{ color: C.primary }}>${item.price}</span>
                      )}
                      {/* ＋ 按鈕 */}
                      {!isSoldOut && (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xl font-bold transition-all duration-200 group-hover:scale-110"
                          style={{
                            background: qty > 0 ? C.primary : C.pill,
                            color:      qty > 0 ? '#fff'    : C.primary,
                          }}
                          onClick={e => {
                            e.stopPropagation()
                            if (item.options.length === 0 && !TOPPING_CATEGORIES.has(activeCategory))
                              addItem(item.id, item.name, item.price, [])
                            else
                              setShowOptions(item)
                          }}
                        >
                          ＋
                        </div>
                      )}
                    </div>

                    {/* 加減控制（若已加入） */}
                    {qty > 0 && (
                      <div className="flex items-center justify-between mt-1 rounded-xl p-1"
                        style={{ background: C.pill }}>
                        <button
                          onClick={e => { e.stopPropagation(); handleMinus(item.id) }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-lg transition active:scale-90"
                          style={{ background: '#fff', color: C.sub, border: `1px solid ${C.border}` }}>
                          −
                        </button>
                        <span className="text-sm font-black" style={{ color: C.text }}>{qty}</span>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            if (item.options.length === 0 && !TOPPING_CATEGORIES.has(activeCategory))
                              addItem(item.id, item.name, item.price, [])
                            else
                              setShowOptions(item)
                          }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-lg transition active:scale-90"
                          style={{ background: C.primary, color: '#fff' }}>
                          ＋
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>

      {/* ── 右側：購物車 Panel ──────────────────────────── */}
      <aside className="flex flex-col shrink-0 border-l"
        style={{ width: 320, background: C.sidebar, borderColor: C.border }}>

        {/* Header */}
        <div className="px-5 py-4 border-b flex justify-between items-center shrink-0"
          style={{ borderColor: C.border }}>
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: C.text }}>
            🛒 購物車
          </h2>
          <span className="text-xs font-bold px-3 py-1 rounded-full"
            style={{ background: totalQty > 0 ? '#FEF3C7' : C.pill, color: totalQty > 0 ? C.primaryD : C.muted, border: `1px solid ${totalQty > 0 ? C.primary : C.border}` }}>
            {totalQty} 項
          </span>
        </div>

        {/* 品項列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full pb-10" style={{ color: C.muted }}>
              <span className="text-5xl mb-4 opacity-40">🍽️</span>
              <p className="text-sm font-medium">尚無餐點</p>
              <p className="text-xs mt-1">請從左側菜單點選加入</p>
            </div>
          ) : (
            items.map((item, idx) => {
              const unitPrice = item.price + item.options.reduce((s, o) => s + o.price_delta, 0)
              return (
                <div key={idx} className="rounded-xl border p-3"
                  style={{ background: C.card, borderColor: C.border, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 pr-2">
                      <p className="text-sm font-bold leading-snug" style={{ color: C.text }}>{item.name}</p>
                      {item.options.length > 0 && (
                        <p className="text-xs mt-0.5" style={{ color: C.sub }}>
                          {item.options.map(o => o.label).join('・')}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-black shrink-0" style={{ color: C.primaryD }}>
                      ${unitPrice * item.qty}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: C.muted }}>單價 ${unitPrice}</span>
                    <div className="flex items-center gap-1 rounded-lg p-0.5"
                      style={{ background: C.pill, border: `1px solid ${C.border}` }}>
                      <button
                        onClick={() => handleMinus(item.id)}
                        className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-base transition active:scale-90"
                        style={{ background: '#fff', color: C.sub, boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-black" style={{ color: C.text }}>
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateQty(idx, item.qty + 1)}
                        className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-base transition active:scale-90"
                        style={{ background: C.primary, color: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>
                        ＋
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* 底部：備註＋合計＋結帳 */}
        <div className="shrink-0 border-t p-4 space-y-3"
          style={{ borderColor: C.border, paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
          {/* 備註 */}
          <input
            type="text"
            value={orderNote}
            onChange={e => setOrderNote(e.target.value)}
            placeholder="備註（例：不加蔥、少辣）"
            className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
            style={{ border: `1.5px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 16 }}
          />

          {/* 合計 */}
          <div className="flex justify-between items-end">
            <span className="text-sm font-semibold" style={{ color: C.sub }}>結帳總計</span>
            <span className="text-3xl font-black" style={{ color: '#DC2626' }}>
              ${total.toLocaleString()}
            </span>
          </div>

          {/* 確認送出 */}
          <button
            onClick={handleSubmitOrder}
            disabled={totalQty === 0 || submitting}
            className="w-full rounded-xl py-4 text-base font-bold tracking-wide transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: totalQty > 0 ? C.primary : C.muted,
              color: '#fff',
              boxShadow: totalQty > 0 ? '0 8px 20px rgba(217,119,6,0.3)' : 'none',
            }}>
            {submitting ? '送出中…' : totalQty === 0 ? '購物車是空的' : '確認送出並付款'}
          </button>
        </div>
      </aside>

      {/* ── OptionSheet ─────────────────────────────────── */}
      {showOptions && (
        <OptionSheet
          item={showOptions}
          showToppings={TOPPING_CATEGORIES.has(activeCategory)}
          onAdd={handleAddItem}
          onClose={() => setShowOptions(null)}
        />
      )}

      {/* ── LINE Pay 跳轉 spinner ────────────────────────── */}
      {redirectingToPay && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center font-sans"
          style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="w-16 h-16 rounded-full border-4 border-white border-t-transparent animate-spin mb-6" />
          <p className="text-base font-semibold text-white">導向 LINE Pay…</p>
        </div>
      )}

      {/* ── 送出成功：內用（3.5 秒自動消失）── */}
      {submitted && table !== 'takeout' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overlay-enter font-sans"
          style={{ background: 'rgba(0,0,0,0.55)' }}>
          <div className="rounded-3xl p-10 text-center mx-6 pop-in" style={{ background: '#fff', minWidth: 240 }}>
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-xl font-bold mb-1" style={{ color: C.text }}>訂單已送出！</h2>
            <p className="text-sm mt-2" style={{ color: C.sub }}>{table} 桌，廚房收到了</p>
            <p className="text-sm mt-1" style={{ color: C.muted }}>請稍候 🍳</p>
          </div>
        </div>
      )}

      {/* ── 送出成功：外帶號碼單（全屏，手動關閉）── */}
      {submitted && table === 'takeout' && (
        <div className="fixed inset-0 z-50 flex flex-col font-sans overlay-enter"
          style={{ background: C.header }}>
          <div className="h-2 w-full" style={{ background: C.primary }} />
          <div className="flex-1 overflow-y-auto flex flex-col items-center px-6 py-8">
            <p className="text-sm tracking-[4px] mb-1" style={{ color: '#C9A97A' }}>忠國豆漿</p>
            <p className="text-xs tracking-[2px] mb-8" style={{ color: '#7A5240' }}>外帶取餐號碼單</p>
            <div className="w-full max-w-xs rounded-3xl flex flex-col items-center py-8 mb-8 pop-in"
              style={{ background: C.primary, boxShadow: '0 8px 32px rgba(217,119,6,0.4)' }}>
              <p className="text-sm font-semibold tracking-[3px] mb-2" style={{ color: 'rgba(255,255,255,0.75)' }}>取餐號碼</p>
              <p className="font-black leading-none" style={{ color: '#fff', fontSize: 96 }}>
                {pickupNumber !== null ? String(pickupNumber).padStart(3, '0') : '---'}
              </p>
              <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.6)' }}>聽到叫號請至櫃台取餐</p>
            </div>
            <div className="w-full max-w-xs rounded-2xl overflow-hidden mb-6"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                <p className="text-xs font-bold tracking-[3px]" style={{ color: '#C9A97A' }}>訂單明細</p>
              </div>
              <div className="px-4 py-2">
                {snapshot.map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-2.5 border-b last:border-b-0"
                    style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <span className="text-sm" style={{ color: '#F5E6C8' }}>{item.name}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.1)', color: '#C9A97A' }}>×{item.qty}</span>
                      <span className="text-sm font-bold" style={{ color: '#F5E6C8' }}>${item.price * item.qty}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center px-4 py-3 border-t"
                style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)' }}>
                <span className="text-sm" style={{ color: '#C9A97A' }}>合計</span>
                <span className="text-base font-bold" style={{ color: '#F5E6C8' }}>${snapshotTotal}</span>
              </div>
            </div>
          </div>
          <div className="px-6"
            style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))', paddingTop: 12,
              background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => { setSubmitted(false); setOrderNote(''); setPickupNumber(null); setSnapshot([]); setSnapshotTotal(0) }}
              className="w-full rounded-2xl py-4 text-base font-bold tracking-[3px] transition-all active:scale-[0.98]"
              style={{ background: C.primary, color: '#fff' }}>
              完成，繼續點餐
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MenuPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen text-base font-sans"
        style={{ background: '#F7F4F0', color: '#AEAEB2' }}>
        載入中…
      </div>
    }>
      <MenuContent />
    </Suspense>
  )
}
