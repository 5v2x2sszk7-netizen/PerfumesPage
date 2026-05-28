import { adminCookieName, adminSessionMessage, expectedAdminToken } from "./adminAuthConfig"

export { adminCookieName, expectedAdminToken }

function toHex(bytes: Uint8Array) {
  let out = ""
  for (const b of bytes) out += b.toString(16).padStart(2, "0")
  return out
}

export function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function createAdminSessionValue(token: string) {
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

export async function isValidAdminSessionValue(value: string | undefined | null) {
  const token = expectedAdminToken()
  if (!token || !value) return false
  const expected = await createAdminSessionValue(token)
  return constantTimeEqual(value, expected)
}
