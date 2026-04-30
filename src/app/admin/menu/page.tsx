// Path: src/app/admin/menu/page.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { MenuItem, MenuCategory, MenuOption } from '@/types'
import { TEMPERATURES } from '@/lib/temperature'

// ─── 型別 ─────────────────────────────────────────────────
interface FormState {
  id: string
  category: string
  newCategory: string
  name: string
  price: string
  hasTemperature: boolean
  options: { id?: string; label: string; price_delta: string }[]
}

const EMPTY_FORM: FormState = {
  id: '', category: '', newCategory: '', name: '', price: '', hasTemperature: false, options: [],
}

// ─── 自動產生 ID ──────────────────────────────────────────
function generateId(category: string, allItems: (MenuItem & { category: string })[]) {
  const prefixMap: Record<string, string> = { '主食': 'B', '飲料': 'D' }
  const prefix = prefixMap[category] ?? category.charAt(0).toUpperCase()
  const existing = allItems
    .filter((i) => i.category === category && i.id.startsWith(prefix))
    .map((i) => parseInt(i.id.replace(prefix, ''), 10))
    .filter((n) => !isNaN(n))
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1
  return `${prefix}${String(next).padStart(2, '0')}`
}

// ─── DnD 狀態型別 ─────────────────────────────────────────
type DragTarget =
  | { type: 'category'; catIndex: number }
  | { type: 'item'; catIndex: number; itemIndex: number }

// ─── 主元件 ──────────────────────────────────────────────
export default function AdminMenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [reordering, setReordering] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const [showModal, setShowModal]                 = useState(false)
  const [editingId, setEditingId]                 = useState<string | null>(null)
  const [form, setForm]                           = useState<FormState>(EMPTY_FORM)
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  const [deleteConfirm, setDeleteConfirm]         = useState<string | null>(null)

  // ── Drag & Drop state ────────────────────────────────────
  const dragging   = useRef<DragTarget | null>(null)
  const [dragOver, setDragOver] = useState<DragTarget | null>(null)

  const allItems = categories.flatMap((c) =>
    c.items.map((item) => ({ ...item, category: c.category }))
  )

  // ── 讀取菜單 ─────────────────────────────────────────────
  const fetchMenu = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/menu')
      if (!res.ok) throw new Error('載入失敗')
      setCategories(await res.json() as MenuCategory[])
    } catch {
      setError('無法載入菜單，請重新整理')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMenu() }, [fetchMenu])

  // ── 儲存排序到 DB ─────────────────────────────────────────
  const saveReorder = useCallback(async (newCats: MenuCategory[]) => {
    setReordering(true)
    try {
      const categoryOrder = newCats.map((c) => c.category)
      const itemOrders: Record<string, string[]> = {}
      for (const cat of newCats) itemOrders[cat.category] = cat.items.map((i) => i.id)
      const res = await fetch('/api/menu/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryOrder, itemOrders }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setError('排序儲存失敗，請再試一次')
      await fetchMenu()
    } finally {
      setReordering(false)
    }
  }, [fetchMenu])

  // ── Drag handlers：分類 ──────────────────────────────────
  const onCatDragStart = (e: React.DragEvent, catIndex: number) => {
    dragging.current = { type: 'category', catIndex }
    e.dataTransfer.effectAllowed = 'move'
  }

  const onCatDragOver = (e: React.DragEvent, catIndex: number) => {
    e.preventDefault()
    if (dragging.current?.type !== 'category') return
    setDragOver({ type: 'category', catIndex })
  }

  const onCatDrop = (e: React.DragEvent, targetCatIndex: number) => {
    e.preventDefault()
    const src = dragging.current
    if (!src || src.type !== 'category') return
    if (src.catIndex === targetCatIndex) { setDragOver(null); return }

    const next = [...categories]
    const [moved] = next.splice(src.catIndex, 1)
    next.splice(targetCatIndex, 0, moved)
    setCategories(next)
    setDragOver(null)
    dragging.current = null
    saveReorder(next)
  }

  // ── Drag handlers：品項 ──────────────────────────────────
  const onItemDragStart = (e: React.DragEvent, catIndex: number, itemIndex: number) => {
    e.stopPropagation()
    dragging.current = { type: 'item', catIndex, itemIndex }
    e.dataTransfer.effectAllowed = 'move'
  }

  const onItemDragOver = (e: React.DragEvent, catIndex: number, itemIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (dragging.current?.type !== 'item') return
    setDragOver({ type: 'item', catIndex, itemIndex })
  }

  const onItemDrop = (e: React.DragEvent, targetCatIndex: number, targetItemIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    const src = dragging.current
    if (!src || src.type !== 'item') return
    if (src.catIndex !== targetCatIndex) { setDragOver(null); return } // 僅支援同分類內移動
    if (src.itemIndex === targetItemIndex) { setDragOver(null); return }

    const next = categories.map((cat, ci) => {
      if (ci !== targetCatIndex) return cat
      const items = [...cat.items]
      const [moved] = items.splice(src.itemIndex, 1)
      items.splice(targetItemIndex, 0, moved)
      return { ...cat, items }
    })
    setCategories(next)
    setDragOver(null)
    dragging.current = null
    saveReorder(next)
  }

  const onDragEnd = () => {
    dragging.current = null
    setDragOver(null)
  }

  // ── Modal helpers ─────────────────────────────────────────
  const openAddModal = (defaultCategory?: string) => {
    const cat = defaultCategory ?? (categories[0]?.category ?? '')
    setForm({ ...EMPTY_FORM, category: cat, id: cat ? generateId(cat, allItems) : '', hasTemperature: false })
    setEditingId(null)
    setShowNewCategoryInput(false)
    setShowModal(true)
  }

  const openEditModal = (item: MenuItem, category: string) => {
    const hasTempOpts = item.options.some(o => o.id.startsWith('temp_'))
    // 非溫度的選項才列入可編輯選項
    const nonTempOptions = item.options
      .filter(o => !o.id.startsWith('temp_'))
      .map(o => ({ id: o.id, label: o.label, price_delta: String(o.price_delta) }))
    setForm({
      id: item.id, category, newCategory: '', name: item.name,
      price: String(item.price),
      hasTemperature: hasTempOpts,
      options: nonTempOptions,
    })
    setEditingId(item.id)
    setShowNewCategoryInput(false)
    setShowModal(true)
  }

  const handleCategoryChange = (value: string) => {
    if (value === '__new__') {
      setShowNewCategoryInput(true)
      setForm((f) => ({ ...f, category: '__new__', newCategory: '' }))
    } else {
      setShowNewCategoryInput(false)
      setForm((f) => ({ ...f, category: value, id: editingId ? f.id : generateId(value, allItems), newCategory: '' }))
    }
  }

  const addOption    = () => setForm((f) => ({ ...f, options: [...f.options, { label: '', price_delta: '0' }] }))
  const removeOption = (i: number) => setForm((f) => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }))
  const updateOption = (i: number, field: 'label' | 'price_delta', val: string) =>
    setForm((f) => { const opts = [...f.options]; opts[i] = { ...opts[i], [field]: val }; return { ...f, options: opts } })

  // 即時重複 ID 檢查（編輯時，排除自身）
  const newIdTrimmed = form.id.trim()
  const isDuplicateId = !!editingId
    && newIdTrimmed !== editingId
    && allItems.some((i) => i.id === newIdTrimmed)

  // ── 儲存品項 ─────────────────────────────────────────────
  const handleSave = async () => {
    const finalCategory = form.category === '__new__' ? form.newCategory.trim() : form.category
    if (!newIdTrimmed)     { setError('請填入品項 ID'); return }
    if (isDuplicateId)     { setError(`ID「${newIdTrimmed}」已被其他品項使用，請更換`); return }
    if (!finalCategory)   { setError('請填入分類名稱'); return }
    if (!form.name.trim()) { setError('請填入品項名稱'); return }
    if (isNaN(Number(form.price))) { setError('請填入有效價格'); return }

    const payload = {
      id: newIdTrimmed, category: finalCategory, name: form.name.trim(),
      price: Number(form.price),
      options: [
        ...form.options.filter((o) => o.label.trim()).map((o, i) => ({
          id: o.id ?? `OPT_${newIdTrimmed}_${i}`, label: o.label.trim(), price_delta: Number(o.price_delta) || 0,
        })),
        ...(form.hasTemperature ? TEMPERATURES : []),
      ] as MenuOption[],
      sort_order: allItems.filter((i) => i.category === finalCategory).length + 1,
    }

    setSaving(true); setError(null)
    try {
      const isEdit = editingId !== null
      const res = await fetch(isEdit ? `/api/menu/${editingId}` : '/api/menu', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { const b = await res.json(); throw new Error(b.error ?? '儲存失敗') }
      setShowModal(false)
      await fetchMenu()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '儲存失敗，請再試一次')
    } finally {
      setSaving(false)
    }
  }

  // ── 刪除品項 ─────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/menu/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('刪除失敗')
      setDeleteConfirm(null)
      await fetchMenu()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '刪除失敗，請再試一次')
    } finally {
      setSaving(false)
    }
  }

  // ── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-base"
        style={{ background: '#FFFDF7', color: '#9C7A5A', fontFamily: "'Noto Serif TC', serif" }}>
        載入中...
      </div>
    )
  }

  // ── 是否正在拖移某個目標 ──────────────────────────────────
  const isCatOver  = (ci: number) => dragOver?.type === 'category' && dragOver.catIndex === ci
  const isItemOver = (ci: number, ii: number) =>
    dragOver?.type === 'item' && dragOver.catIndex === ci && dragOver.itemIndex === ii

  return (
    <div className="min-h-screen mx-auto max-w-2xl border-l border-r font-sans"
      style={{ background: '#FFFDF7', fontFamily: "'Noto Serif TC', serif", borderColor: '#D4B896' }}>

      {/* ── Header ── */}
      <div className="sticky top-0 z-40 border-b shadow-sm px-5 py-4 flex justify-between items-center gap-3"
        style={{ background: '#FFFDF7', borderColor: '#D4B896' }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold" style={{ color: '#3D2B1F' }}>菜單管理</h1>
            {reordering && (
              <span className="text-xs px-2 py-0.5 rounded-full animate-pulse"
                style={{ background: '#FEF3C7', color: '#92400E' }}>
                儲存排序…
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: '#9C7A5A' }}>
            拖移 ⠿ 可調整分類及品項順序
          </p>
        </div>
        <button
          onClick={() => openAddModal()}
          className="text-sm font-semibold px-4 py-2 rounded-lg shrink-0 transition active:scale-95"
          style={{ background: '#C67C3A', color: '#FFFDF7' }}>
          ＋ 新增品項
        </button>
      </div>

      {/* ── 全域錯誤 ── */}
      {error && !showModal && (
        <div className="mx-5 mt-4 p-3 border rounded-lg text-sm flex justify-between"
          style={{ background: '#FFF5F5', borderColor: '#E8BABA', color: '#A32D2D' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold ml-3 shrink-0">✕</button>
        </div>
      )}

      {/* ── 分類列表 ── */}
      <div className="px-4 py-5 space-y-4 pb-20">
        {categories.length === 0 ? (
          <div className="text-center py-16 text-base" style={{ color: '#C9A97A' }}>
            尚無品項，點右上角「＋ 新增品項」開始吧
          </div>
        ) : (
          categories.map((cat, ci) => (
            <div
              key={cat.category}
              onDragOver={(e) => onCatDragOver(e, ci)}
              onDrop={(e) => onCatDrop(e, ci)}
              onDragEnd={onDragEnd}
              className="rounded-xl border overflow-hidden transition-all duration-150"
              style={{
                background: '#FFFDF7',
                borderColor: isCatOver(ci) ? '#C67C3A' : '#D4B896',
                boxShadow: isCatOver(ci) ? '0 0 0 2px #C67C3A40' : undefined,
                opacity: dragging.current?.type === 'category' && dragging.current.catIndex === ci ? 0.45 : 1,
              }}
            >
              {/* 分類 Header（可拖移） */}
              <div
                draggable
                onDragStart={(e) => onCatDragStart(e, ci)}
                className="flex items-center gap-3 px-4 py-3 border-b cursor-grab active:cursor-grabbing select-none"
                style={{ background: '#F5EFE6', borderColor: '#E0D4C0' }}
              >
                {/* 拖把手 */}
                <span className="text-xl leading-none shrink-0" style={{ color: '#C9A97A' }} title="拖移調整分類順序">
                  ⠿
                </span>
                <h2 className="flex-1 text-base font-bold" style={{ color: '#5C3D2E' }}>
                  {cat.category}
                </h2>
                <span className="text-xs shrink-0" style={{ color: '#B0A090' }}>
                  {cat.items.length} 項
                </span>
                <button
                  onClick={() => openAddModal(cat.category)}
                  className="text-xs font-medium shrink-0 px-2.5 py-1.5 rounded-lg transition"
                  style={{ color: '#8B5E3C', background: '#EDE0D0' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#DFD0BC')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#EDE0D0')}
                >
                  ＋ 品項
                </button>
              </div>

              {/* 品項列表 */}
              <div className="divide-y" style={{ borderColor: '#EDE5D8' }}>
                {cat.items.map((item, ii) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => onItemDragStart(e, ci, ii)}
                    onDragOver={(e) => onItemDragOver(e, ci, ii)}
                    onDrop={(e) => onItemDrop(e, ci, ii)}
                    onDragEnd={onDragEnd}
                    className="flex items-center px-4 py-3 gap-3 transition-all duration-100"
                    style={{
                      cursor: 'grab',
                      background: isItemOver(ci, ii) ? '#FFF3E0' : undefined,
                      borderLeft: isItemOver(ci, ii) ? '3px solid #C67C3A' : '3px solid transparent',
                      opacity: dragging.current?.type === 'item'
                        && dragging.current.catIndex === ci
                        && dragging.current.itemIndex === ii ? 0.4 : 1,
                    }}
                  >
                    {/* 拖把手 */}
                    <span className="text-lg shrink-0 select-none" style={{ color: '#D4B896' }}>
                      ⠿
                    </span>

                    {/* ID badge */}
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded w-10 text-center shrink-0 select-none"
                      style={{ background: '#F5EFE6', color: '#9C7A5A' }}>
                      {item.id}
                    </span>

                    {/* 名稱 + 選項 */}
                    <div className="flex-1 min-w-0 select-none">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium leading-snug" style={{ color: '#3D2B1F' }}>
                          {item.name}
                        </span>
                        {item.options.some(o => o.id.startsWith('temp_')) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                            style={{ background: '#E0F2FE', color: '#0369A1' }}>🌡 溫度</span>
                        )}
                      </div>
                      {item.options.filter(o => !o.id.startsWith('temp_')).length > 0 && (
                        <div className="text-[10px] mt-0.5" style={{ color: '#9C7A5A' }}>
                          {item.options.filter(o => !o.id.startsWith('temp_')).map((o) => o.label + (o.price_delta > 0 ? ` +${o.price_delta}` : '')).join('・')}
                        </div>
                      )}
                    </div>

                    {/* 價格 */}
                    <span className="text-sm font-bold shrink-0 select-none" style={{ color: '#C67C3A' }}>
                      ${item.price}
                    </span>

                    {/* 操作按鈕（阻止 drag 事件冒泡到按鈕點擊） */}
                    <div className="flex gap-1.5 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditModal(item, cat.category) }}
                        className="text-xs px-2.5 py-1.5 border rounded-lg transition"
                        style={{ borderColor: '#D4B896', color: '#5C3D2E' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#F5EFE6')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        編輯
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(item.id) }}
                        className="text-xs px-2.5 py-1.5 border rounded-lg transition"
                        style={{ borderColor: '#D4B896', color: '#A32D2D' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#FFF5F5')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                ))}

                {/* 空分類提示 */}
                {cat.items.length === 0 && (
                  <div className="px-5 py-4 text-sm text-center" style={{ color: '#C9A97A' }}>
                    此分類尚無品項
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── 新增 / 編輯 Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl"
            style={{ background: '#FFFDF7' }}>
            <div className="px-6 py-4 border-b flex justify-between items-center"
              style={{ borderColor: '#E0D4C0' }}>
              <h2 className="text-xl font-bold" style={{ color: '#3D2B1F' }}>
                {editingId ? '編輯品項' : '新增品項'}
              </h2>
              <button onClick={() => { setShowModal(false); setError(null) }}
                className="text-2xl leading-none" style={{ color: '#C9A97A' }}>
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="p-3 border rounded-lg text-sm"
                  style={{ background: '#FFF5F5', borderColor: '#E8BABA', color: '#A32D2D' }}>
                  {error}
                </div>
              )}

              {/* 分類 */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#5C3D2E' }}>分類</label>
                <select
                  value={form.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  disabled={!!editingId}
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none disabled:opacity-50"
                  style={{ borderColor: '#D4B896', color: '#3D2B1F', background: editingId ? '#F5EFE6' : '#FFFDF7', fontSize: 16 }}>
                  {categories.map((c) => (
                    <option key={c.category} value={c.category}>{c.category}</option>
                  ))}
                  <option value="__new__">＋ 新增分類</option>
                </select>
              </div>

              {showNewCategoryInput && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#5C3D2E' }}>新分類名稱</label>
                  <input type="text" value={form.newCategory}
                    onChange={(e) => setForm((f) => ({ ...f, newCategory: e.target.value }))}
                    placeholder="例如：套餐、點心"
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ borderColor: '#D4B896', color: '#3D2B1F', fontSize: 16 }}
                  />
                </div>
              )}

              {/* 品項 ID */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#5C3D2E' }}>
                  品項 ID <span className="text-xs font-normal" style={{ color: '#9C7A5A' }}>(唯一識別碼)</span>
                </label>
                <input type="text" value={form.id}
                  onChange={(e) => setForm((f) => ({ ...f, id: e.target.value.toUpperCase() }))}
                  placeholder="例如：B04"
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none font-mono"
                  style={{
                    borderColor: isDuplicateId ? '#E8BABA' : '#D4B896',
                    color: '#3D2B1F',
                    background: isDuplicateId ? '#FFF5F5' : '#FFFDF7',
                    fontSize: 16,
                  }}
                />
                {isDuplicateId && (
                  <p className="text-xs mt-1 font-medium" style={{ color: '#A32D2D' }}>
                    ⚠ ID「{newIdTrimmed}」已被其他品項使用，請更換
                  </p>
                )}
              </div>

              {/* 名稱 */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#5C3D2E' }}>品項名稱</label>
                <input type="text" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="例如：鮪魚蛋餅"
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ borderColor: '#D4B896', color: '#3D2B1F', fontSize: 16 }}
                />
              </div>

              {/* 價格 */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#5C3D2E' }}>價格（元）</label>
                <input type="number" value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  min={0} placeholder="0"
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ borderColor: '#D4B896', color: '#3D2B1F', fontSize: 16 }}
                />
              </div>

              {/* 溫度選擇開關 */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: '#F5EFE6', border: '1px solid #E0D4C0' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#5C3D2E' }}>開放溫度選擇</p>
                  <p className="text-xs mt-0.5" style={{ color: '#9C7A5A' }}>冰的・溫的・熱的（適用飲料品項）</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, hasTemperature: !f.hasTemperature }))}
                  className="relative w-12 h-6 rounded-full transition-all duration-200 shrink-0"
                  style={{ background: form.hasTemperature ? '#C67C3A' : '#D4B896' }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
                    style={{ left: form.hasTemperature ? '1.375rem' : '0.125rem' }}
                  />
                </button>
              </div>

              {/* 選項 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium" style={{ color: '#5C3D2E' }}>
                    客製化選項 <span className="text-xs font-normal" style={{ color: '#9C7A5A' }}>(選填)</span>
                  </label>
                  <button type="button" onClick={addOption}
                    className="text-sm font-medium" style={{ color: '#8B5E3C' }}>
                    ＋ 新增選項
                  </button>
                </div>
                {form.options.length === 0 ? (
                  <p className="text-sm" style={{ color: '#C9A97A' }}>尚無選項，點右側新增</p>
                ) : (
                  <div className="space-y-2">
                    {form.options.map((opt, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input type="text" value={opt.label}
                          onChange={(e) => updateOption(i, 'label', e.target.value)}
                          placeholder="選項名稱（如：加蛋）"
                          className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none"
                          style={{ borderColor: '#D4B896', color: '#3D2B1F', fontSize: 16 }}
                        />
                        <div className="relative w-24 shrink-0">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#C9A97A' }}>+</span>
                          <input type="number" value={opt.price_delta}
                            onChange={(e) => updateOption(i, 'price_delta', e.target.value)}
                            min={0} placeholder="0"
                            className="w-full border rounded-lg pl-6 pr-3 py-2 text-sm outline-none"
                            style={{ borderColor: '#D4B896', color: '#3D2B1F', fontSize: 16 }}
                          />
                        </div>
                        <button type="button" onClick={() => removeOption(i)}
                          className="text-lg leading-none shrink-0" style={{ color: '#C9A97A' }}>
                          ✕
                        </button>
                      </div>
                    ))}
                    <p className="text-xs" style={{ color: '#9C7A5A' }}>選項加價填 0 代表免費加點</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex gap-3 justify-end" style={{ borderColor: '#E0D4C0' }}>
              <button onClick={() => { setShowModal(false); setError(null) }}
                className="px-5 py-2 border rounded-lg text-sm transition"
                style={{ borderColor: '#D4B896', color: '#5C3D2E' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F5EFE6')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                取消
              </button>
              <button onClick={handleSave} disabled={saving || isDuplicateId}
                className="px-5 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-40"
                style={{ background: '#C67C3A', color: '#FFFDF7' }}>
                {saving ? '儲存中...' : (editingId ? '儲存變更' : '新增品項')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 刪除確認 ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl p-6 max-w-sm w-full shadow-2xl" style={{ background: '#FFFDF7' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#3D2B1F' }}>確認刪除</h3>
            <p className="text-sm mb-6" style={{ color: '#5C3D2E' }}>
              刪除品項「<span className="font-semibold">{allItems.find((i) => i.id === deleteConfirm)?.name ?? deleteConfirm}</span>」後無法復原，確定嗎？
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border rounded-lg text-sm transition"
                style={{ borderColor: '#D4B896', color: '#5C3D2E' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F5EFE6')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                取消
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-40"
                style={{ background: '#A32D2D', color: '#FFFDF7' }}>
                {saving ? '刪除中...' : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
