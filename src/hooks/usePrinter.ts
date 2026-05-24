'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Order } from '@/types'

const PRINTER_SERVICE = 'e7810a71-73ae-499d-8c15-faa9aef0c3f2'
const PRINTER_TX_CHAR = 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f'

export type PrinterStatus = 'disconnected' | 'connecting' | 'connected'

type QueueEntry = { order: Order; force: boolean }

export function usePrinter() {
  const [status, setStatus]           = useState<PrinterStatus>('disconnected')
  const [printing, setPrinting]       = useState(false)
  const [queueLength, setQueueLength] = useState(0)
  const charRef       = useRef<any>(null)
  const deviceRef     = useRef<any>(null)
  const queueRef      = useRef<QueueEntry[]>([])
  const processingRef = useRef(false)

  const updateQueueLength = () => setQueueLength(queueRef.current.length)

  /** 對已記住的裝置靜默重連，不跳選擇視窗 */
  const reconnect = useCallback(async (): Promise<boolean> => {
    if (!deviceRef.current) return false
    setStatus('connecting')
    try {
      const server  = await deviceRef.current.gatt.connect()
      const service = await server.getPrimaryService(PRINTER_SERVICE)
      charRef.current = await service.getCharacteristic(PRINTER_TX_CHAR)
      setStatus('connected')
      return true
    } catch {
      setStatus('disconnected')
      charRef.current = null
      return false
    }
  }, [])

  /** 第一次連線，需使用者手動選擇裝置 */
  const connect = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) return false

    // 裝置已記住 → 靜默重連，不重新跳視窗
    if (deviceRef.current) return reconnect()

    setStatus('connecting')
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [PRINTER_SERVICE],
      })
      deviceRef.current = device
      device.addEventListener('gattserverdisconnected', () => {
        setStatus('disconnected')
        charRef.current = null
      })
      const server  = await device.gatt.connect()
      const service = await server.getPrimaryService(PRINTER_SERVICE)
      charRef.current = await service.getCharacteristic(PRINTER_TX_CHAR)
      setStatus('connected')
      return true
    } catch {
      setStatus('disconnected')
      return false
    }
  }, [reconnect])

  const disconnect = useCallback(() => {
    deviceRef.current?.gatt?.disconnect()
    charRef.current   = null
    deviceRef.current = null
    setStatus('disconnected')
  }, [])

  /**
   * FIFO 佇列處理器：一張單一張單依序送到印表機，避免並發 BLE 寫入混亂。
   * 印表機未連線、列印失敗、API 錯誤都會中斷迴圈並保留佇列等下次再試。
   */
  const processQueue = useCallback(async () => {
    if (processingRef.current) return
    processingRef.current = true
    setPrinting(true)
    try {
      while (queueRef.current.length > 0) {
        // 確保印表機已連線；連不上就先停，等下次 enqueue 或 status 變化再試
        if (!charRef.current) {
          const ok = await reconnect()
          if (!ok) break
        }

        const entry = queueRef.current[0]
        try {
          // 1) 跟 API 要 receipt bytes（同時做原子佔位）
          const res = await fetch('/api/receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: entry.order.id, force: entry.force }),
          })

          if (res.status === 409) {
            // already_printed：別張分頁或裝置已搶印過，從佇列移除即可
            queueRef.current.shift()
            updateQueueLength()
            continue
          }
          if (!res.ok) {
            // 其他錯誤（500/網路）→ 留著等下次重試
            break
          }

          const { data } = await res.json()
          const bytes    = Uint8Array.from(atob(data), c => c.charCodeAt(0))

          // 2) 分塊送進 BLE characteristic
          const CHUNK = 200
          for (let i = 0; i < bytes.length; i += CHUNK) {
            const chunk = bytes.slice(i, i + CHUNK)
            if (charRef.current.properties.writeWithoutResponse) {
              await charRef.current.writeValueWithoutResponse(chunk)
            } else {
              await charRef.current.writeValue(chunk)
            }
          }

          // 3) 成功 → 從佇列移除
          queueRef.current.shift()
          updateQueueLength()
        } catch {
          // BLE 寫入失敗：先還原 printed_at（非 force 才需要），讓下次能重試
          if (!entry.force) {
            try {
              await fetch('/api/receipt/release', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: entry.order.id }),
              })
            } catch {}
          }
          setStatus('disconnected')
          charRef.current = null
          break
        }
      }
    } finally {
      processingRef.current = false
      setPrinting(false)
    }
  }, [reconnect])

  /**
   * 把訂單放進佇列。force=true 用於手動補印（繞過原子佔位、可重印已印過的單）。
   * 同一張 order.id 非 force 重複呼叫會自動去重。
   */
  const enqueue = useCallback((order: Order, force = false) => {
    if (!force && queueRef.current.some(e => e.order.id === order.id)) return
    queueRef.current.push({ order, force })
    updateQueueLength()
    processQueue()
  }, [processQueue])

  /** 從佇列移除某張單（例如被取消的單） */
  const removeFromQueue = useCallback((orderId: string) => {
    const before = queueRef.current.length
    queueRef.current = queueRef.current.filter(e => e.order.id !== orderId)
    if (queueRef.current.length !== before) updateQueueLength()
  }, [])

  // 印表機連線恢復時，自動繼續處理佇列
  useEffect(() => {
    if (status === 'connected' && queueRef.current.length > 0) {
      processQueue()
    }
  }, [status, processQueue])

  // 手動列印保留為 force=true 的 enqueue
  const print = useCallback((order: Order) => {
    enqueue(order, true)
  }, [enqueue])

  return { status, printing, queueLength, connect, disconnect, print, enqueue, removeFromQueue }
}
