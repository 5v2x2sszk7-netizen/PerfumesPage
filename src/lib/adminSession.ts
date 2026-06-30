import { adminCookieName, expectedAdminToken } from "./adminAuthConfig"

export { adminCookieName, expectedAdminToken }

const adminSessionMaxAgeSeconds = 60 * 60 * 12

type AdminSessionPayload = {
  exp: number
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function encodePayload(payload: AdminSessionPayload) {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
}

function decodePayload(value: string): AdminSessionPayload | null {
  try {
    const decoded = new TextDecoder().decode(base64UrlToBytes(value))
    const parsed = JSON.parse(decoded) as Partial<AdminSessionPayload>
    const exp = typeof parsed.exp === "number" ? parsed.exp : 0
    if (!Number.isFinite(exp) || exp <= Date.now()) return null
    return { exp }
  } catch {
    return null
  }
}

export function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function signAdminValue(token: string, encodedPayload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(token),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encodedPayload))
  return bytesToBase64Url(new Uint8Array(sig))
}

export async function createAdminSessionValue(token: string, maxAgeSeconds = adminSessionMaxAgeSeconds) {
  const payload = encodePayload({
    exp: Date.now() + maxAgeSeconds * 1000
  })
  const signature = await signAdminValue(token, payload)
  return `${payload}.${signature}`
}

export async function isValidAdminSessionValue(value: string | undefined | null) {
  const token = expectedAdminToken()
  if (!token || !value) return false
  const [encodedPayload, signature] = value.split(".")
  if (!encodedPayload || !signature) return false
  const payload = decodePayload(encodedPayload)
  if (!payload) return false
  const expectedSignature = await signAdminValue(token, encodedPayload)
  return constantTimeEqual(signature, expectedSignature)
}
