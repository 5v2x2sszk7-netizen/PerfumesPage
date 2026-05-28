import crypto from "node:crypto"
import { adminCookieName, adminSessionMessage, expectedAdminToken } from "@/lib/adminAuthConfig"

export { adminCookieName, expectedAdminToken }

export function createAdminSessionValue(token: string) {
  return crypto.createHmac("sha256", token).update(adminSessionMessage).digest("hex")
}

export function isValidAdminSessionValue(value: string | undefined | null) {
  const token = expectedAdminToken()
  if (!token || !value) return false
  const expected = createAdminSessionValue(token)
  const a = Buffer.from(value)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
