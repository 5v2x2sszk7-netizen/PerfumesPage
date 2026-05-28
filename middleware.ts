import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { adminCookieName, expectedAdminToken } from "./src/lib/adminAuthConfig"
import { constantTimeEqual, isValidAdminSessionValue } from "./src/lib/adminSession"

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  if (pathname.startsWith("/api/admin/login") || pathname.startsWith("/api/admin/logout")) {
    return NextResponse.next()
  }
  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next()
  }

  const token = expectedAdminToken()
  const cookieValue = req.cookies.get(adminCookieName)?.value
  const hasSession = await isValidAdminSessionValue(cookieValue)
  const authHeader = req.headers.get("authorization")?.trim() ?? ""
  const bearer = authHeader.replace(/^Bearer\s+/i, "").trim()
  const hasBearerToken = Boolean(token && bearer && constantTimeEqual(bearer, token))
  const ok = hasSession || hasBearerToken

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
