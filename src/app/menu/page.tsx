// Path: src/app/menu/page.tsx
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useCart } from '@/hooks/useCart'
import { OptionSheet } from '@/components/OptionSheet'
import { TOPPING_CATEGORIES } from '@/lib/toppings'
import type { MenuItem, CartItemOption, MenuCategory } from '@/types'

export const dynamic = 'force-dynamic'

function MenuContent() {
  const searchParams = useSearchParams()
  const table = searchParams.get('table') || 'A1'

  const [menuData, setMenuData]       = useState<MenuCategory[]>([])
  const [menuLoading, setMenuLoading] = useState(true)
  const [soldOut, setSoldOut]         = useState<string[]>([])
  const [showOptions, setShowOptions] = useState<MenuItem | null>(null)
  const [activeCategory, setActiveCategory] = useState('')

  // 確認 modal
  const [showConfirm, setShowConfirm] = useState(false)
  const [orderNote, setOrderNote]     = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [submitted, setSubmitted]     = useState(false)

  const { items, addItem, removeItem, updateQty, clearCart, total } = useCart()

  // ── 載入菜單 ─────────────────────────────────────────
  useEffect(() => {
    fetch('/api/menu')
      .then((res) => res.json())
      .then((data: MenuCategory[]) => {
        setMenuData(data)
        if (data.length > 0) setActiveCategory(data[0].category)
      })
      .catch(() => setMenuData([]))
      .finally(() => setMenuLoading(false))
  }, [])

  // ── 訂閱售罄狀態 ─────────────────────────────────────
  useEffect(() => {
    const es = new EventSource('/api/events?channel=menu-updates')
    es.addEventListener('sold-out-update', (e) => {
      setSoldOut(JSON.parse(e.data).soldOut)
    })
    return () => es.close()
  }, [])

  // ── 加入購物車（有選項）──────────────────────────────
  const handleAddItem = (options: CartItemOption[]) => {
    if (!showOptions) return
    addItem(showOptions.id, showOptions.name, showOptions.price, options)
    setShowOptions(null)
  }

  // ── 取得某品項總數量 ──────────────────────────────────
  const getItemQty = (itemId: string) =>
    items.filter((c) => c.id === itemId).reduce((sum, c) => sum + c.qty, 0)

  // ── 減少數量 ─────────────────────────────────────────
  const handleMinus = (itemId: string) => {
    const matched = items
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.id === itemId)
    if (matched.length === 0) return
    const last = matched[matched.length - 1]
    if (last.c.qty > 1) {
      updateQty(last.i, last.c.qty - 1)
    } else {
      removeItem(last.i)
    }
  }

  // ── 送出訂單 ─────────────────────────────────────────
  const handleSubmitOrder = async () => {
    if (items.length === 0) return
    setSubmitting(true)
    try {
      const formattedItems = items.map((i) => ({
        id: i.id,
        name: i.name,
        qty: i.qty,
        price: i.price + i.options.reduce((s, o) => s + o.price_delta, 0),
        options: i.options,
      }))
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: table,
          items: formattedItems,
          total,
          note: orderNote || null,
        }),
      })
      if (res.ok) {
        setShowConfirm(false)
        setSubmitted(true)
        clearCart()
        setTimeout(() => {
          setSubmitted(false)
          setOrderNote('')
        }, 3000)
      }
    } catch (e) {
      console.error('送出訂單失敗', e)
    } finally {
      setSubmitting(false)
    }
  }

  const activeCat = menuData.find((c) => c.category === activeCategory)
  const totalQty  = items.reduce((s, i) => s + i.qty, 0)

  if (menuLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: '#FFFDF7', fontFamily: "'Noto Serif TC', serif", color: '#9C7A5A' }}
      >
        載入中...
      </div>
    )
  }

  return (
    /* 外層：整頁背景 + flex 置中 */
    <div className="flex justify-center min-h-screen" style={{ background: '#E8DDD0', fontFamily: "'Noto Serif TC', serif" }}>

      {/* 內層：最大寬度欄位 */}
      <div className="w-full max-w-2xl flex flex-col relative" style={{ background: '#FFFDF7', minHeight: '100vh', borderLeft: '1px solid #D4B896', borderRight: '1px solid #D4B896' }}>

        {/* ── Header ────────────────────────────────────── */}
        <div className="px-5 pt-5 pb-0" style={{ background: '#5C3D2E' }}>
          <h1 className="text-2xl font-bold tracking-[6px] text-center" style={{ color: '#F5E6C8' }}>
            忠國豆漿
          </h1>
          <p className="text-xs tracking-[2px] text-center mt-1.5 mb-3.5" style={{ color: '#C9A97A' }}>
            桌號 {table} ・ 手工現做
          </p>

          {/* 分類 Tabs */}
          <div className="flex border-t pt-2 gap-0.5 overflow-x-auto scrollbar-none" style={{ borderColor: '#7A5240' }}>
            {menuData.map((cat) => {
              const isOn = cat.category === activeCategory
              return (
                <button
                  key={cat.category}
                  onClick={() => setActiveCategory(cat.category)}
                  className="py-2 px-3 text-xs tracking-wide rounded-t-md transition-all duration-150 whitespace-nowrap shrink-0"
                  style={{
                    background: isOn ? '#FFFDF7' : 'transparent',
                    color: isOn ? '#3D2B1F' : '#F5E6C8',
                    fontWeight: isOn ? 700 : 400,
                    fontFamily: "'Noto Serif TC', serif",
                  }}
                >
                  {cat.category}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── 品項列表 ──────────────────────────────────── */}
        <div className="flex-1 pb-24">
          {activeCat && (
            <>
              <div
                className="text-xs font-bold tracking-[4px] px-5 py-3 border-b border-dashed"
                style={{ color: '#9C7A5A', borderColor: '#E0D4C0' }}
              >
                {activeCat.category}
              </div>

              {activeCat.items.map((item) => {
                const qty = getItemQty(item.id)
                const isSoldOut = soldOut.includes(item.id)
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-5 py-[18px] border-b"
                    style={{ borderColor: '#F5EFE6' }}
                  >
                    {/* 名稱 */}
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm leading-snug" style={{ color: '#3D2B1F' }}>{item.name}</span>
                        {(item.options.length > 0 || TOPPING_CATEGORIES.has(activeCategory)) && !isSoldOut && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide"
                            style={{ background: '#F0E8DC', color: '#9C7A5A' }}
                          >
                            可選
                          </span>
                        )}
                        {isSoldOut && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{ background: '#F0E8DC', color: '#B0A090' }}
                          >
                            售罄
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 價格 + 加減 */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold min-w-[40px] text-right" style={{ color: '#8B5E3C' }}>
                        ${item.price}
                      </span>

                      {!isSoldOut && (
                        <div className="flex items-center gap-2">
                          {/* 減號：只在有數量時顯示 */}
                          {qty > 0 && (
                            <button
                              onClick={() => handleMinus(item.id)}
                              className="w-8 h-8 rounded border text-base cursor-pointer font-bold flex items-center justify-center"
                              style={{ borderColor: '#D4B896', background: '#FFFDF7', color: '#8B5E3C' }}
                            >
                              −
                            </button>
                          )}

                          {/* 數量 */}
                          {qty > 0 && (
                            <span
                              className="text-sm font-bold min-w-[20px] text-center"
                              style={{ color: '#5C3D2E' }}
                            >
                              {qty}
                            </span>
                          )}

                          {/* 加號 */}
                          <button
                            onClick={() => {
                              const hasToppings = TOPPING_CATEGORIES.has(activeCategory)
                              if (item.options.length === 0 && !hasToppings) {
                                addItem(item.id, item.name, item.price, [])
                              } else {
                                setShowOptions(item)
                              }
                            }}
                            className="w-8 h-8 rounded border text-base cursor-pointer font-bold flex items-center justify-center"
                            style={{ borderColor: '#D4B896', background: '#FFFDF7', color: '#8B5E3C' }}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* ── Cart Bar（底部固定）────────────────────────── */}
        <div
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl border-t border-dashed px-[18px] py-3.5"
          style={{ background: '#FFFDF7', borderColor: '#C9A97A' }}
        >
          <button
            onClick={() => { if (totalQty > 0) setShowConfirm(true) }}
            disabled={totalQty === 0}
            className="w-full rounded-lg py-3.5 text-base font-bold tracking-[3px] flex justify-between items-center disabled:opacity-40"
            style={{ background: '#5C3D2E', color: '#F5E6C8', fontFamily: "'Noto Serif TC', serif" }}
          >
            <span>查看訂單</span>
            <span className="text-xs" style={{ color: '#C9A97A' }}>
              {totalQty} 樣・${total}
            </span>
          </button>
        </div>
      </div>

      {/* ── 選項 Sheet ─────────────────────────────────── */}
      {showOptions && (
        <OptionSheet
          item={showOptions}
          showToppings={TOPPING_CATEGORIES.has(activeCategory)}
          onAdd={handleAddItem}
          onClose={() => setShowOptions(null)}
        />
      )}

      {/* ── 確認訂單 Modal ─────────────────────────────── */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', fontFamily: "'Noto Serif TC', serif" }}
        >
          <div
            className="w-full max-w-2xl rounded-t-2xl pt-6 px-5 pb-8"
            style={{ background: '#FFFDF7' }}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold tracking-wider" style={{ color: '#3D2B1F' }}>
                確認訂單
              </h2>
              <span className="text-xs" style={{ color: '#9C7A5A' }}>桌號 {table}</span>
            </div>

            {/* 品項清單 */}
            <div className="mb-1 max-h-[40vh] overflow-y-auto">
              {items.map((item, i) => {
                const unitPrice = item.price + item.options.reduce((s, o) => s + o.price_delta, 0)
                return (
                  <div
                    key={i}
                    className="flex justify-between items-start py-3 border-b"
                    style={{ borderColor: '#F0E8DC' }}
                  >
                    <div className="flex-1 pr-3">
                      <span className="text-sm" style={{ color: '#3D2B1F' }}>{item.name}</span>
                      {item.options.length > 0 && (
                        <span className="text-xs ml-1.5" style={{ color: '#9C7A5A' }}>
                          （{item.options.map((o) => o.label).join('、')}）
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs" style={{ color: '#B0A090' }}>×{item.qty}　</span>
                      <span className="text-sm font-bold" style={{ color: '#8B5E3C' }}>
                        ${unitPrice * item.qty}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 合計 */}
            <div
              className="flex justify-between items-center py-3.5 mb-4"
              style={{ borderTop: '1px solid #D4B896' }}
            >
              <span className="font-bold tracking-wide" style={{ color: '#3D2B1F' }}>合計</span>
              <span className="text-xl font-bold" style={{ color: '#5C3D2E' }}>${total}</span>
            </div>

            {/* 備註 */}
            <input
              type="text"
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              placeholder="備註（例：不加蔥、少辣）"
              className="w-full rounded-lg px-3 py-2.5 mb-5 text-sm focus:outline-none"
              style={{
                border: '1px solid #D4B896',
                background: '#FFFDF7',
                color: '#3D2B1F',
                fontFamily: "'Noto Serif TC', serif",
              }}
            />

            {/* 按鈕 */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-lg text-sm font-bold tracking-wide"
                style={{
                  border: '1px solid #D4B896',
                  color: '#8B5E3C',
                  background: 'transparent',
                  fontFamily: "'Noto Serif TC', serif",
                }}
              >
                返回修改
              </button>
              <button
                onClick={handleSubmitOrder}
                disabled={submitting}
                className="py-3 rounded-lg text-sm font-bold tracking-[2px] disabled:opacity-50"
                style={{
                  flex: 2,
                  background: '#5C3D2E',
                  color: '#F5E6C8',
                  fontFamily: "'Noto Serif TC', serif",
                }}
              >
                {submitting ? '送出中...' : '確認送出'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 送出成功 Overlay ───────────────────────────── */}
      {submitted && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', fontFamily: "'Noto Serif TC', serif" }}
        >
          <div className="rounded-2xl p-10 text-center" style={{ background: '#FFFDF7' }}>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold tracking-wide mb-2" style={{ color: '#3D2B1F' }}>
              訂單已送出
            </h2>
            <p className="text-sm" style={{ color: '#9C7A5A' }}>廚房收到了，請稍候</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex items-center justify-center min-h-screen"
          style={{ background: '#FFFDF7', fontFamily: "'Noto Serif TC', serif" }}
        >
          載入中...
        </div>
      }
    >
      <MenuContent />
    </Suspense>
  )
}
