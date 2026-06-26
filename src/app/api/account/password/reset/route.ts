import { jsonError, jsonNoStoreOk, readJsonBody } from "@/lib/apiResponse"
import {
  createCustomerSessionValue,
  customerCookieName,
  hashCustomerPassword,
  hashPasswordResetToken,
  validateCustomerPassword
} from "@/lib/customerAuth"
import { maskEmailAddress, isPasswordResetExpired } from "@/lib/passwordReset"
import { passwordPolicyHint } from "@/lib/passwordPolicy"
import { checkRateLimit } from "@/lib/rateLimit"
import { readCustomers, toPublicCustomer, type CustomerRecord, withCustomersLock, writeCustomers } from "@/lib/stores/customers"

type ResetPasswordBody = {
  token?: string
  password?: string
}

function findCustomerByResetToken(customers: CustomerRecord[], token: string) {
  const tokenHash = hashPasswordResetToken(token)
  return customers.find(
    (customer) =>
      customer.passwordResetTokenHash === tokenHash &&
      customer.passwordResetExpiresAt &&
      !isPasswordResetExpired(customer.passwordResetExpiresAt)
  )
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")?.trim() || ""
  if (!token) return jsonError("El enlace de recuperación no es válido.", 400)

  const customer = findCustomerByResetToken(await readCustomers(), token)
  if (!customer || !customer.passwordResetExpiresAt) {
    return jsonError("El enlace de recuperación no es válido o ya expiró.", 400)
  }

  return jsonNoStoreOk({
    valid: true,
    emailHint: maskEmailAddress(customer.email),
    expiresAt: customer.passwordResetExpiresAt
  })
}

export async function POST(req: Request) {
  const rate = await checkRateLimit(req, { keyPrefix: "customer-password-reset", windowMs: 15 * 60 * 1000, max: 12 })
  if (!rate.allowed) {
    return jsonError("Demasiados intentos. Intenta de nuevo en unos minutos.", 429, {
      headers: {
        "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000))
      }
    })
  }

  const body = await readJsonBody<ResetPasswordBody>(req)
  const token = body?.token?.trim() || ""
  const password = body?.password || ""

  if (!token) return jsonError("El enlace de recuperación no es válido.", 400)
  if (!validateCustomerPassword(password)) {
    return jsonError(`Contraseña inválida. ${passwordPolicyHint()}`, 400)
  }

  let updatedCustomer: CustomerRecord | null = null

  await withCustomersLock(async () => {
    const customers = await readCustomers()
    const customer = findCustomerByResetToken(customers, token)
    if (!customer) return

    const customerIndex = customers.findIndex((entry) => entry.id === customer.id)
    if (customerIndex === -1) return

    const passwordData = await hashCustomerPassword(password)
    const now = new Date().toISOString()

    updatedCustomer = {
      ...customer,
      passwordHash: passwordData.passwordHash,
      passwordSalt: passwordData.passwordSalt,
      passwordResetTokenHash: undefined,
      passwordResetExpiresAt: undefined,
      passwordResetRequestedAt: undefined,
      lastLoginAt: now,
      updatedAt: now
    }
    customers[customerIndex] = updatedCustomer
    await writeCustomers(customers)
  })

  if (!updatedCustomer) {
    return jsonError("El enlace de recuperación no es válido o ya expiró.", 400)
  }

  const customer = updatedCustomer as CustomerRecord
  const response = jsonNoStoreOk({
    customer: toPublicCustomer(customer)
  })
  response.cookies.set(
    customerCookieName,
    createCustomerSessionValue({ customerId: customer.id, email: customer.email }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    }
  )

  return response
}
