'use client'

import { useEffect, useState, useCallback } from 'react'

export interface ShopSettings {
  is_open: boolean
  closed_message: string
  auto_close_time: string | null
  auto_closed_on: string | null
}

const DEFAULT: ShopSettings = {
  is_open: false,
  closed_message: '目前未營業，請稍後再試',
  auto_close_time: null,
  auto_closed_on: null,
}

export function useShopStatus() {
  const [settings, setSettings] = useState<ShopSettings>(DEFAULT)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    let cancelled = false

    fetch('/api/shop-settings')
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((data: ShopSettings) => {
        if (!cancelled) setSettings(data)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })

    const es = new EventSource('/api/events?channel=menu-updates')
    es.addEventListener('shop-settings-changed', (e) => {
      try {
        const updated = JSON.parse((e as MessageEvent).data) as ShopSettings
        setSettings(updated)
      } catch {}
    })

    return () => { cancelled = true; es.close() }
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

  const toggle           = useCallback(() => patch({ is_open: !settings.is_open }), [patch, settings.is_open])
  const setOpen          = useCallback((v: boolean) => patch({ is_open: v }), [patch])
  const updateMessage    = useCallback((m: string) => patch({ closed_message: m }), [patch])
  const setAutoCloseTime = useCallback((t: string | null) => patch({ auto_close_time: t }), [patch])

  return {
    isOpen: settings.is_open,
    closedMessage: settings.closed_message,
    autoCloseTime: settings.auto_close_time,
    loading,
    saving,
    toggle,
    setOpen,
    updateMessage,
    setAutoCloseTime,
  }
}
