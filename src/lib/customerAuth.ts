import { createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"
import { evaluatePassword } from "@/lib/passwordPolicy"

const scrypt = promisify(scryptCallback)

export const customerCookieName = "perfimes_customer"

export type CustomerSessionPayload = {
  customerId: string
  email: string
  exp: number
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url")
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8")
}

function sessionSecret() {
  return (
    process.env.CUSTOMER_SESSION_SECRET?.trim() ||
    process.env.ADMIN_TOKEN?.trim() ||
    "perfimes-local-customer-session"
  )
}

function signValue(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("hex")
}

export function normalizeCustomerEmail(value: string) {
  return value.trim().toLowerCase()
}

export function validateCustomerPassword(password: string) {
  return evaluatePassword(password).ok
}

export async function hashCustomerPassword(password: string) {
  const salt = randomBytes(16).toString("hex")
  const derived = (await scrypt(password, salt, 64)) as Buffer
  return {
    passwordSalt: salt,
    passwordHash: derived.toString("hex")
  }
}

export async function verifyCustomerPassword(input: string, passwordHash: string, passwordSalt: string) {
  const derived = (await scrypt(input, passwordSalt, 64)) as Buffer
  const expected = Buffer.from(passwordHash, "hex")
  if (derived.length !== expected.length) return false
  return timingSafeEqual(derived, expected)
}

export function createPasswordResetToken() {
  return randomBytes(32).toString("base64url")
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export function createCustomerSessionValue(input: { customerId: string; email: string; maxAgeSeconds?: number }) {
  const payload: CustomerSessionPayload = {
    customerId: input.customerId,
    email: normalizeCustomerEmail(input.email),
    exp: Date.now() + (input.maxAgeSeconds ?? 60 * 60 * 24 * 30) * 1000
  }
  const encoded = toBase64Url(JSON.stringify(payload))
  return `${encoded}.${signValue(encoded)}`
}

export function readCustomerSessionValue(value: string | undefined | null): CustomerSessionPayload | null {
  if (!value) return null
  const [encoded, signature] = value.split(".")
  if (!encoded || !signature) return null
  const expected = signValue(encoded)
  const a = Buffer.from(signature, "utf8")
  const b = Buffer.from(expected, "utf8")
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const parsed = JSON.parse(fromBase64Url(encoded)) as Partial<CustomerSessionPayload>
    const customerId = typeof parsed.customerId === "string" ? parsed.customerId.trim() : ""
    const email = typeof parsed.email === "string" ? normalizeCustomerEmail(parsed.email) : ""
    const exp = typeof parsed.exp === "number" ? parsed.exp : 0
    if (!customerId || !email || !Number.isFinite(exp) || exp <= Date.now()) return null
    return { customerId, email, exp }
  } catch {
    return null
  }
}
