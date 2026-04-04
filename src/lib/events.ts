type Listener = (data: string) => void

const subs = new Map<string, Set<Listener>>()

export function subscribe(channel: string, fn: Listener) {
  if (!subs.has(channel)) subs.set(channel, new Set())
  subs.get(channel)!.add(fn)
}

export function unsubscribe(channel: string, fn: Listener) {
  subs.get(channel)?.delete(fn)
}

export function emit(channel: string, event: string, payload: unknown) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
  subs.get(channel)?.forEach((fn) => {
    try { fn(msg) } catch {}
  })
}
