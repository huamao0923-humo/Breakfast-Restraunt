'use client'

import { useEffect, useState, useCallback } from 'react'

export interface ShopSettings {
  is_open: boolean
  closed_message: string
  auto_open_time: string | null
  auto_close_time: string | null
  auto_opened_on: string | null
  auto_closed_on: string | null
  off_weekdays: number[]
  holidays: string[]
}

const DEFAULT: ShopSettings = {
  is_open: false,
  closed_message: '目前未營業，請稍後再試',
  auto_open_time: null,
  auto_close_time: null,
  auto_opened_on: null,
  auto_closed_on: null,
  off_weekdays: [],
  holidays: [],
}

export function useShopStatus() {
  const [settings, setSettings] = useState<ShopSettings>(DEFAULT)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = () =>
      fetch('/api/shop-settings')
        .then(r => r.ok ? r.json() : Promise.reject(r))
        .then((data: ShopSettings) => { if (!cancelled) setSettings(data) })
        .catch(() => {})

    load().finally(() => { if (!cancelled) setLoading(false) })

    // SSE 即時更新（含伺服器排程器觸發的自動開/關店）
    const es = new EventSource('/api/events?channel=menu-updates')
    es.addEventListener('shop-settings-changed', (e) => {
      try {
        setSettings(JSON.parse((e as MessageEvent).data) as ShopSettings)
      } catch {}
    })

    // 60 秒輪詢備援，避免 SSE 斷線時狀態卡住
    const poll = setInterval(load, 60_000)

    return () => { cancelled = true; es.close(); clearInterval(poll) }
  }, [])

  const patch = useCallback(async (body: Partial<ShopSettings>) => {
    setSaving(true)
    try {
      const res = await fetch('/api/shop-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) setSettings(await res.json())
    } finally {
      setSaving(false)
    }
  }, [])

  const toggle = useCallback(() => patch({ is_open: !settings.is_open }), [patch, settings.is_open])
  const setOpen = useCallback((v: boolean) => patch({ is_open: v }), [patch])

  return {
    isOpen: settings.is_open,
    closedMessage: settings.closed_message,
    autoOpenTime: settings.auto_open_time,
    autoCloseTime: settings.auto_close_time,
    offWeekdays: settings.off_weekdays,
    holidays: settings.holidays,
    loading,
    saving,
    toggle,
    setOpen,
    patch,
  }
}
