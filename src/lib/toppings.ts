import type { MenuOption } from '@/types'

export const TOPPING_CATEGORIES = new Set([
  '燒餅類',
  '飯糰類',
  '蛋餅類',
  '饅頭類',
])

export const TOPPINGS: MenuOption[] = [
  { id: 'B1',  label: '油條',        price_delta: 15 },
  { id: 'B2',  label: '荷包蛋',      price_delta: 15 },
  { id: 'B3',  label: '蔥蛋',        price_delta: 15 },
  { id: 'B4',  label: '老油條(一節)', price_delta:  5 },
  { id: 'B5',  label: '起司',        price_delta: 10 },
  { id: 'B6',  label: '玉米',        price_delta: 10 },
  { id: 'B7',  label: '培根',        price_delta: 15 },
  { id: 'B8',  label: '豬排',        price_delta: 20 },
  { id: 'B9',  label: '九層塔',      price_delta:  5 },
  { id: 'B10', label: '高麗菜',      price_delta:  5 },
  { id: 'B11', label: '菜脯',        price_delta: 10 },
]
