'use client'

import { useState, useCallback, useRef } from 'react'
import type { Order } from '@/types'

const PRINTER_SERVICE = 'e7810a71-73ae-499d-8c15-faa9aef0c3f2'
const PRINTER_TX_CHAR = 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f'

export type PrinterStatus = 'disconnected' | 'connecting' | 'connected'

export function usePrinter() {
  const [status, setStatus]     = useState<PrinterStatus>('disconnected')
  const [printing, setPrinting] = useState(false)
  const charRef   = useRef<any>(null)
  const deviceRef = useRef<any>(null)

  const connect = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) return false
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
  }, [])

  const disconnect = useCallback(() => {
    deviceRef.current?.gatt?.disconnect()
    charRef.current   = null
    deviceRef.current = null
    setStatus('disconnected')
  }, [])

  const print = useCallback(async (order: Order): Promise<boolean> => {
    if (!charRef.current) return false
    setPrinting(true)
    try {
      // server 端用 iconv-lite 轉 GBK，回傳 base64
      const res = await fetch('/api/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      })
      const { data } = await res.json()
      const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0))

      const CHUNK = 200
      for (let i = 0; i < bytes.length; i += CHUNK) {
        const chunk = bytes.slice(i, i + CHUNK)
        if (charRef.current.properties.writeWithoutResponse) {
          await charRef.current.writeValueWithoutResponse(chunk)
        } else {
          await charRef.current.writeValue(chunk)
        }
      }
      return true
    } catch {
      setStatus('disconnected')
      charRef.current = null
      return false
    } finally {
      setPrinting(false)
    }
  }, [])

  return { status, printing, connect, disconnect, print }
}
