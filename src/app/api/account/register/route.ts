import { jsonError, jsonNoStoreOk, readJsonBody } from "@/lib/apiResponse"
import {
  createCustomerSessionValue,
  customerCookieName,
  hashCustomerPassword,
  normalizeCustomerEmail,
  validateCustomerPassword
} from "@/lib/customerAuth"
import { normalizeCustomerProfileInput } from "@/lib/customerAccount"
import { passwordPolicyHint } from "@/lib/passwordPolicy"
import { checkRateLimit } from "@/lib/rateLimit"
import { readCustomers, toPublicCustomer, type CustomerRecord, withCustomersLock, writeCustomers } from "@/lib/stores/customers"

type RegisterBody = {
  email?: string
  password?: string
  profile?: {
    fullName?: string
    email?: string
    phone?: string
    addressLine1?: string
    addressLine2?: string
    neighborhood?: string
    city?: string
    state?: string
    postalCode?: string
  }
}

export async function POST(req: Request) {
  const rate = await checkRateLimit(req, { keyPrefix: "customer-register", windowMs: 10 * 60 * 1000, max: 20 })
  if (!rate.allowed) {
    return jsonError("Demasiados intentos. Intenta de nuevo en unos minutos.", 429, {
      headers: {
        "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000))
      }
    })
  }

  const body = await readJsonBody<RegisterBody>(req)
  const email = normalizeCustomerEmail(body?.email || "")
  const password = body?.password || ""
  const profile = normalizeCustomerProfileInput(body?.profile, email)

  if (!email || !email.includes("@")) return jsonError("Ingresa un correo valido.", 400)
  if (!validateCustomerPassword(password)) return jsonError(`Contrasena invalida. ${passwordPolicyHint()}`, 400)
  if (!profile) return jsonError("Completa al menos tu nombre para crear la cuenta.", 400)

  let created: CustomerRecord | null = null
  let alreadyExists = false

  await withCustomersLock(async () => {
    const customers = await readCustomers()
    if (customers.some((entry) => entry.email === email)) {
      alreadyExists = true
      return
    }

    const now = new Date().toISOString()
    const passwordData = await hashCustomerPassword(password)
    created = {
      id: globalThis.crypto?.randomUUID?.() || `customer-${Date.now()}`,
      email,
      passwordHash: passwordData.passwordHash,
      passwordSalt: passwordData.passwordSalt,
      createdAt: now,
      updatedAt: now,
      profile: {
        ...profile,
        email
      }
    }

    await writeCustomers([created, ...customers])
  })

  if (alreadyExists) return jsonError("Ya existe una cuenta con ese correo.", 409)
  if (!created) return jsonError("No se pudo crear la cuenta.", 500)
  const customer = created as CustomerRecord

  const res = jsonNoStoreOk({
    customer: toPublicCustomer(customer)
  })
  res.cookies.set(customerCookieName, createCustomerSessionValue({ customerId: customer.id, email }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  })
  return res
}
