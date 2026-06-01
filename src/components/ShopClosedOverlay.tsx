'use client'

interface Props {
  message: string
}

export function ShopClosedOverlay({ message }: Props) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen"
      style={{ background: '#F7F4F0', fontFamily: "'Noto Serif TC', serif", padding: '40px 24px' }}
    >
      <div className="w-full max-w-sm text-center">

        <h1 className="text-3xl font-bold tracking-[8px] mb-2" style={{ color: '#3D2B1F' }}>
          忠國豆漿
        </h1>
        <p className="text-sm tracking-[2px] mb-10" style={{ color: '#9C7A5A' }}>
          手工現做・新鮮美味
        </p>

        <div
          className="rounded-3xl"
          style={{
            background: '#FFFDF7',
            border: '2px solid #D4B896',
            boxShadow: '0 4px 20px rgba(92,61,46,0.12)',
            padding: '40px 28px',
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 16 }}>🌙</div>
          <p className="text-lg font-bold mb-3" style={{ color: '#5C3D2E', letterSpacing: '2px' }}>
            目前未營業
          </p>
          <p className="text-base" style={{ color: '#7A5C3A', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {message}
          </p>
        </div>

        <button
          onClick={() => location.reload()}
          className="mt-8 rounded-2xl transition-all active:scale-[0.97]"
          style={{
            background: '#5C3D2E', color: '#F5E6C8',
            padding: '14px 32px',
            fontSize: 14, fontWeight: 'bold', letterSpacing: '3px',
            boxShadow: '0 4px 12px rgba(92,61,46,0.2)',
            border: 'none', cursor: 'pointer',
            fontFamily: "'Noto Serif TC', serif",
          }}
        >
          重新整理
        </button>
      </div>
    </div>
  )
}
