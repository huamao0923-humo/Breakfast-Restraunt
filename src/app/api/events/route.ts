import { subscribe, unsubscribe } from '@/lib/events'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const channel = new URL(req.url).searchParams.get('channel') ?? 'global'

  const stream = new TransformStream()
  const writer = stream.writable.getWriter()
  const enc = new TextEncoder()

  const send = (data: string) => {
    try { writer.write(enc.encode(data)) } catch {}
  }

  subscribe(channel, send)

  req.signal.addEventListener('abort', () => {
    unsubscribe(channel, send)
    try { writer.close() } catch {}
  })

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
