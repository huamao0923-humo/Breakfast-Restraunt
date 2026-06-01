'use client'

import { useState, useEffect } from 'react'

interface ShopSettings {
  is_open: boolean
  closed_message: string
  auto_close_time: string | null
}

const C = {
  bg:       '#F7F4F0',
  card:     '#FFFFFF',
  primary:  '#D97706',
  primaryD: '#B45309',
  text:     '#1C1C1E',
  sub:      '#6B6B6B',
  border:   '#E5E5EA',
  muted:    '#AEAEB2',
}

export default function AdminSettingsPage() {
  const [loading, setLoading]               = useState(true)
  const [saving, setSaving]                 = useState(false)
  const [closedMessage, setClosedMessage]   = useState('')
  const [autoCloseEnabled, setAutoCloseEnabled] = useState(false)
  const [autoCloseTime, setAutoCloseTime]   = useState('')
  const [isOpen, setIsOpen]                 = useState(false)
  const [savedFlash, setSavedFlash]         = useState(false)

  useEffect(() => {
    fetch('/api/shop-settings')
      .then(r => r.json())
      .then((data: ShopSettings) => {
        setClosedMessage(data.closed_message)
        setAutoCloseEnabled(data.auto_close_time !== null)
        setAutoCloseTime(data.auto_close_time ?? '')
        setIsOpen(data.is_open)
      })
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const body = {
        closed_message: closedMessage,
        auto_close_time: autoCloseEnabled && autoCloseTime ? autoCloseTime : null,
      }
      const res = await fetch('/api/shop-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 2000)
      } else {
        alert('儲存失敗')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: C.bg, color: C.muted }}>
        載入中…
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: C.bg, fontFamily: 'system-ui, sans-serif' }}>
      <div className="mx-auto" style={{ maxWidth: 640, padding: '32px 20px 80px' }}>

        <header className="mb-6">
          <h1 className="text-2xl font-bold mb-1" style={{ color: C.text }}>店家設定</h1>
          <p className="text-sm" style={{ color: C.sub }}>未營業文案 · 自動關門時間</p>
        </header>

        {/* 目前營業狀態（唯讀） */}
        <div className="rounded-2xl mb-4 flex items-center justify-between"
          style={{ background: C.card, border: `1px solid ${C.border}`, padding: '16px 20px' }}>
          <div>
            <p className="text-xs font-bold tracking-wider mb-1" style={{ color: C.sub }}>目前狀態</p>
            <p className="text-lg font-bold" style={{ color: isOpen ? '#16A34A' : '#6B7280' }}>
              {isOpen ? '🟢 營業中' : '⚪ 休息中'}
            </p>
          </div>
          <p className="text-xs text-right" style={{ color: C.muted, maxWidth: 180 }}>
            開關營業在「廚房出單」畫面右上角操作
          </p>
        </div>

        {/* 未營業文字 */}
        <section className="rounded-2xl mb-4"
          style={{ background: C.card, border: `1px solid ${C.border}`, padding: '20px' }}>
          <h2 className="text-base font-bold mb-2" style={{ color: C.text }}>未營業時的提示文字</h2>
          <p className="text-xs mb-3" style={{ color: C.sub }}>
            客人在店家未營業時打開點餐頁面，會看到的訊息。可分行（Enter 換行）。
          </p>
          <textarea
            value={closedMessage}
            onChange={(e) => setClosedMessage(e.target.value)}
            rows={4}
            placeholder="目前未營業，請稍後再試"
            className="w-full rounded-xl outline-none transition-all"
            style={{
              border: `1.5px solid ${C.border}`,
              background: C.bg, color: C.text,
              fontSize: 15, lineHeight: 1.7,
              padding: '12px 14px',
              fontFamily: "'Noto Serif TC', serif",
              resize: 'vertical',
            }}
          />

          {/* 預覽 */}
          <div className="mt-3 rounded-xl"
            style={{ background: '#FFFDF7', border: '1.5px dashed #D4B896', padding: '14px 18px' }}>
            <p className="text-xs font-bold mb-2" style={{ color: '#9C7A5A' }}>📱 客人會看到：</p>
            <p style={{ color: '#7A5C3A', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: "'Noto Serif TC', serif" }}>
              {closedMessage || '（請輸入文字）'}
            </p>
          </div>
        </section>

        {/* 自動關門時間 */}
        <section className="rounded-2xl mb-6"
          style={{ background: C.card, border: `1px solid ${C.border}`, padding: '20px' }}>
          <h2 className="text-base font-bold mb-2" style={{ color: C.text }}>自動關門時間</h2>
          <p className="text-xs mb-4" style={{ color: C.sub }}>
            設定後，每天到指定時間自動切回「休息中」。隔天需手動按「開始營業」恢復。
          </p>

          <label className="flex items-center gap-3 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={autoCloseEnabled}
              onChange={(e) => setAutoCloseEnabled(e.target.checked)}
              className="w-5 h-5"
              style={{ accentColor: C.primary }}
            />
            <span className="text-sm font-semibold" style={{ color: C.text }}>啟用自動關門</span>
          </label>

          {autoCloseEnabled && (
            <div className="flex items-center gap-3">
              <input
                type="time"
                value={autoCloseTime}
                onChange={(e) => setAutoCloseTime(e.target.value)}
                className="rounded-xl outline-none"
                style={{
                  border: `1.5px solid ${C.border}`,
                  background: C.bg, color: C.text,
                  fontSize: 16, padding: '10px 14px',
                  fontFamily: 'monospace',
                }}
              />
              <span className="text-sm" style={{ color: C.sub }}>
                每天到了這個時間 → 自動關門
              </span>
            </div>
          )}
        </section>

        {/* 儲存按鈕 */}
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving || (autoCloseEnabled && !autoCloseTime)}
            className="flex-1 rounded-2xl py-4 font-bold text-base transition-all active:scale-[0.98]"
            style={{
              background: saving ? C.muted : C.primary,
              color: '#fff',
              boxShadow: saving ? 'none' : '0 4px 14px rgba(217,119,6,0.3)',
              border: 'none', cursor: saving ? 'wait' : 'pointer',
              opacity: (autoCloseEnabled && !autoCloseTime) ? 0.5 : 1,
            }}>
            {saving ? '儲存中…' : '儲存設定'}
          </button>

          {savedFlash && (
            <span className="text-sm font-semibold" style={{ color: '#16A34A' }}>
              ✓ 已儲存
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
