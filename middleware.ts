import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { adminCookieName, adminSessionMessage, expectedAdminToken } from "./src/lib/adminAuthConfig"

function toHex(bytes: Uint8Array) {
  let out = ""
  for (const b of bytes) out += b.toString(16).padStart(2, "0")
  return out
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function createAdminSessionValue(token: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(token),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(adminSessionMessage))
  return toHex(new Uint8Array(sig))
}

async function isValidAdminSessionValue(value: string | undefined | null) {
  const token = expectedAdminToken()
  if (!token || !value) return false
  const expected = await createAdminSessionValue(token)
  return constantTimeEqual(value, expected)
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  if (pathname.startsWith("/api/admin/login") || pathname.startsWith("/api/admin/logout")) {
    return NextResponse.next()
  }
  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next()
  }

  const cookieValue = req.cookies.get(adminCookieName)?.value
  const ok = await isValidAdminSessionValue(cookieValue)

  if (pathname.startsWith("/api/admin/")) {
    if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    return NextResponse.next()
  }

  if (pathname.startsWith("/admin")) {
    if (ok) return NextResponse.next()
    const url = req.nextUrl.clone()
    url.pathname = "/admin/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
}
