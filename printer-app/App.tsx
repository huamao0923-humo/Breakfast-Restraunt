// Path: printer-app/App.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  PermissionsAndroid,
  Platform,
  StatusBar,
} from 'react-native'
import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic'
import { formatReceipt } from './src/printer'
import { orderOptionsForDisplay } from './src/types'
import type { Order } from './src/types'

const API_BASE   = 'https://breakfast-restraunt-production.up.railway.app'
const POLL_MS    = 5000
const PRINTER_ID = 'Printer001' // 已配對藍牙裝置名稱

// ─── Bluetooth 權限 ────────────────────────────────────────
async function requestBTPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true
  if (Platform.Version >= 31) {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    ])
    return Object.values(results).every(
      (r) => r === PermissionsAndroid.RESULTS.GRANTED
    )
  }
  const r = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
  )
  return r === PermissionsAndroid.RESULTS.GRANTED
}

// ─── 主元件 ────────────────────────────────────────────────
export default function App() {
  const [orders, setOrders]       = useState<Order[]>([])
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefresh]  = useState(false)
  const [printer, setPrinter]     = useState<BluetoothDevice | null>(null)
  const [btStatus, setBtStatus]   = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const [printing, setPrinting]   = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── 連線打印機 ──────────────────────────────────────────
  const connectPrinter = useCallback(async () => {
    setBtStatus('connecting')
    try {
      const ok = await requestBTPermissions()
      if (!ok) {
        Alert.alert('權限不足', '請在手機設定中允許藍牙權限，再重新開啟 App')
        setBtStatus('disconnected')
        return
      }

      const devices = await RNBluetoothClassic.getBondedDevices()
      const target  = devices.find(
        (d) => d.name === PRINTER_ID || d.name?.startsWith('XP') || d.name?.includes('Printer')
      )

      if (!target) {
        Alert.alert(
          '找不到打印機',
          `請確認「${PRINTER_ID}」已在 Android 藍牙設定中完成配對，再點「重新連線」`
        )
        setBtStatus('disconnected')
        return
      }

      const connected = await target.connect()
      if (connected) {
        setPrinter(target)
        setBtStatus('connected')
      } else {
        setBtStatus('disconnected')
        Alert.alert('連線失敗', '請確認打印機電源已開啟')
      }
    } catch (err) {
      console.error('[BT] connect error:', err)
      setBtStatus('disconnected')
    }
  }, [])

  // ── 抓取訂單 ───────────────────────────────────────────
  const fetchOrders = useCallback(async (pull = false) => {
    if (pull) setRefresh(true)
    try {
      const res  = await fetch(`${API_BASE}/api/orders?mode=kitchen`)
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('[API] fetch error:', err)
    } finally {
      setLoading(false)
      setRefresh(false)
    }
  }, [])

  // ── 列印訂單 ───────────────────────────────────────────
  const printOrder = useCallback(
    async (order: Order) => {
      if (!printer) {
        Alert.alert('未連線', '打印機尚未連接，請點右上角「重新連線」', [
          { text: '重新連線', onPress: connectPrinter },
          { text: '取消' },
        ])
        return
      }

      setPrinting(order.id)
      try {
        const isConnected = await printer.isConnected()
        if (!isConnected) await printer.connect()

        const receipt = formatReceipt(order)
        await printer.write(receipt)
      } catch (err) {
        console.error('[Print] error:', err)
        Alert.alert('列印失敗', '請確認打印機連線後再試', [
          { text: '重新連線', onPress: connectPrinter },
          { text: '取消' },
        ])
        setPrinter(null)
        setBtStatus('disconnected')
      } finally {
        setPrinting(null)
      }
    },
    [printer, connectPrinter]
  )

  // ── 初始化 ─────────────────────────────────────────────
  useEffect(() => {
    connectPrinter()
    fetchOrders()
    pollRef.current = setInterval(() => fetchOrders(), POLL_MS)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, []) // eslint-disable-line

  const activeOrders = orders.filter(
    (o) => o.status !== 'completed' && o.status !== 'cancelled'
  )

  // ── 畫面 ──────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#A8926E" />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.headerTitle}>廚房出單</Text>
          {activeOrders.length > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{activeOrders.length} 筆</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={connectPrinter} style={s.btBtn}>
          <View style={[s.btDot, btStatus === 'connected' ? s.btGreen : s.btRed]} />
          <Text style={s.btLabel}>
            {btStatus === 'connecting' ? '連線中…' : btStatus === 'connected' ? '已連線' : '重新連線'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 訂單列表 */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#3D2010" />
          <Text style={s.loadingText}>載入中…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} />
          }
        >
          {activeOrders.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🍳</Text>
              <Text style={s.emptyText}>目前沒有待處理訂單</Text>
            </View>
          ) : (
            activeOrders.map((order, idx) => {
              const isOdd  = idx % 2 === 0
              const cardBg = isOdd ? '#F5DEB3' : '#FFF8DC'
              const headBg = isOdd ? '#E8C98A' : '#F0E8B0'
              const isPrinting = printing === order.id

              return (
                <View key={order.id} style={[s.card, { backgroundColor: cardBg }]}>

                  {/* 卡片 Header */}
                  <View style={[s.cardHeader, { backgroundColor: headBg }]}>
                    <View style={s.cardHeaderLeft}>
                      <Text style={s.cardTitle}>
                        {order.table_id === 'takeout'
                          ? `外帶 #${String(order.pickup_number ?? 0).padStart(3, '0')}`
                          : `${order.table_id} 桌`}
                      </Text>
                      {idx === 0 && <View style={s.newBadge}><Text style={s.newBadgeText}>新單</Text></View>}
                    </View>
                    <Text style={s.timeText}>
                      {new Date(order.created_at).toLocaleTimeString('zh-TW', {
                        hour: '2-digit', minute: '2-digit', hour12: false,
                      })}
                    </Text>
                  </View>

                  {/* 品項 */}
                  <View style={s.itemsWrap}>
                    {order.items.map((item, i) => (
                      <View key={i} style={s.itemRow}>
                        <View style={s.itemLeft}>
                          <Text style={s.itemName}>{item.name}</Text>
                          {item.description && (
                            <Text style={s.itemDesc}>{item.description}</Text>
                          )}
                          {item.options && item.options.length > 0 && (
                            <Text style={s.itemOpts}>
                              {orderOptionsForDisplay(item.options).map((o) => o.qty && o.qty > 1 ? `${o.label} ×${o.qty}` : o.label).join('・')}
                            </Text>
                          )}
                        </View>
                        <View style={s.itemRight}>
                          <View style={s.qtyBadge}>
                            <Text style={s.qtyText}>×{item.qty}</Text>
                          </View>
                          <Text style={s.itemPrice}>${item.price * item.qty}</Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* 備註 */}
                  {order.note ? (
                    <View style={s.noteWrap}>
                      <Text style={s.noteText}>📝 {order.note}</Text>
                    </View>
                  ) : null}

                  {/* 合計 + 列印按鈕 */}
                  <View style={s.cardFooter}>
                    <Text style={s.totalLabel}>合計</Text>
                    <Text style={s.totalAmount}>${order.total}</Text>
                  </View>

                  <TouchableOpacity
                    style={[s.printBtn, isPrinting && s.printBtnDisabled]}
                    onPress={() => printOrder(order)}
                    disabled={isPrinting}
                    activeOpacity={0.75}
                  >
                    {isPrinting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={s.printBtnText}>🖨  列印出單</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )
            })
          )}
        </ScrollView>
      )}
    </View>
  )
}

// ─── 樣式 ─────────────────────────────────────────────────
const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#C3B091' },

  // Header
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    backgroundColor: '#A8926E', paddingHorizontal: 16, paddingVertical: 12,
                    paddingTop: (StatusBar.currentHeight ?? 0) + 12,
                    borderBottomWidth: 1, borderBottomColor: '#8C7455' },
  headerLeft:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle:    { fontSize: 16, fontWeight: '700', color: '#3D2010', letterSpacing: 4 },
  badge:          { backgroundColor: '#D2B48C', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText:      { fontSize: 11, fontWeight: '700', color: '#3D2010' },
  btBtn:          { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btDot:          { width: 8, height: 8, borderRadius: 4 },
  btGreen:        { backgroundColor: '#6EE7B7' },
  btRed:          { backgroundColor: '#F87171' },
  btLabel:        { fontSize: 12, color: '#3D2010' },

  // Loading / Empty
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:    { color: '#3D2010', fontSize: 14 },
  empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 120 },
  emptyIcon:      { fontSize: 48, marginBottom: 12, opacity: 0.4 },
  emptyText:      { fontSize: 13, color: '#3D2010', letterSpacing: 4 },

  // List
  list:           { padding: 16, paddingBottom: 40, gap: 16 },

  // Card
  card:           { borderRadius: 16, overflow: 'hidden',
                    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
  cardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    paddingHorizontal: 20, paddingVertical: 14,
                    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle:      { fontSize: 15, fontWeight: '700', color: '#3D2010', letterSpacing: 2 },
  newBadge:       { backgroundColor: '#8C7455', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  newBadgeText:   { fontSize: 10, fontWeight: '700', color: '#FFF8DC' },
  timeText:       { fontSize: 12, color: '#5C3D2E' },

  // Items
  itemsWrap:      { paddingHorizontal: 20, paddingTop: 4 },
  itemRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.12)',
                    borderStyle: 'dashed' },
  itemLeft:       { flex: 1, paddingRight: 16 },
  itemName:       { fontSize: 15, color: '#1C1C1E' },
  itemDesc:       { fontSize: 12, color: '#9C7A5A', marginTop: 4, fontStyle: 'italic' },
  itemOpts:       { fontSize: 12, color: '#7A5C3A', marginTop: 4 },
  itemRight:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBadge:       { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 12,
                    paddingHorizontal: 10, paddingVertical: 3 },
  qtyText:        { fontSize: 13, fontWeight: '700', color: '#3D2010' },
  itemPrice:      { fontSize: 13, fontWeight: '700', color: '#3D2010', minWidth: 40, textAlign: 'right' },

  // Note
  noteWrap:       { marginHorizontal: 20, marginBottom: 8, padding: 10, borderRadius: 8,
                    backgroundColor: 'rgba(255,255,255,0.35)',
                    borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)', borderStyle: 'dashed' },
  noteText:       { fontSize: 12, color: '#3D2010', fontStyle: 'italic' },

  // Footer
  cardFooter:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    paddingHorizontal: 20, paddingVertical: 14,
                    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)' },
  totalLabel:     { fontSize: 13, color: '#5C3D2E' },
  totalAmount:    { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },

  // Print Button
  printBtn:       { backgroundColor: '#3D2010', paddingVertical: 16, alignItems: 'center',
                    flexDirection: 'row', justifyContent: 'center', gap: 8 },
  printBtnDisabled: { opacity: 0.5 },
  printBtnText:   { color: '#FFF8DC', fontSize: 15, fontWeight: '700', letterSpacing: 2 },
})
