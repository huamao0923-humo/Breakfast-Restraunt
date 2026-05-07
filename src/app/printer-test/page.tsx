'use client'

import { useState } from 'react'

type Status = 'idle' | 'scanning' | 'connected' | 'error'

// 常見 ESC/POS BLE 印表機服務 UUID（Xprinter 系列常用）
const KNOWN_SERVICES = [
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '000018f0-0000-1000-8000-00805f9b34fb',
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
]

function escPos(text: string): Uint8Array {
  const enc  = new TextEncoder()
  const init = [0x1b, 0x40]
  const lf   = [0x0a]
  const cut  = [0x1d, 0x56, 0x00]
  const parts = [
    ...init,
    ...enc.encode('=== BLE 列印測試 ==='), ...lf,
    ...enc.encode(text), ...lf,
    ...enc.encode('-------------------'), ...lf,
    ...enc.encode('連線成功！'), ...lf, ...lf, ...lf,
    ...cut,
  ]
  return new Uint8Array(parts)
}

export default function PrinterTestPage() {
  const [status, setStatus] = useState<Status>('idle')
  const [log, setLog]       = useState<string[]>([])
  const [device, setDevice] = useState<any>(null)
  const [txChar, setTxChar] = useState<any>(null)

  const addLog = (msg: string, type: 'info' | 'ok' | 'warn' | 'err' = 'info') =>
    setLog(prev => [...prev, `${type}|${new Date().toLocaleTimeString()} ${msg}`])

  const supported = typeof navigator !== 'undefined' && 'bluetooth' in navigator

  async function scanAndConnect() {
    setStatus('scanning')
    setLog([])
    try {
      addLog('掃描藍牙裝置中...')
      const dev = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: KNOWN_SERVICES,
      })
      addLog(`找到裝置：${dev.name ?? '(無名稱)'}`, 'ok')
      setDevice(dev)

      addLog('連接 GATT...')
      const server = await dev.gatt.connect()
      addLog('GATT 連接成功', 'ok')

      // 列出所有服務 UUID
      addLog('列出所有 Primary Services...')
      const services = await server.getPrimaryServices()
      addLog(`找到 ${services.length} 個服務：`, 'ok')
      for (const svc of services) {
        addLog(`  SERVICE UUID: ${svc.uuid}`, 'warn')
      }

      // 嘗試找可寫入的 Characteristic
      addLog('嘗試找可寫入的 Characteristic...')
      let found = false
      for (const svc of services) {
        const chars = await svc.getCharacteristics()
        for (const c of chars) {
          const props = c.properties
          const canWrite = props.write || props.writeWithoutResponse
          addLog(`  CHAR: ${c.uuid} | write=${props.write} writeNoResp=${props.writeWithoutResponse}`)
          if (canWrite && !found) {
            setTxChar(c)
            found = true
            addLog(`=> TX Characteristic 確定：${c.uuid}`, 'ok')
          }
        }
      }

      if (found) {
        setStatus('connected')
        addLog('準備好了，可以列印測試單！', 'ok')
      } else {
        addLog('找不到可寫入的 Characteristic', 'err')
        setStatus('error')
      }
    } catch (err: any) {
      addLog(`錯誤：${err.message ?? err}`, 'err')
      setStatus('error')
    }
  }

  async function testPrint() {
    if (!txChar) return
    try {
      addLog('傳送 ESC/POS 列印指令...')
      const data = escPos(new Date().toLocaleString('zh-TW'))
      if (txChar.properties.writeWithoutResponse) {
        await txChar.writeValueWithoutResponse(data)
      } else {
        await txChar.writeValue(data)
      }
      addLog('指令傳送完成！請確認印表機是否出單', 'ok')
    } catch (err: any) {
      addLog(`列印失敗：${err.message ?? err}`, 'err')
    }
  }

  async function disconnect() {
    device?.gatt?.disconnect()
    setDevice(null)
    setTxChar(null)
    setStatus('idle')
    addLog('已中斷連線')
  }

  const logColor = (line: string) => {
    const type = line.split('|')[0]
    return type === 'ok' ? '#4ade80' : type === 'err' ? '#f87171' : type === 'warn' ? '#fbbf24' : '#d1d5db'
  }
  const logText = (line: string) => line.split('|').slice(1).join('|')

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1a1a1a', color: '#e0e0e0', padding: 24, fontFamily: 'monospace' }}>
      <h1 style={{ fontSize: 20, marginBottom: 8, color: '#F5DEB3' }}>印表機 BLE 測試 v2</h1>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>XP-Q90EC · 自動偵測 Service UUID</p>

      <div style={{ marginBottom: 20, padding: '10px 16px', borderRadius: 8,
        backgroundColor: supported ? '#1a2e1a' : '#2e1a1a',
        border: `1px solid ${supported ? '#4ade80' : '#f87171'}` }}>
        {supported ? '✅ 此瀏覽器支援 Web Bluetooth API' : '❌ 不支援 Web Bluetooth API'}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={scanAndConnect}
          disabled={!supported || status === 'scanning' || status === 'connected'}
          style={{ padding: '12px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
            backgroundColor: '#3D2010', color: '#F5DEB3', fontSize: 15, fontWeight: 700,
            opacity: (!supported || status === 'scanning' || status === 'connected') ? 0.5 : 1 }}>
          {status === 'scanning' ? '掃描中...' : '搜尋並連線印表機'}
        </button>

        {status === 'connected' && (
          <button onClick={testPrint}
            style={{ padding: '12px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
              backgroundColor: '#065f46', color: '#fff', fontSize: 15, fontWeight: 700 }}>
            列印測試單
          </button>
        )}

        {device && (
          <button onClick={disconnect}
            style={{ padding: '12px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
              backgroundColor: '#7f1d1d', color: '#fff', fontSize: 15, fontWeight: 700 }}>
            中斷連線
          </button>
        )}
      </div>

      {status !== 'idle' && (
        <div style={{ marginBottom: 16, padding: '8px 14px', borderRadius: 6, display: 'inline-block',
          backgroundColor: status === 'connected' ? '#064e3b' : status === 'error' ? '#450a0a' : '#1e3a5f',
          color: status === 'connected' ? '#6ee7b7' : status === 'error' ? '#fca5a5' : '#93c5fd',
          fontSize: 13 }}>
          {status === 'connected' && '● 已連線 — 可以列印'}
          {status === 'scanning' && '○ 掃描中...'}
          {status === 'error'    && '● 連線失敗'}
        </div>
      )}

      {log.length > 0 && (
        <div style={{ backgroundColor: '#0d0d0d', border: '1px solid #333', borderRadius: 8,
          padding: 16, fontSize: 12, lineHeight: 1.9, maxHeight: 400, overflowY: 'auto' }}>
          {log.map((line, i) => (
            <div key={i} style={{ color: logColor(line) }}>{logText(line)}</div>
          ))}
        </div>
      )}
    </div>
  )
}
