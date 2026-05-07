'use client'

import { useState } from 'react'

type Status = 'idle' | 'scanning' | 'connected' | 'error'

const NORDIC_UART = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'
const NORDIC_TX   = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'

function escPos(text: string): Uint8Array {
  const init    = [0x1b, 0x40]               // ESC @ 初始化
  const align   = [0x1b, 0x61, 0x01]         // 置中
  const bold    = [0x1b, 0x45, 0x01]
  const boldOff = [0x1b, 0x45, 0x00]
  const cut     = [0x1d, 0x56, 0x00]         // 切紙
  const lf      = [0x0a]

  const enc = new TextEncoder()
  const parts = [
    ...init,
    ...align, ...bold,
    ...enc.encode('=== 列印測試 ==='), ...lf,
    ...boldOff,
    ...enc.encode(text), ...lf,
    ...enc.encode('------------------------'), ...lf,
    ...enc.encode('Web Bluetooth 連線成功'), ...lf, ...lf, ...lf,
    ...cut,
  ]
  return new Uint8Array(parts)
}

export default function PrinterTestPage() {
  const [status, setStatus]   = useState<Status>('idle')
  const [log, setLog]         = useState<string[]>([])
  const [device, setDevice]   = useState<any>(null)
  const [txChar, setTxChar]   = useState<any>(null)

  const addLog = (msg: string) => setLog(prev => [...prev, `${new Date().toLocaleTimeString()} ${msg}`])

  const supported = typeof navigator !== 'undefined' && 'bluetooth' in navigator

  async function scanAndConnect() {
    setStatus('scanning')
    setLog([])
    try {
      addLog('掃描藍牙裝置中...')
      const dev = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [NORDIC_UART],
      })
      addLog(`找到裝置：${dev.name ?? '(無名稱)'} [${dev.id}]`)
      setDevice(dev)

      addLog('嘗試連接 GATT...')
      const server = await dev.gatt!.connect()
      addLog('GATT 連接成功')

      addLog('尋找 Nordic UART Service...')
      const service = await server.getPrimaryService(NORDIC_UART)
      addLog('找到 UART Service')

      const char = await service.getCharacteristic(NORDIC_TX)
      addLog('找到 TX Characteristic — 準備列印')
      setTxChar(char)
      setStatus('connected')
    } catch (err: any) {
      addLog(`錯誤：${err.message ?? err}`)
      if (err.message?.includes('chooser')) {
        addLog('（使用者取消選擇）')
      } else if (err.message?.includes('GATT') || err.message?.includes('service')) {
        addLog('=> 裝置找到，但不支援 BLE GATT / Nordic UART')
        addLog('=> 此印表機可能是 Classic BT SPP，Web Bluetooth 無法直接使用')
      }
      setStatus('error')
    }
  }

  async function testPrint() {
    if (!txChar) return
    try {
      addLog('傳送列印指令...')
      const data = escPos(new Date().toLocaleString('zh-TW'))
      await txChar.writeValue(data)
      addLog('指令傳送完成，請確認印表機是否出單')
    } catch (err: any) {
      addLog(`列印失敗：${err.message ?? err}`)
    }
  }

  async function disconnect() {
    device?.gatt?.disconnect()
    setDevice(null)
    setTxChar(null)
    setStatus('idle')
    addLog('已中斷連線')
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1a1a1a', color: '#e0e0e0', padding: 24, fontFamily: 'monospace' }}>
      <h1 style={{ fontSize: 20, marginBottom: 8, color: '#F5DEB3' }}>印表機 BLE 測試</h1>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>XP-Q90EC · Web Bluetooth API</p>

      {/* 支援狀態 */}
      <div style={{ marginBottom: 20, padding: '10px 16px', borderRadius: 8,
        backgroundColor: supported ? '#1a2e1a' : '#2e1a1a',
        border: `1px solid ${supported ? '#4ade80' : '#f87171'}` }}>
        {supported
          ? '✅ 此瀏覽器支援 Web Bluetooth API'
          : '❌ 此瀏覽器不支援 Web Bluetooth API（需要 Chrome / Edge）'}
      </div>

      {/* 按鈕區 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <button
          onClick={scanAndConnect}
          disabled={!supported || status === 'scanning' || status === 'connected'}
          style={{ padding: '12px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
            backgroundColor: status === 'connected' ? '#374151' : '#3D2010',
            color: '#F5DEB3', fontSize: 15, fontWeight: 700,
            opacity: (!supported || status === 'scanning' || status === 'connected') ? 0.5 : 1 }}>
          {status === 'scanning' ? '掃描中...' : '搜尋並連線印表機'}
        </button>

        {status === 'connected' && (
          <button
            onClick={testPrint}
            style={{ padding: '12px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
              backgroundColor: '#065f46', color: '#fff', fontSize: 15, fontWeight: 700 }}>
            列印測試單
          </button>
        )}

        {(status === 'connected' || device) && (
          <button
            onClick={disconnect}
            style={{ padding: '12px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
              backgroundColor: '#7f1d1d', color: '#fff', fontSize: 15, fontWeight: 700 }}>
            中斷連線
          </button>
        )}
      </div>

      {/* 狀態燈 */}
      {status !== 'idle' && (
        <div style={{ marginBottom: 16, padding: '8px 14px', borderRadius: 6, display: 'inline-block',
          backgroundColor: status === 'connected' ? '#064e3b' : status === 'error' ? '#450a0a' : '#1e3a5f',
          color: status === 'connected' ? '#6ee7b7' : status === 'error' ? '#fca5a5' : '#93c5fd',
          fontSize: 13 }}>
          {status === 'connected' && '● 已連線 — 可以列印'}
          {status === 'scanning' && '○ 掃描中...'}
          {status === 'error'    && '● 連線失敗 — 請查看下方記錄'}
        </div>
      )}

      {/* Log */}
      {log.length > 0 && (
        <div style={{ backgroundColor: '#0d0d0d', border: '1px solid #333', borderRadius: 8,
          padding: 16, fontSize: 13, lineHeight: 1.8, maxHeight: 320, overflowY: 'auto' }}>
          {log.map((line, i) => (
            <div key={i} style={{
              color: line.includes('錯誤') || line.includes('失敗') ? '#f87171'
                   : line.includes('成功') || line.includes('找到') ? '#4ade80'
                   : line.includes('=>') ? '#fbbf24'
                   : '#d1d5db'
            }}>
              {line}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 32, fontSize: 12, color: '#555', lineHeight: 2 }}>
        <p>測試說明：</p>
        <p>1. 確認 XP-Q90EC 已開機並開啟藍牙</p>
        <p>2. 點「搜尋並連線印表機」，在彈出視窗選擇 XP 開頭的裝置</p>
        <p>3. 若看到「找到 UART Service」→ BLE 模式可用，點「列印測試單」</p>
        <p>4. 若看到黃色警告 →「Classic BT SPP」，需改用 printer-app 方案</p>
      </div>
    </div>
  )
}
