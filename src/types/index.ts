export interface MenuOption {
  id: string
  label: string
  price_delta: number
}

export interface MenuItem {
  id: string
  name: string
  price: number
  options: MenuOption[]
  sort_order?: number
}

export interface MenuCategory {
  category: string
  items: MenuItem[]
}

export interface CartItemOption {
  id: string
  label: string
  price_delta: number
}

export interface CartItem {
  id: string
  name: string
  price: number
  qty: number
  options: CartItemOption[]
}

export interface OrderItem {
  id: string
  name: string
  qty: number
  price: number
  options: CartItemOption[]
}

export interface Order {
  id: string
  table_id: string
  pickup_number: number | null
  items: OrderItem[]
  total: number
  note: string | null
  status: 'pending' | 'completed' | 'cancelled'
  paid: boolean
  transaction_id?: string | null
  printed_at?: string | null
  created_at: string
}
