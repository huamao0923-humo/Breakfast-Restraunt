'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Order } from '@/types'

export function useKitchen() {
  const [orders, setOrders] = useState<Order[]>([])
  const [soldOut, setSoldOut] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // 初始載入今天的訂單
  useEffect(() => {
    fetch('/api/orders?mode=kitchen')
      .then((res) => res.json())
      .then((data: Order[]) => setOrders(data))
      .catch((err) => console.error('Failed to load orders:', err))
      .finally(() => setLoading(false))
  }, [])

  // 訂閱即時更新
  useEffect(() => {
    const es = new EventSource('/api/events?channel=kitchen')

    es.addEventListener('new-order', (e) => {
      const newOrder = JSON.parse(e.data) as Order
      setOrders((prev) => [newOrder, ...prev])
      try { new Audio('/sounds/ding.mp3').play().catch(() => {}) } catch {}
    })

    es.addEventListener('order-updated', (e) => {
      const updated = JSON.parse(e.data) as Order
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
    })

    return () => es.close()
  }, [])

  const toggleSoldOut = useCallback(async (itemId: string) => {
    const newSoldOut = soldOut.includes(itemId)
      ? soldOut.filter((id) => id !== itemId)
      : [...soldOut, itemId]

    setSoldOut(newSoldOut)

    await fetch('/api/sold-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ soldOut: newSoldOut }),
    })
  }, [soldOut])

  const completeOrder = useCallback(async (orderId: string) => {
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })
      setOrders((prev) => prev.filter((o) => o.id !== orderId))
    } catch (error) {
      console.error('Failed to complete order:', error)
    }
  }, [])

  const cancelOrder = useCallback(async (orderId: string) => {
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      setOrders((prev) => prev.filter((o) => o.id !== orderId))
    } catch (error) {
      console.error('Failed to cancel order:', error)
    }
  }, [])

  const markPaid = useCallback(async (orderId: string) => {
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid: true }),
      })
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, paid: true } : o))
      )
    } catch (error) {
      console.error('Failed to mark paid:', error)
    }
  }, [])

  return { orders, soldOut, loading, toggleSoldOut, completeOrder, cancelOrder, markPaid }
}
