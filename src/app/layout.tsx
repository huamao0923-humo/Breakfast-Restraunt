import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '早餐點餐系統',
  description: '家庭早餐店點餐系統',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  )
}
