'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const TABLES = [1, 2, 3, 4, 5]

type Step = 'choose' | 'table'

export default function OrderLandingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('choose')

  const goTakeout = () => {
    router.push('/menu?table=takeout')
  }

  const goDineIn = () => {
    setStep('table')
  }

  const goTable = (n: number) => {
    router.push(`/menu?table=${n}`)
  }

  return (
    <div
      className="flex items-center justify-center min-h-screen px-6"
      style={{ background: '#F7F4F0', fontFamily: "'Noto Serif TC', serif" }}
    >
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-[8px] mb-2" style={{ color: '#3D2B1F' }}>
            忠國豆漿
          </h1>
          <p className="text-sm tracking-[2px]" style={{ color: '#9C7A5A' }}>
            手工現做・新鮮美味
          </p>
        </div>

        {/* ── Step 1：選擇外帶 / 內用 ── */}
        {step === 'choose' && (
          <>
            <p className="text-center text-base font-semibold mb-6" style={{ color: '#5C3D2E' }}>
              請選擇用餐方式
            </p>

            <div className="flex flex-col gap-4">
              {/* 外帶 */}
              <button
                onClick={goTakeout}
                className="w-full rounded-2xl py-6 flex flex-col items-center gap-2 transition-all active:scale-[0.97]"
                style={{ background: '#5C3D2E', boxShadow: '0 4px 16px rgba(92,61,46,0.25)' }}
              >
                <span className="text-4xl">🛍️</span>
                <span className="text-xl font-bold tracking-[4px]" style={{ color: '#F5E6C8' }}>
                  外帶
                </span>
                <span className="text-xs" style={{ color: '#C9A97A' }}>
                  取餐後直接走
                </span>
              </button>

              {/* 內用 */}
              <button
                onClick={goDineIn}
                className="w-full rounded-2xl py-6 flex flex-col items-center gap-2 transition-all active:scale-[0.97]"
                style={{
                  background: '#FFFDF7',
                  border: '2px solid #D4B896',
                  boxShadow: '0 2px 8px rgba(92,61,46,0.08)',
                }}
              >
                <span className="text-4xl">🍽️</span>
                <span className="text-xl font-bold tracking-[4px]" style={{ color: '#3D2B1F' }}>
                  內用
                </span>
                <span className="text-xs" style={{ color: '#9C7A5A' }}>
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
                style={{ background: '#EDE5D8', color: '#5C3D2E', fontSize: 18 }}
              >
                ‹
              </button>
              <p className="text-base font-semibold" style={{ color: '#5C3D2E' }}>
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
                  <span className="text-3xl font-black" style={{ color: '#5C3D2E' }}>{n}</span>
                  <span className="text-xs" style={{ color: '#9C7A5A' }}>桌</span>
                </button>
              ))}
            </div>

            <p className="text-center text-xs mt-6" style={{ color: '#C9A97A' }}>
              選錯了？點左上角返回重選
            </p>
          </>
        )}
      </div>
    </div>
  )
}
