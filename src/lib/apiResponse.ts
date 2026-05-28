import { NextResponse } from "next/server"

type HeadersInitLike = HeadersInit | undefined

function mergeHeaders(base: HeadersInitLike, extra: HeadersInitLike) {
  const headers = new Headers(base)
  if (extra) {
    const h = new Headers(extra)
    h.forEach((value, key) => headers.set(key, value))
  }
  return headers
}

export function jsonOk<T extends Record<string, unknown>>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, ...data }, init)
}

export function jsonError(message: string, status = 400, init?: ResponseInit) {
  const headers = mergeHeaders(init?.headers, undefined)
  return NextResponse.json({ ok: false, error: message }, { ...init, status, headers })
}

export function jsonNoStoreOk<T extends Record<string, unknown>>(data: T, init?: ResponseInit) {
  const headers = mergeHeaders(init?.headers, { "Cache-Control": "no-store, max-age=0" })
  return NextResponse.json({ ok: true, ...data }, { ...init, headers })
}

export function jsonNoStoreError(message: string, status = 400, init?: ResponseInit) {
  const headers = mergeHeaders(init?.headers, { "Cache-Control": "no-store, max-age=0" })
  return NextResponse.json({ ok: false, error: message }, { ...init, status, headers })
}
