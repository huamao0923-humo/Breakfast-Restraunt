// seed-menu.mjs
// 執行方式：在專案根目錄執行 node seed-menu.mjs
// 需要先設定環境變數 DATABASE_URL（Railway 提供的連線字串）
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
})

const menuItems = [
  // 燒餅類
  { id: 'S01', category: '燒餅類', name: '燒餅', price: 20, options: [], sort_order: 1 },
  { id: 'S02', category: '燒餅類', name: '油條', price: 20, options: [], sort_order: 2 },
  { id: 'S03', category: '燒餅類', name: '原味甜餅', price: 20, options: [], sort_order: 3 },
  { id: 'S04', category: '燒餅類', name: '芋頭甜餅', price: 20, options: [], sort_order: 4 },
  { id: 'S05', category: '燒餅類', name: '紅豆甜餅', price: 20, options: [], sort_order: 5 },
  { id: 'S06', category: '燒餅類', name: '豬肉餡餅', price: 40, options: [], sort_order: 6 },
  { id: 'S07', category: '燒餅類', name: '燒餅夾油條', price: 40, options: [], sort_order: 7 },
  { id: 'S08', category: '燒餅類', name: '燒餅加蔥蛋/荷包蛋', price: 35, options: [{ id: 'S08_O1', label: '不加醬', price_delta: 0 }], sort_order: 8 },
  { id: 'S09', category: '燒餅類', name: '燒餅加九層塔蛋', price: 40, options: [{ id: 'S09_O1', label: '不加醬', price_delta: 0 }], sort_order: 9 },
  { id: 'S10', category: '燒餅類', name: '燒餅加玉米蛋', price: 45, options: [{ id: 'S10_O1', label: '不加醬', price_delta: 0 }], sort_order: 10 },
  { id: 'S11', category: '燒餅類', name: '燒餅加起司蛋', price: 45, options: [{ id: 'S11_O1', label: '不加醬', price_delta: 0 }], sort_order: 11 },
  { id: 'S12', category: '燒餅類', name: '燒餅加培根蛋', price: 50, options: [{ id: 'S12_O1', label: '不加醬', price_delta: 0 }], sort_order: 12 },
  { id: 'S13', category: '燒餅類', name: '燒餅加豬排蛋', price: 55, options: [{ id: 'S13_O1', label: '不加醬', price_delta: 0 }], sort_order: 13 },
  // 饅頭類
  { id: 'M01', category: '饅頭類', name: '饅頭', price: 15, options: [{ id: 'M01_O1', label: '黑糖', price_delta: 0 }, { id: 'M01_O2', label: '芋頭', price_delta: 0 }, { id: 'M01_O3', label: '原味', price_delta: 0 }], sort_order: 1 },
  { id: 'M02', category: '饅頭類', name: '肉包', price: 15, options: [], sort_order: 2 },
  { id: 'M03', category: '饅頭類', name: '菜包', price: 15, options: [], sort_order: 3 },
  { id: 'M04', category: '饅頭類', name: '饅頭夾蔥蛋/荷包蛋', price: 30, options: [{ id: 'M04_O1', label: '不加醬', price_delta: 0 }], sort_order: 4 },
  { id: 'M05', category: '饅頭類', name: '饅頭夾九層塔蛋', price: 35, options: [{ id: 'M05_O1', label: '不加醬', price_delta: 0 }], sort_order: 5 },
  { id: 'M06', category: '饅頭類', name: '饅頭夾玉米蛋', price: 40, options: [{ id: 'M06_O1', label: '不加醬', price_delta: 0 }], sort_order: 6 },
  { id: 'M07', category: '饅頭類', name: '饅頭夾起士蛋', price: 40, options: [{ id: 'M07_O1', label: '不加醬', price_delta: 0 }], sort_order: 7 },
  { id: 'M08', category: '饅頭類', name: '饅頭夾培根蛋', price: 45, options: [{ id: 'M08_O1', label: '不加醬', price_delta: 0 }], sort_order: 8 },
  { id: 'M09', category: '饅頭類', name: '饅頭夾豬排蛋', price: 50, options: [{ id: 'M09_O1', label: '不加醬', price_delta: 0 }], sort_order: 9 },
  // 其他類
  { id: 'O01', category: '其他類', name: '蘿蔔糕', price: 30, options: [], sort_order: 1 },
  { id: 'O02', category: '其他類', name: '蘿蔔糕加蛋', price: 45, options: [], sort_order: 2 },
  { id: 'O03', category: '其他類', name: '碗粿', price: 30, options: [], sort_order: 3 },
  // 飯糰類
  { id: 'R01', category: '飯糰類', name: '飯糰', price: 35, options: [], sort_order: 1 },
  { id: 'R02', category: '飯糰類', name: '素飯糰', price: 35, options: [], sort_order: 2 },
  { id: 'R03', category: '飯糰類', name: '甜飯糰', price: 35, options: [], sort_order: 3 },
  { id: 'R04', category: '飯糰類', name: '飯糰加蛋', price: 50, options: [{ id: 'R04_O1', label: '不加醬', price_delta: 0 }], sort_order: 4 },
  { id: 'R05', category: '飯糰類', name: '飯糰加玉米蛋', price: 60, options: [{ id: 'R05_O1', label: '不加醬', price_delta: 0 }], sort_order: 5 },
  { id: 'R06', category: '飯糰類', name: '飯糰加起士蛋', price: 60, options: [{ id: 'R06_O1', label: '不加醬', price_delta: 0 }], sort_order: 6 },
  { id: 'R07', category: '飯糰類', name: '飯糰加培根蛋', price: 65, options: [{ id: 'R07_O1', label: '不加醬', price_delta: 0 }], sort_order: 7 },
  { id: 'R08', category: '飯糰類', name: '飯糰加豬排蛋', price: 70, options: [{ id: 'R08_O1', label: '不加醬', price_delta: 0 }], sort_order: 8 },
  // 飲料類
  { id: 'D01', category: '飲料類', name: '豆漿', price: 20, options: [{ id: 'D01_O1', label: '小杯', price_delta: -5 }], sort_order: 1 },
  { id: 'D02', category: '飲料類', name: '米漿', price: 20, options: [{ id: 'D02_O1', label: '小杯', price_delta: -5 }], sort_order: 2 },
  { id: 'D03', category: '飲料類', name: '清漿(無糖)', price: 20, options: [{ id: 'D03_O1', label: '小杯', price_delta: -5 }], sort_order: 3 },
  { id: 'D04', category: '飲料類', name: '豆漿加米漿', price: 20, options: [{ id: 'D04_O1', label: '小杯', price_delta: -5 }], sort_order: 4 },
  { id: 'D05', category: '飲料類', name: '冰紅茶', price: 20, options: [{ id: 'D05_O1', label: '小杯', price_delta: -5 }], sort_order: 5 },
  { id: 'D06', category: '飲料類', name: '鹹豆漿', price: 25, options: [{ id: 'D06_O1', label: '加蛋', price_delta: 15 }], sort_order: 6 },
  { id: 'D07', category: '飲料類', name: '豆漿加蛋', price: 35, options: [], sort_order: 7 },
  // 蛋餅類
  { id: 'E01', category: '蛋餅類', name: '原味蛋餅', price: 30, options: [{ id: 'E01_O1', label: '不加醬', price_delta: 0 }], sort_order: 1 },
  { id: 'E02', category: '蛋餅類', name: '九層塔蛋餅', price: 35, options: [{ id: 'E02_O1', label: '不加醬', price_delta: 0 }], sort_order: 2 },
  { id: 'E03', category: '蛋餅類', name: '高麗菜蛋餅', price: 35, options: [{ id: 'E03_O1', label: '不加醬', price_delta: 0 }], sort_order: 3 },
  { id: 'E04', category: '蛋餅類', name: '玉米蛋餅', price: 40, options: [{ id: 'E04_O1', label: '不加醬', price_delta: 0 }], sort_order: 4 },
  { id: 'E05', category: '蛋餅類', name: '起士蛋餅', price: 40, options: [{ id: 'E05_O1', label: '不加醬', price_delta: 0 }], sort_order: 5 },
  { id: 'E06', category: '蛋餅類', name: '培根蛋餅', price: 45, options: [{ id: 'E06_O1', label: '不加醬', price_delta: 0 }], sort_order: 6 },
  { id: 'E07', category: '蛋餅類', name: '肉鬆蛋餅', price: 40, options: [{ id: 'E07_O1', label: '不加醬', price_delta: 0 }], sort_order: 7 },
  { id: 'E08', category: '蛋餅類', name: '豬排蛋餅', price: 50, options: [{ id: 'E08_O1', label: '不加醬', price_delta: 0 }], sort_order: 8 },
  { id: 'E09', category: '蛋餅類', name: '蛋餅加油條', price: 50, options: [{ id: 'E09_O1', label: '不加醬', price_delta: 0 }], sort_order: 9 },
]

async function main() {
  console.log('清除舊資料...')
  await sql`DELETE FROM menu_items`
  console.log('清除完成')

  console.log(`匯入 ${menuItems.length} 個品項...`)
  for (const item of menuItems) {
    await sql`
      INSERT INTO menu_items (id, category, name, price, options, sort_order)
      VALUES (${item.id}, ${item.category}, ${item.name}, ${item.price}, ${item.options}, ${item.sort_order})
    `
  }

  console.log(`成功匯入 ${menuItems.length} 個品項！`)
  console.log('分類：燒餅類(13) / 饅頭類(9) / 其他類(3) / 飯糰類(8) / 飲料類(7) / 蛋餅類(9)')
  await sql.end()
}

main().catch((err) => {
  console.error('失敗:', err.message)
  process.exit(1)
})
