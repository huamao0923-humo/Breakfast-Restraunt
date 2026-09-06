'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useShopStatus } from '@/hooks/useShopStatus'
import { ShopClosedOverlay } from '@/components/ShopClosedOverlay'

const TABLES = [1, 2, 3, 4, 5]

type Step = 'choose' | 'table' | 'online'

export default function OrderLandingPage() {
  const router = useRouter()
  const shop   = useShopStatus()
  const [step, setStep] = useState<Step>('choose')
  const [customerName, setCustomerName]   = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})

  if (shop.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen"
        style={{ background: '#F7F4F0', color: '#9C7A5A', fontFamily: "'Noto Serif TC', serif", fontSize: 18 }}>
        載入中…
      </div>
    )
  }

  if (!shop.isOpen) {
    return <ShopClosedOverlay message={shop.closedMessage} />
  }

  const goTakeout = () => router.push('/menu?table=takeout')
  const goDineIn  = () => setStep('table')
  const goTable   = (n: number) => router.push(`/menu?table=${n}`)

  const validateOnline = () => {
    const e: { name?: string; phone?: string } = {}
    if (!customerName.trim()) e.name = '請填寫稱呼'
    if (!customerPhone.trim()) e.phone = '請填寫電話號碼'
    else if (!/^[0-9\-+\s]{7,15}$/.test(customerPhone.trim())) e.phone = '請輸入有效電話號碼'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const goOnline = () => {
    if (!validateOnline()) return
    router.push(`/menu?table=online&customer_name=${encodeURIComponent(customerName.trim())}&customer_phone=${encodeURIComponent(customerPhone.trim())}`)
  }

  return (
    <div
      className="flex items-center justify-center min-h-screen px-6"
      style={{ background: '#F7F4F0', fontFamily: "'Noto Serif TC', serif" }}
    >
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-[8px] mb-2" style={{ color: '#3D2B1F' }}>
            忠國豆漿
          </h1>
          <p className="text-base tracking-[2px]" style={{ color: '#9C7A5A' }}>
            手工現做・新鮮美味
          </p>
        </div>

        {/* ── Step 1：選擇用餐方式 ── */}
        {step === 'choose' && (
          <>
            <p className="text-center text-lg font-semibold mb-6" style={{ color: '#5C3D2E' }}>
              請選擇用餐方式
            </p>

            <div className="flex flex-col gap-4">
              <button
                onClick={() => setStep('online')}
                className="w-full rounded-2xl py-6 flex flex-col items-center gap-2 transition-all active:scale-[0.97]"
                style={{
                  background: '#FFFDF7',
                  border: '2px solid #A8926E',
                  boxShadow: '0 2px 8px rgba(92,61,46,0.08)',
                }}
              >
                <span className="text-5xl">📱</span>
                <span className="text-2xl font-bold tracking-[4px]" style={{ color: '#3D2B1F' }}>
                  線上自取
                </span>
                <span className="text-base" style={{ color: '#9C7A5A' }}>
                  【在家預定餐點請點我】
                </span>
              </button>

              <button
                onClick={goTakeout}
                className="w-full rounded-2xl py-6 flex flex-col items-center gap-2 transition-all active:scale-[0.97]"
                style={{
                  background: '#FFFDF7',
                  border: '2px solid #D4B896',
                  boxShadow: '0 2px 8px rgba(92,61,46,0.08)',
                }}
              >
                <span className="text-5xl">🛍️</span>
                <span className="text-2xl font-bold tracking-[4px]" style={{ color: '#3D2B1F' }}>
                  現場外帶
                </span>
                <span className="text-base" style={{ color: '#9C7A5A' }}>
                  現場點餐專用!
                </span>
              </button>

              <button
                onClick={goDineIn}
                className="w-full rounded-2xl py-6 flex flex-col items-center gap-2 transition-all active:scale-[0.97]"
                style={{
                  background: '#FFFDF7',
                  border: '2px solid #D4B896',
                  boxShadow: '0 2px 8px rgba(92,61,46,0.08)',
                }}
              >
                <span className="text-5xl">🍽️</span>
                <span className="text-2xl font-bold tracking-[4px]" style={{ color: '#3D2B1F' }}>
                  內用
                </span>
                <span className="text-base" style={{ color: '#9C7A5A' }}>
                  選擇桌號，輕鬆享用
                </span>
              </button>
            </div>
          </>
        )}

        {/* ── Step 2：選擇桌號 ── */}
        {step === 'table' && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setStep('choose')}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background: '#EDE5D8', color: '#5C3D2E', fontSize: 20 }}
              >
                ‹
              </button>
              <p className="text-lg font-semibold" style={{ color: '#5C3D2E' }}>
                請選擇桌號
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {TABLES.map((n) => (
                <button
                  key={n}
                  onClick={() => goTable(n)}
                  className="rounded-2xl py-6 flex flex-col items-center gap-1 transition-all active:scale-95"
                  style={{
                    background: '#FFFDF7',
                    border: '2px solid #D4B896',
                    boxShadow: '0 2px 6px rgba(92,61,46,0.07)',
                  }}
                >
                  <span className="text-4xl font-black" style={{ color: '#5C3D2E' }}>{n}</span>
                  <span className="text-sm" style={{ color: '#9C7A5A' }}>桌</span>
                </button>
              ))}
            </div>

            <p className="text-center text-sm mt-6" style={{ color: '#C9A97A' }}>
              選錯了？點左上角返回重選
            </p>
          </>
        )}

        {/* ── Step 3：線上自取填寫資料 ── */}
        {step === 'online' && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => { setStep('choose'); setErrors({}) }}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background: '#EDE5D8', color: '#5C3D2E', fontSize: 20 }}
              >
                ‹
              </button>
              <p className="text-lg font-semibold" style={{ color: '#5C3D2E' }}>
                線上點餐自取
              </p>
            </div>

            <p className="text-base mb-6" style={{ color: '#7A5C3A' }}>
              請填寫基本資料，方便我們準備餐點並通知您
            </p>

            <div className="flex flex-col gap-4">
              {/* 稱呼 */}
              <div>
                <label className="text-base font-semibold block mb-1.5" style={{ color: '#5C3D2E' }}>
                  稱呼
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => { setCustomerName(e.target.value); setErrors(v => ({ ...v, name: undefined })) }}
                  placeholder="例：王小明"
                  className="w-full rounded-xl px-4 py-3 text-lg outline-none transition-all"
                  style={{
                    border: `2px solid ${errors.name ? '#EF4444' : '#D4B896'}`,
                    background: '#FFFDF7',
                    color: '#3D2B1F',
                    fontFamily: "'Noto Serif TC', serif",
                  }}
                />
                {errors.name && (
                  <p className="text-sm mt-1" style={{ color: '#EF4444' }}>{errors.name}</p>
                )}
              </div>

              {/* 電話 */}
              <div>
                <label className="text-base font-semibold block mb-1.5" style={{ color: '#5C3D2E' }}>
                  電話號碼
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => { setCustomerPhone(e.target.value); setErrors(v => ({ ...v, phone: undefined })) }}
                  placeholder="例：0912-345-678"
                  className="w-full rounded-xl px-4 py-3 text-lg outline-none transition-all"
                  style={{
                    border: `2px solid ${errors.phone ? '#EF4444' : '#D4B896'}`,
                    background: '#FFFDF7',
                    color: '#3D2B1F',
                    fontFamily: "'Noto Serif TC', serif",
                  }}
                />
                {errors.phone && (
                  <p className="text-sm mt-1" style={{ color: '#EF4444' }}>{errors.phone}</p>
                )}
              </div>

              <button
                onClick={goOnline}
                className="w-full rounded-2xl py-4 font-bold text-lg tracking-[4px] transition-all active:scale-[0.97] mt-2"
                style={{ background: '#5C3D2E', color: '#F5E6C8', boxShadow: '0 4px 16px rgba(92,61,46,0.25)' }}
              >
                開始點餐
              </button>
            </div>

            <p className="text-center text-sm mt-5" style={{ color: '#C9A97A' }}>
              完成點餐後將發放取餐號碼牌
            </p>
          </>
        )}
      </div>
    </div>
  )
}
