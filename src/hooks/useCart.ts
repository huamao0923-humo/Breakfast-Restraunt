'use client'

import { useState, useCallback } from 'react'
import type { CartItem, CartItemOption } from '@/types'

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])

  const addItem = useCallback((id: string, name: string, price: number, options: CartItemOption[]) => {
    setItems((prev) => {
      const existing = prev.find(
        (item) =>
          item.id === id &&
          JSON.stringify(item.options) === JSON.stringify(options)
      )

      if (existing) {
        return prev.map((item) =>
          item === existing ? { ...item, qty: item.qty + 1 } : item
        )
      }

      return [
        ...prev,
        {
          id,
          name,
          price,
          qty: 1,
          options,
        },
      ]
    })
  }, [])

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const updateQty = useCallback((index: number, qty: number) => {
    if (qty <= 0) {
      removeItem(index)
      return
    }
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, qty } : item))
    )
  }, [removeItem])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const total = items.reduce((sum, item) => {
    const itemPrice = item.price + item.options.reduce((o, opt) => o + opt.price_delta, 0)
    return sum + itemPrice * item.qty
  }, 0)

  return {
    items,
    addItem,
    removeItem,
    updateQty,
    clearCart,
    total,
  }
}
