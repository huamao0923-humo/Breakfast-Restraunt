'use client'

import { useState, useEffect } from 'react'

interface ShopSettings {
  is_open: boolean
  closed_message: string
  auto_open_time: string | null
  auto_close_time: string | null
  off_weekdays: number[]
  holidays: string[]
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

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export default function AdminSettingsPage() {
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const [isOpen, setIsOpen]                 = useState(false)
  const [closedMessage, setClosedMessage]   = useState('')
  const [autoOpenEnabled, setAutoOpenEnabled]   = useState(false)
  const [autoOpenTime, setAutoOpenTime]     = useState('05:30')
  const [autoCloseEnabled, setAutoCloseEnabled] = useState(false)
  const [autoCloseTime, setAutoCloseTime]   = useState('')
  const [offWeekdays, setOffWeekdays]       = useState<number[]>([])
  const [holidays, setHolidays]             = useState<string[]>([])
  const [newHoliday, setNewHoliday]         = useState('')

  useEffect(() => {
    fetch('/api/shop-settings')
      .then(r => r.json())
      .then((data: ShopSettings) => {
        setIsOpen(data.is_open)
        setClosedMessage(data.closed_message)
        setAutoOpenEnabled(data.auto_open_time !== null)
        setAutoOpenTime(data.auto_open_time ?? '05:30')
        setAutoCloseEnabled(data.auto_close_time !== null)
        setAutoCloseTime(data.auto_close_time ?? '')
        setOffWeekdays(Array.isArray(data.off_weekdays) ? data.off_weekdays : [])
        setHolidays(Array.isArray(data.holidays) ? data.holidays : [])
      })
      .finally(() => setLoading(false))
  }, [])

  const toggleWeekday = (d: number) =>
    setOffWeekdays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a, b) => a - b))

  const addHoliday = () => {
    if (!newHoliday) return
    if (!holidays.includes(newHoliday)) setHolidays(prev => [...prev, newHoliday].sort())
    setNewHoliday('')
  }
  const removeHoliday = (d: string) => setHolidays(prev => prev.filter(x => x !== d))

  const save = async () => {
    setSaving(true)
    try {
      const body = {
        closed_message: closedMessage,
        auto_open_time:  autoOpenEnabled && autoOpenTime  ? autoOpenTime  : null,
        auto_close_time: autoCloseEnabled && autoCloseTime ? autoCloseTime : null,
        off_weekdays: offWeekdays,
        holidays,
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

  const invalid = (autoOpenEnabled && !autoOpenTime) || (autoCloseEnabled && !autoCloseTime)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: C.bg, color: C.muted }}>
        載入中…
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: C.bg, fontFamily: 'system-ui, sans-serif' }}>
      <div className="mx-auto" style={{ maxWidth: 640, padding: '32px 20px 100px' }}>

        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: C.text }}>店家設定</h1>
            <p className="text-sm" style={{ color: C.sub }}>營業時間 · 公休日 · 未營業文案</p>
          </div>
          <a href="/" className="text-sm rounded-full px-4 py-2"
            style={{ color: C.sub, border: `1px solid ${C.border}`, textDecoration: 'none' }}>← 後台</a>
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
          <p className="text-xs text-right" style={{ color: C.muted, maxWidth: 190 }}>
            手動開關營業在「廚房出單」或後台首頁操作
          </p>
        </div>

        {/* 營業時間 */}
        <section className="rounded-2xl mb-4"
          style={{ background: C.card, border: `1px solid ${C.border}`, padding: '20px' }}>
          <h2 className="text-base font-bold mb-1" style={{ color: C.text }}>自動營業時間</h2>
          <p className="text-xs mb-4" style={{ color: C.sub }}>
            每天到「開店時間」自動開始營業、到「關店時間」自動休息。公休日不會自動開店。
          </p>

          {/* 自動開店 */}
          <label className="flex items-center gap-3 mb-3 cursor-pointer">
            <input type="checkbox" checked={autoOpenEnabled}
              onChange={(e) => setAutoOpenEnabled(e.target.checked)}
              className="w-5 h-5" style={{ accentColor: C.primary }} />
            <span className="text-sm font-semibold" style={{ color: C.text }}>自動開店</span>
          </label>
          {autoOpenEnabled && (
            <div className="flex items-center gap-3 mb-5 pl-8">
              <input type="time" value={autoOpenTime}
                onChange={(e) => setAutoOpenTime(e.target.value)}
                className="rounded-xl outline-none"
                style={{ border: `1.5px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 16, padding: '10px 14px', fontFamily: 'monospace' }} />
              <span className="text-sm" style={{ color: C.sub }}>每天此時間自動開始營業</span>
            </div>
          )}

          {/* 自動關店 */}
          <label className="flex items-center gap-3 mb-3 cursor-pointer">
            <input type="checkbox" checked={autoCloseEnabled}
              onChange={(e) => setAutoCloseEnabled(e.target.checked)}
              className="w-5 h-5" style={{ accentColor: C.primary }} />
            <span className="text-sm font-semibold" style={{ color: C.text }}>自動關店</span>
          </label>
          {autoCloseEnabled && (
            <div className="flex items-center gap-3 pl-8">
              <input type="time" value={autoCloseTime}
                onChange={(e) => setAutoCloseTime(e.target.value)}
                className="rounded-xl outline-none"
                style={{ border: `1.5px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 16, padding: '10px 14px', fontFamily: 'monospace' }} />
              <span className="text-sm" style={{ color: C.sub }}>每天此時間自動休息</span>
            </div>
          )}
        </section>

        {/* 每週公休日 */}
        <section className="rounded-2xl mb-4"
          style={{ background: C.card, border: `1px solid ${C.border}`, padding: '20px' }}>
          <h2 className="text-base font-bold mb-1" style={{ color: C.text }}>每週固定公休</h2>
          <p className="text-xs mb-4" style={{ color: C.sub }}>
            選取的星期幾整天不自動開店（仍可在廚房畫面手動臨時開店）。
          </p>
          <div className="flex gap-2 flex-wrap">
            {WEEKDAYS.map((label, d) => {
              const on = offWeekdays.includes(d)
              return (
                <button key={d} onClick={() => toggleWeekday(d)}
                  className="rounded-xl font-bold transition-all active:scale-95"
                  style={{
                    width: 44, height: 44,
                    background: on ? C.primary : C.bg,
                    color: on ? '#fff' : C.sub,
                    border: `2px solid ${on ? C.primary : C.border}`,
                    cursor: 'pointer', fontSize: 15,
                  }}>
                  {label}
                </button>
              )
            })}
          </div>
          <p className="text-xs mt-3" style={{ color: C.muted }}>
            {offWeekdays.length > 0
              ? `公休：每週 ${offWeekdays.map(d => WEEKDAYS[d]).join('、')}`
              : '目前沒有固定公休日'}
          </p>
        </section>

        {/* 特定休假日 */}
        <section className="rounded-2xl mb-6"
          style={{ background: C.card, border: `1px solid ${C.border}`, padding: '20px' }}>
          <h2 className="text-base font-bold mb-1" style={{ color: C.text }}>特定休假日</h2>
          <p className="text-xs mb-4" style={{ color: C.sub }}>
            一次性休假（如過年、臨時公休）。當天整天不自動開店。
          </p>

          <div className="flex items-center gap-2 mb-3">
            <input type="date" value={newHoliday}
              onChange={(e) => setNewHoliday(e.target.value)}
              className="rounded-xl outline-none flex-1"
              style={{ border: `1.5px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 15, padding: '10px 14px' }} />
            <button onClick={addHoliday} disabled={!newHoliday}
              className="rounded-xl font-bold transition-all active:scale-95"
              style={{ background: newHoliday ? C.primary : C.muted, color: '#fff', padding: '11px 18px', border: 'none', cursor: newHoliday ? 'pointer' : 'not-allowed', fontSize: 14 }}>
              加入
            </button>
          </div>

          {holidays.length > 0 ? (
            <div className="flex flex-col gap-2">
              {holidays.map(d => (
                <div key={d} className="flex items-center justify-between rounded-xl"
                  style={{ background: C.bg, border: `1px solid ${C.border}`, padding: '10px 14px' }}>
                  <span className="text-sm font-medium" style={{ color: C.text }}>📅 {d}</span>
                  <button onClick={() => removeHoliday(d)}
                    className="text-xs rounded-full px-3 py-1 transition active:scale-95"
                    style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer' }}>
                    移除
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs" style={{ color: C.muted }}>目前沒有設定特定休假日</p>
          )}
        </section>

        {/* 未營業文字 */}
        <section className="rounded-2xl mb-6"
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
          <div className="mt-3 rounded-xl"
            style={{ background: '#FFFDF7', border: '1.5px dashed #D4B896', padding: '14px 18px' }}>
            <p className="text-xs font-bold mb-2" style={{ color: '#9C7A5A' }}>📱 客人會看到：</p>
            <p style={{ color: '#7A5C3A', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: "'Noto Serif TC', serif" }}>
              {closedMessage || '（請輸入文字）'}
            </p>
          </div>
        </section>

        {/* 儲存按鈕（固定底部） */}
        <div className="fixed bottom-0 left-0 right-0 flex items-center gap-3"
          style={{ background: C.bg, borderTop: `1px solid ${C.border}`, padding: '12px 20px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="mx-auto flex items-center gap-3" style={{ maxWidth: 640, width: '100%' }}>
            <button
              onClick={save}
              disabled={saving || invalid}
              className="flex-1 rounded-2xl py-4 font-bold text-base transition-all active:scale-[0.98]"
              style={{
                background: saving || invalid ? C.muted : C.primary,
                color: '#fff',
                boxShadow: saving || invalid ? 'none' : '0 4px 14px rgba(217,119,6,0.3)',
                border: 'none', cursor: saving ? 'wait' : 'pointer',
              }}>
              {saving ? '儲存中…' : '儲存設定'}
            </button>
            {savedFlash && (
              <span className="text-sm font-semibold whitespace-nowrap" style={{ color: '#16A34A' }}>✓ 已儲存</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
