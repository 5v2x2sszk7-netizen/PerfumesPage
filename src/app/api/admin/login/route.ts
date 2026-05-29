import { adminCookieName, createAdminSessionValue, expectedAdminToken } from "@/lib/adminSession"
import { jsonError, jsonOk, readJsonBody } from "@/lib/apiResponse"
import { checkRateLimit } from "@/lib/rateLimit"

export async function POST(req: Request) {
  const expected = expectedAdminToken()
  if (!expected) return jsonError("Server not configured", 500)

  const rate = await checkRateLimit(req, { keyPrefix: "admin-login", windowMs: 10 * 60 * 1000, max: 20 })
  if (!rate.allowed) {
    return jsonError("Rate limited", 429, {
      headers: {
        "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)),
        "X-RateLimit-Limit": String(rate.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(rate.resetAt / 1000))
      }
    })
  }

  const body = await readJsonBody<{ token?: string }>(req)
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
