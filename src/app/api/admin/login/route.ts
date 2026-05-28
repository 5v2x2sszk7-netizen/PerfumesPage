import { adminCookieName, createAdminSessionValue, expectedAdminToken } from "@/lib/adminSession"
import { jsonError, jsonOk } from "@/lib/apiResponse"

export async function POST(req: Request) {
  const expected = expectedAdminToken()
  if (!expected) return jsonError("Server not configured", 500)

  const body = (await req.json().catch(() => null)) as { token?: string } | null
  const token = body?.token?.trim()
  if (!token || token !== expected) {
    return jsonError("Unauthorized", 401)
  }

  const value = await createAdminSessionValue(expected)
  const res = jsonOk({})
  res.cookies.set(adminCookieName, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  })
  return res
}
