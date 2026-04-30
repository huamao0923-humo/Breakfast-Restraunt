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
  header:   '#FFDDA9',
  primary:  '#D97706',
  primaryD: '#B45309',
  text:     '#1C1C1E',
  sub:      '#6B6B6B',
  muted:    '#AEAEB2',
  border:   '#E5E5EA',
  pill:     '#F0EBE3',
}

// ── 共用：品項列表列 ─────────────────────────────────────
function ItemCard({
  item, qty, isSoldOut, hasOpts, hasSizeOpts, minPrice,
  onAdd, onMinus, onOpenOptions,
}: {
  item: MenuItem; qty: number; isSoldOut: boolean
  hasOpts: boolean; hasSizeOpts: boolean; minPrice: number
  onAdd: () => void; onMinus: () => void; onOpenOptions: () => void
}) {
  const handlePlus = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasOpts) onOpenOptions()
    else onAdd()
  }

  return (
    <div className="flex justify-between items-center py-4 px-5 border-b"
      style={{ borderColor: C.border, opacity: isSoldOut ? 0.5 : 1 }}>

      {/* 左側：名稱 + 標籤 + 價格 */}
      <div className="flex-1 pr-4 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
          <span className="text-base font-bold leading-snug" style={{ color: C.text }}>
            {item.name}
          </span>
          {isSoldOut && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: '#F2F2F7', color: C.muted }}>售罄</span>
          )}
          {hasSizeOpts && !isSoldOut && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: '#E0F2FE', color: '#0369A1' }}>選規格</span>
          )}
          {!hasSizeOpts && hasOpts && !isSoldOut && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: '#FEF3C7', color: '#92400E' }}>可客製</span>
          )}
        </div>
        {hasSizeOpts ? (
          <span className="text-sm font-medium" style={{ color: C.muted }}>${minPrice} 起</span>
        ) : (
          <span className="text-base font-semibold" style={{ color: C.primary }}>${item.price}</span>
        )}
      </div>

      {/* 右側：加減按鈕 */}
      {!isSoldOut && (
        <div className="flex items-center gap-2 shrink-0">
          {qty > 0 && (
            <>
              <button onClick={e => { e.stopPropagation(); onMinus() }}
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xl transition-all active:scale-90"
                style={{ border: `2px solid ${C.border}`, background: '#fff', color: C.sub }}>
                −
              </button>
              <span className="w-6 text-center text-base font-bold" style={{ color: C.text }}>{qty}</span>
            </>
          )}
          <button onClick={handlePlus}
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-2xl transition-all active:scale-90"
            style={{
              background: qty > 0 ? C.pill    : C.primary,
              color:      qty > 0 ? C.primary : '#fff',
              border:     qty > 0 ? `2px solid ${C.primary}` : 'none',
            }}>
            ＋
          </button>
        </div>
      )}
    </div>
  )
}

// ── 共用：購物車品項列 ────────────────────────────────────
function CartRow({ item, idx, onMinus, onPlus }: {
  item: { name: string; price: number; qty: number; options: { label: string; price_delta: number }[] }
  idx: number; onMinus: () => void; onPlus: () => void
}) {
  const unitPrice = item.price + item.options.reduce((s, o) => s + o.price_delta, 0)
  return (
    <div className="rounded-xl border p-3" style={{ background: C.card, borderColor: C.border }}>
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
          <button onClick={onMinus}
            className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-base transition active:scale-90"
            style={{ background: '#fff', color: C.sub }}>−</button>
          <span className="w-6 text-center text-sm font-black" style={{ color: C.text }}>{item.qty}</span>
          <button onClick={onPlus}
            className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-base transition active:scale-90"
            style={{ background: C.primary, color: '#fff' }}>＋</button>
        </div>
      </div>
    </div>
  )
}

// ── 主元件 ───────────────────────────────────────────────
function MenuContent() {
  const searchParams = useSearchParams()
  const table        = searchParams.get('table') || 'A1'
  const ticketParam  = searchParams.get('ticket')
  const ticketNumber = ticketParam ? Number(ticketParam) : null

  const [menuData, setMenuData]       = useState<MenuCategory[]>([])
  const [menuLoading, setMenuLoading] = useState(true)
  const [soldOut, setSoldOut]         = useState<string[]>([])
  const [showOptions, setShowOptions] = useState<MenuItem | null>(null)
  const [activeCategory, setActiveCategory] = useState('')

  // Mobile cart sheet
  const [showCart, setShowCart]     = useState(false)
  const [orderNote, setOrderNote]   = useState('')

  // Submit state
  const [submitting, setSubmitting]               = useState(false)
  const [submitted, setSubmitted]                 = useState(false)
  const [pickupNumber, setPickupNumber]           = useState<number | null>(null)
  const [redirectingToPay, setRedirectingToPay]   = useState(false)
  const [snapshot, setSnapshot]                   = useState<{ name: string; qty: number; price: number }[]>([])
  const [snapshotTotal, setSnapshotTotal]         = useState(0)

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

      setShowCart(false)
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

  const activeCat = menuData.find(c => c.category === activeCategory)
  const totalQty  = items.reduce((s, i) => s + i.qty, 0)

  if (menuLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-base font-sans"
        style={{ background: C.bg, color: C.muted }}>載入中…</div>
    )
  }

  // ── 共用品項資訊計算 ───────────────────────────────────
  const enrichedItems = (activeCat?.items ?? []).map(item => {
    const qty         = getItemQty(item.id)
    const isSoldOut   = soldOut.includes(item.id)
    const hasOpts     = item.options.length > 0 || TOPPING_CATEGORIES.has(activeCategory)
    const hasSizeOpts = item.options.some(o => o.label.includes('杯'))
    const minPrice    = hasSizeOpts
      ? item.price + Math.min(0, ...item.options.filter(o => o.label.includes('杯')).map(o => o.price_delta))
      : item.price
    return { item, qty, isSoldOut, hasOpts, hasSizeOpts, minPrice }
  })

  // ── 共用購物車底部操作區 ───────────────────────────────
  const CartFooter = () => (
    <div className="shrink-0 border-t p-4 space-y-3"
      style={{ borderColor: C.border, paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
      <input
        type="text" value={orderNote}
        onChange={e => setOrderNote(e.target.value)}
        placeholder="備註（例：不加蔥、少辣）"
        className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
        style={{ border: `1.5px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 16 }}
      />
      <div className="flex justify-between items-end">
        <span className="text-sm font-semibold" style={{ color: C.sub }}>結帳總計</span>
        <span className="text-3xl font-black" style={{ color: '#DC2626' }}>${total.toLocaleString()}</span>
      </div>
      <button
        onClick={handleSubmitOrder}
        disabled={totalQty === 0 || submitting}
        className="w-full rounded-xl py-4 text-base font-bold tracking-wide transition-all active:scale-[0.98] disabled:opacity-40"
        style={{
          background: totalQty > 0 ? C.primary : C.muted, color: '#fff',
          boxShadow: totalQty > 0 ? '0 8px 20px rgba(217,119,6,0.3)' : 'none',
        }}>
        {submitting ? '送出中…' : '確認送出並付款'}
      </button>
    </div>
  )

  return (
    <div className="font-sans" style={{ background: C.bg }}>

      <div className="flex flex-col mx-auto"
        style={{ maxWidth: 680, minHeight: '100dvh', paddingBottom: 'calc(76px + env(safe-area-inset-bottom, 0px))' }}>

        {/* Header */}
        <div style={{ background: C.header }}>
          <div className="px-5 pt-5 pb-3">
            <h1 className="text-xl font-bold text-center tracking-widest" style={{ color: '#3D2B1F' }}>
              忠國豆漿
            </h1>
            {table === 'takeout' && ticketNumber != null ? (
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="text-sm" style={{ color: '#7A4F2A' }}>外帶</span>
                <span className="text-xl font-black px-3 py-0.5 rounded-xl"
                  style={{ background: '#F5C842', color: '#3D2B1F' }}>
                  #{String(ticketNumber).padStart(3, '0')}
                </span>
                <span className="text-sm" style={{ color: '#7A4F2A' }}>號</span>
              </div>
            ) : (
              <p className="text-sm text-center mt-1" style={{ color: '#7A4F2A' }}>
                {table === 'takeout' ? '外帶' : `桌號 ${table}`}　·　手工現做
              </p>
            )}
          </div>

          {/* 分類 Pills */}
          <div className="flex overflow-x-auto gap-2 whitespace-nowrap px-4 pb-3 scrollbar-none">
            {menuData.map(cat => {
              const isOn = cat.category === activeCategory
              return (
                <button key={cat.category}
                  onClick={() => setActiveCategory(cat.category)}
                  className="shrink-0 rounded-full text-base font-semibold transition-all duration-150 active:scale-95"
                  style={{
                    background: isOn ? C.primary : 'rgba(0,0,0,0.08)',
                    color: isOn ? '#fff' : '#5C3A1A',
                    border: isOn ? 'none' : '1px solid rgba(0,0,0,0.12)',
                    letterSpacing: '0.2em',
                    padding: '0.5rem 1.1rem 0.5rem 0.9rem',
                    textAlign: 'center' as const,
                  }}>
                  {cat.category}
                </button>
              )
            })}
          </div>
        </div>

        {/* 品項列表 */}
        <div className="flex-1">
          <div className="divide-y" style={{ borderColor: C.border }}>
            {enrichedItems.map(({ item, qty, isSoldOut, hasOpts, hasSizeOpts, minPrice }) => (
              <ItemCard key={item.id}
                item={item} qty={qty} isSoldOut={isSoldOut}
                hasOpts={hasOpts} hasSizeOpts={hasSizeOpts} minPrice={minPrice}
                onAdd={() => addItem(item.id, item.name, item.price, [])}
                onMinus={() => handleMinus(item.id)}
                onOpenOptions={() => setShowOptions(item)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Mobile 底部 Cart Bar ─────────────────────────── */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-30"
        style={{
          width: '100%', maxWidth: 680,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(12px)',
          borderTop: `1px solid ${C.border}`,
        }}>
        <button
          onClick={() => { if (totalQty > 0) setShowCart(true) }}
          disabled={totalQty === 0}
          className="w-full flex justify-between items-center px-5 py-4 transition-all active:scale-[0.99] disabled:opacity-40"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{ background: totalQty > 0 ? C.primary : C.pill }}>
              🛒
            </div>
            <span className="text-base font-bold" style={{ color: totalQty > 0 ? C.text : C.muted }}>
              {totalQty > 0 ? `查看訂單（${totalQty} 樣）` : '購物車是空的'}
            </span>
          </div>
          {totalQty > 0 && (
            <span className="text-lg font-black" style={{ color: C.primary }}>${total}</span>
          )}
        </button>
      </div>

      {/* ── Mobile Cart Sheet ──────────────────────────── */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end justify-center overlay-enter"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowCart(false) }}>
          <div className="w-full max-w-2xl rounded-t-3xl flex flex-col sheet-enter"
            style={{ background: '#fff', maxHeight: '88vh' }}>
            {/* 拖曳條 */}
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            {/* 標題 */}
            <div className="px-6 pb-3 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold" style={{ color: C.text }}>確認訂單</h2>
              {table === 'takeout' && ticketNumber != null ? (
                <span className="text-sm px-3 py-1 rounded-full font-bold"
                  style={{ background: '#F5C842', color: '#3D2B1F' }}>
                  外帶 #{String(ticketNumber).padStart(3, '0')}
                </span>
              ) : (
                <span className="text-sm px-3 py-1 rounded-full font-medium"
                  style={{ background: C.pill, color: C.sub }}>
                  {table === 'takeout' ? '外帶' : `桌號 ${table}`}
                </span>
              )}
            </div>
            {/* 品項列表 */}
            <div className="flex-1 overflow-y-auto px-6 space-y-3 pb-2">
              {items.map((item, idx) => (
                <CartRow key={idx} item={item} idx={idx}
                  onMinus={() => handleMinus(item.id)}
                  onPlus={() => updateQty(idx, item.qty + 1)}
                />
              ))}
            </div>
            <div className="px-6">
              <CartFooter />
            </div>
          </div>
        </div>
      )}

      {/* ── OptionSheet ────────────────────────────────── */}
      {showOptions && (
        <OptionSheet
          item={showOptions}
          showToppings={TOPPING_CATEGORIES.has(activeCategory)}
          onAdd={handleAddItem}
          onClose={() => setShowOptions(null)}
        />
      )}

      {/* ── LINE Pay spinner ───────────────────────────── */}
      {redirectingToPay && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="w-16 h-16 rounded-full border-4 border-white border-t-transparent animate-spin mb-6" />
          <p className="text-base font-semibold text-white">導向 LINE Pay…</p>
        </div>
      )}

      {/* ── 內用成功（3.5 秒）────────────────────────────── */}
      {submitted && table !== 'takeout' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overlay-enter"
          style={{ background: 'rgba(0,0,0,0.55)' }}>
          <div className="rounded-3xl p-10 text-center mx-6 pop-in" style={{ background: '#fff', minWidth: 240 }}>
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-xl font-bold mb-1" style={{ color: C.text }}>訂單已送出！</h2>
            <p className="text-sm mt-2" style={{ color: C.sub }}>{table} 桌，廚房收到了</p>
            <p className="text-sm mt-1" style={{ color: C.muted }}>請稍候 🍳</p>
          </div>
        </div>
      )}

      {/* ── 外帶號碼單（全屏）──────────────────────────────── */}
      {submitted && table === 'takeout' && (
        <div className="fixed inset-0 z-50 flex flex-col overlay-enter" style={{ background: C.header }}>
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
        style={{ background: '#F7F4F0', color: '#AEAEB2' }}>載入中…</div>
    }>
      <MenuContent />
    </Suspense>
  )
}
