'use client'

import { useEffect, useState } from 'react'
import { useShopStatus } from '@/hooks/useShopStatus'

export const dynamic = 'force-dynamic'

const C = {
  bg:       '#F7F2EB',
  card:     '#FFFFFF',
  primary:  '#5C3D2E',
  primaryD: '#3D2B1F',
  accent:   '#D97706',
  text:     '#3D2B1F',
  sub:      '#7A5C3A',
  muted:    '#9C7A5A',
  border:   '#E5DDD0',
  header:   '#FFDDA9',
}

interface Stats {
  today_order_count: number
  today_revenue: number
  pending_count: number
}

const NAV_ITEMS = [
  { href: '/kitchen',        icon: '🍳', title: '廚房出單',   desc: '接單、列印、開關店',           tone: '#16A34A' },
  { href: '/admin/menu',     icon: '🍱', title: '菜單管理',   desc: '新增/編輯/售罄/排序',          tone: '#D97706' },
  { href: '/admin/settings', icon: '⚙️', title: '店家設定',   desc: '未營業文案、自動關門',         tone: '#7C3AED' },
  { href: '/report',         icon: '📊', title: '營收報表',   desc: '歷史訂單、銷售統計',           tone: '#2563EB' },
  { href: '/qr',             icon: '📱', title: '點餐 QR',     desc: '貼桌上的 QR Code',              tone: '#0891B2' },
  { href: '/order',          icon: '👀', title: '客人端預覽', desc: '看客人看到的點餐畫面',         tone: '#A0522D' },
  { href: '/printer-test',   icon: '🖨️', title: '印表機測試', desc: '設定/校正/測試新印表機',       tone: '#6B7280' },
]

export default function HomePage() {
  const shop = useShopStatus()

  const [authed, setAuthed]     = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [password, setPassword] = useState('')
  const [pwError, setPwError]   = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)
  const [stats, setStats]       = useState<Stats | null>(null)

  // 初次載入：檢查 sessionStorage 看本次瀏覽器分頁是否已驗證
  useEffect(() => {
    const saved = sessionStorage.getItem('humo-admin-pw')
    if (saved) {
      verifyAndFetch(saved).then((ok) => {
        if (ok) setAuthed(true)
        else sessionStorage.removeItem('humo-admin-pw')
        setAuthChecked(true)
      })
    } else {
      setAuthChecked(true)
    }
  }, [])

  const verifyAndFetch = async (pw: string): Promise<boolean> => {
    const res = await fetch(`/api/admin/stats?password=${encodeURIComponent(pw)}`)
    if (!res.ok) return false
    setStats(await res.json())
    return true
  }

  const handleLogin = async () => {
    setLoggingIn(true)
    setPwError(false)
    const ok = await verifyAndFetch(password)
    if (ok) {
      sessionStorage.setItem('humo-admin-pw', password)
      setAuthed(true)
    } else {
      setPwError(true)
    }
    setLoggingIn(false)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('humo-admin-pw')
    setAuthed(false)
    setPassword('')
    setStats(null)
  }

  // 每 30 秒重抓一次今日數據
  useEffect(() => {
    if (!authed) return
    const pw = sessionStorage.getItem('humo-admin-pw')
    if (!pw) return
    const tick = () => { fetch(`/api/admin/stats?password=${encodeURIComponent(pw)}`).then(r => r.ok ? r.json() : null).then(setStats).catch(() => {}) }
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [authed])

  // ── 密碼閘門 ──────────────────────────────────────
  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: C.bg, color: C.muted, fontFamily: "'Noto Serif TC', serif" }}>
        載入中…
      </div>
    )
  }

  if (!authed) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: C.bg, fontFamily: "'Noto Serif TC', serif", padding: '24px' }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-[8px] mb-2" style={{ color: C.primaryD }}>忠國豆漿</h1>
            <p className="text-sm tracking-[2px]" style={{ color: C.muted }}>老闆後台</p>
          </div>
          <div className="rounded-3xl" style={{ background: C.card, border: `1px solid ${C.border}`, padding: '32px 24px', boxShadow: '0 4px 20px rgba(92,61,46,0.08)' }}>
            <label className="text-sm font-semibold block mb-2" style={{ color: C.sub }}>請輸入密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPwError(false) }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLogin() }}
              autoFocus
              className="w-full rounded-xl outline-none transition-all"
              style={{
                border: `2px solid ${pwError ? '#EF4444' : C.border}`,
                background: C.bg, color: C.text,
                fontSize: 16, padding: '12px 16px',
                fontFamily: "'Noto Serif TC', serif",
              }}
            />
            {pwError && <p className="text-xs mt-2" style={{ color: '#EF4444' }}>密碼錯誤</p>}
            <button
              onClick={handleLogin}
              disabled={loggingIn || !password}
              className="w-full rounded-2xl mt-5 transition-all active:scale-[0.98]"
              style={{
                background: loggingIn || !password ? C.muted : C.primary,
                color: '#F5E6C8',
                padding: '14px 0', fontSize: 15, fontWeight: 'bold', letterSpacing: '4px',
                border: 'none', cursor: loggingIn || !password ? 'not-allowed' : 'pointer',
                fontFamily: "'Noto Serif TC', serif",
              }}>
              {loggingIn ? '登入中…' : '進入後台'}
            </button>
          </div>
          <p className="text-center text-xs mt-6" style={{ color: C.muted }}>
            客人點餐請走 <a href="/order" style={{ color: C.accent, fontWeight: 'bold' }}>這裡</a>
          </p>
        </div>
      </div>
    )
  }

  // ── 主畫面 ─────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: C.bg, fontFamily: "'Noto Serif TC', serif" }}>
      <div className="mx-auto" style={{ maxWidth: 760, padding: '32px 20px 80px' }}>

        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-[4px]" style={{ color: C.primaryD }}>忠國豆漿</h1>
            <p className="text-xs tracking-[2px] mt-0.5" style={{ color: C.muted }}>老闆後台</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-full text-xs transition-all active:scale-95"
            style={{ background: 'transparent', color: C.muted, padding: '6px 14px', border: `1px solid ${C.border}`, cursor: 'pointer' }}>
            登出
          </button>
        </header>

        {/* 營業狀態 + 一鍵切換 */}
        <section className="rounded-3xl mb-4 flex items-center justify-between"
          style={{
            background: shop.isOpen ? 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)' : 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
            color: '#fff',
            padding: '20px 24px',
            boxShadow: shop.isOpen ? '0 8px 24px rgba(22,163,74,0.25)' : '0 8px 24px rgba(107,114,128,0.2)',
          }}>
          <div>
            <p className="text-xs font-bold tracking-[3px] opacity-80 mb-1">營業狀態</p>
            <p className="text-2xl font-black tracking-[4px]">
              {shop.loading ? '…' : (shop.isOpen ? '營業中' : '休息中')}
            </p>
          </div>
          <button
            onClick={() => { if (!shop.saving && !shop.loading) shop.toggle() }}
            disabled={shop.saving || shop.loading}
            className="rounded-2xl transition-all active:scale-[0.96]"
            style={{
              background: 'rgba(255,255,255,0.22)',
              color: '#fff',
              padding: '12px 22px',
              fontSize: 14, fontWeight: 'bold', letterSpacing: '3px',
              border: '2px solid rgba(255,255,255,0.45)',
              cursor: shop.saving || shop.loading ? 'wait' : 'pointer',
              backdropFilter: 'blur(6px)',
              opacity: shop.saving ? 0.6 : 1,
              fontFamily: "'Noto Serif TC', serif",
            }}>
            {shop.isOpen ? '暫停營業' : '開始營業'}
          </button>
        </section>

        {/* 今日數據 */}
        <section className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label="今日訂單" value={stats ? `${stats.today_order_count}` : '—'} suffix="筆" tone={C.accent} />
          <StatCard label="今日營收" value={stats ? `$${stats.today_revenue.toLocaleString()}` : '—'} tone="#DC2626" />
          <StatCard label="待出餐"  value={stats ? `${stats.pending_count}` : '—'} suffix="筆" tone="#0891B2" />
        </section>

        {/* 功能導航卡片 */}
        <section className="grid grid-cols-2 gap-3">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href}
              className="rounded-2xl transition-all active:scale-[0.97]"
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                padding: '20px 18px',
                boxShadow: '0 2px 8px rgba(92,61,46,0.06)',
                textDecoration: 'none',
                display: 'block',
              }}>
              <div className="flex items-center gap-3 mb-2">
                <span style={{ fontSize: 28 }}>{item.icon}</span>
                <span className="text-base font-bold tracking-[2px]" style={{ color: item.tone }}>
                  {item.title}
                </span>
              </div>
              <p className="text-xs" style={{ color: C.muted, lineHeight: 1.6 }}>{item.desc}</p>
            </a>
          ))}
        </section>

      </div>
    </div>
  )
}

function StatCard({ label, value, suffix, tone }: { label: string; value: string; suffix?: string; tone: string }) {
  return (
    <div className="rounded-2xl text-center"
      style={{
        background: C.card, border: `1px solid ${C.border}`,
        padding: '18px 8px',
        boxShadow: '0 2px 8px rgba(92,61,46,0.06)',
      }}>
      <p className="text-[11px] font-bold tracking-[2px] mb-2" style={{ color: C.muted }}>{label}</p>
      <p className="font-black" style={{ color: tone, fontSize: 24, letterSpacing: '1px' }}>
        {value}{suffix && <span style={{ fontSize: 14, marginLeft: 2 }}>{suffix}</span>}
      </p>
    </div>
  )
}
