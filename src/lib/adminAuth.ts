import { NextResponse } from "next/server"
import { adminCookieName, expectedAdminToken, getCookieValue, isValidAdminSessionValue } from "@/lib/adminSession"

export function requireAdmin(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")?.trim()
  const expected = expectedAdminToken()
  const cookieHeader = req.headers.get("cookie")
  const cookieValue = getCookieValue(cookieHeader, adminCookieName)
  const hasSession = isValidAdminSessionValue(cookieValue)

  if (!expected || (!hasSession && token !== expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
