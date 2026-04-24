'use client'

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export default function QRPage() {
  const [url, setUrl] = useState('')

  // 在 client 端取得完整網址（部署後自動對應正式網域）
  useEffect(() => {
    setUrl(`${window.location.origin}/order`)
  }, [])

  const handlePrint = () => window.print()

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-10"
      style={{ background: '#F7F4F0', fontFamily: "'Noto Serif TC', serif" }}
    >
      {/* 標題 */}
      <h1 className="text-2xl font-bold tracking-[6px] mb-1" style={{ color: '#3D2B1F' }}>
        忠國豆漿
      </h1>
      <p className="text-xs tracking-[2px] mb-10" style={{ color: '#9C7A5A' }}>
        掃描 QR Code 開始點餐
      </p>

      {/* QR Code 卡片 */}
      <div
        className="rounded-3xl p-8 flex flex-col items-center gap-6 mb-8"
        style={{
          background: '#FFFDF7',
          boxShadow: '0 4px 24px rgba(92,61,46,0.12)',
          border: '1px solid #E8DDD0',
        }}
      >
        {url ? (
          <QRCodeSVG
            value={url}
            size={220}
            bgColor="#FFFDF7"
            fgColor="#3D2B1F"
            level="M"
          />
        ) : (
          <div
            className="flex items-center justify-center"
            style={{ width: 220, height: 220, color: '#C9A97A', fontSize: 14 }}
          >
            載入中…
          </div>
        )}

        {/* 裝飾文字 */}
        <div className="text-center">
          <p className="text-base font-bold tracking-[2px]" style={{ color: '#5C3D2E' }}>
            掃我點餐 🍳
          </p>
          <p className="text-xs mt-1" style={{ color: '#9C7A5A' }}>
            外帶 / 內用皆可
          </p>
        </div>
      </div>

      {/* 網址顯示 */}
      {url && (
        <p
          className="text-xs text-center mb-6 px-4 py-2 rounded-xl break-all"
          style={{ background: '#EDE5D8', color: '#7A5240', maxWidth: 280 }}
        >
          {url}
        </p>
      )}

      {/* 按鈕列 */}
      <div className="flex gap-3 w-full max-w-xs">
        <button
          onClick={handlePrint}
          className="flex-1 rounded-xl py-3.5 text-sm font-bold tracking-[2px] transition-all active:scale-[0.97]"
          style={{ background: '#5C3D2E', color: '#F5E6C8' }}
        >
          列印 QR Code
        </button>
        <a
          href="/order"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-xl py-3.5 text-sm font-bold tracking-[2px] text-center transition-all active:scale-[0.97]"
          style={{ background: '#FFFDF7', color: '#5C3D2E', border: '1.5px solid #D4B896' }}
        >
          預覽頁面
        </a>
      </div>

      {/* 列印時只顯示 QR Code */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); }
        }
      `}</style>
    </div>
  )
}
