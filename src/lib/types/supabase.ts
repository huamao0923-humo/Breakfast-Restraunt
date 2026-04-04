export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      orders: {
        Row: {
          id: string
          table_id: string
          pickup_number: number | null
          items: Json
          total: number
          note: string | null
          status: string
          paid: boolean
          created_at: string
        }
        Insert: {
          id?: string
          table_id: string
          pickup_number?: number | null
          items: Json
          total: number
          note?: string | null
          status?: string
          paid?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          table_id?: string
          pickup_number?: number | null
          items?: Json
          total?: number
          note?: string | null
          status?: string
          paid?: boolean
          created_at?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}
