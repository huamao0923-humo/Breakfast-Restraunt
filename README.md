# 家庭早餐店點餐系統

一個簡潔的客人點餐、廚房即時顯示、老闆報表統計的三合一系統。

## 快速開始

### 1. 環境變數設定

複製 `.env.local.example` → `.env.local`，填入你的 Supabase 認證資訊：

```bash
cp .env.local.example .env.local
```

編輯 `.env.local`：
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
REPORT_PASSWORD=your_secure_password
```

### 2. Supabase 資料庫設定

在 Supabase dashboard 的 SQL Editor 執行：

```sql
create table orders (
  id uuid primary key default gen_random_uuid(),
  table_id text not null,
  pickup_number integer,
  items jsonb not null,
  total integer not null,
  note text,
  status text not null default 'pending',
  paid boolean not null default false,
  created_at timestamptz default now()
);

alter table orders enable row level security;

create policy "anyone can insert"
  on orders for insert with check (true);
```

### 3. 修改菜單

編輯 `src/data/menu.json`，結構為：

```json
[
  {
    "category": "主食",
    "items": [
      {
        "id": "B01",
        "name": "蛋餅",
        "price": 40,
        "options": [
          { "id": "O01", "label": "加蛋", "price_delta": 10 }
        ]
      }
    ]
  }
]
```

### 4. 開發模式

```bash
npm install
npm run dev
```

訪問 `http://localhost:3000`

## 三個主要頁面

| URL | 用途 | 說明 |
|-----|------|------|
| `/menu?table=A1` | 客人點餐 | 掃 QR Code 點菜，支援自訂選項（加蛋、不要洋蔥...） |
| `/kitchen` | 廚房顯示 | 即時訂單、完成/取消按鈕、售罄管理、音效提醒 |
| `/report` | 老闆報表 | 密碼保護、日期篩選、營收統計、品項排行 |

## 功能特色

✅ **客人端**
- 掃 QR Code 進入點餐頁（自動帶桌號）
- 品項自訂選項（加價、不加選項等）
- 外帶自動產生取餐號碼（#001, #002...）

✅ **廚房端**
- 新訂單即時推送 + 音效提醒 🔔
- 頁面重新整理時自動載入今日未完成訂單
- 簡單按鈕：完成、收款、取消
- 右上角售罄管理（同步到客人頁面）

✅ **報表端**
- 密碼保護
- 營收統計
- 熱門品項排行
- 可自訂日期範圍

## 技術棧

- **前端**：Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **實時通訊**：Supabase Realtime Broadcast
- **資料庫**：Supabase PostgreSQL（只有一張表）
- **部署**：Vercel

## 專案結構

```
src/
├── app/
│   ├── menu/page.tsx          # 客人點餐頁
│   ├── kitchen/page.tsx       # 廚房顯示頁
│   ├── report/page.tsx        # 老闆報表頁
│   └── api/orders/            # API routes
├── components/                # UI 元件
├── hooks/                     # React hooks (購物車、廚房邏輯)
├── lib/supabase/              # Supabase 連線
├── data/menu.json             # 菜單資料
└── types/index.ts             # TypeScript 型別
```

## 開發須知

- 菜單改在 JSON 檔，不需後台
- 售罄狀態只在客戶端 + Realtime，不存 DB（重開頁面自動重置）
- 訂單以 `status` 區分：`pending` / `completed` / `cancelled`
- 報表查詢時自動排除 `cancelled` 訂單

## 常見問題

**Q: 為什麼廚房頁重新整理訂單會消失？**  
A: 不會。頁面載入時自動從 DB 取今天的 `status: 'pending'` 訂單。

**Q: 如何修改取餐號碼格式？**  
A: 在 `src/app/api/orders/route.ts` 和 `src/components/OrderCard.tsx` 改 `padStart(3, '0')`。

**Q: 外帶和堂食怎麼區分？**  
A: 客人進入 `/menu?table=takeout` 就是外帶，自動產生取餐號；其他桌號都是堂食。

---

Made for your breakfast shop. 早安！ ☕
