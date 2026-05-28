import { NextResponse } from "next/server"
import { adminCookieName, createAdminSessionValue, expectedAdminToken } from "@/lib/adminSession"

export async function POST(req: Request) {
  const expected = expectedAdminToken()
  if (!expected) return NextResponse.json({ error: "Server not configured" }, { status: 500 })

  const body = (await req.json().catch(() => null)) as { token?: string } | null
  const token = body?.token?.trim()
  if (!token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const value = createAdminSessionValue(expected)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(adminCookieName, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  })
  return res
}

