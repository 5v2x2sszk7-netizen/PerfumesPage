import { jsonError, jsonNoStoreOk, readJsonBody } from "@/lib/apiResponse"
import { createPasswordResetToken, hashPasswordResetToken, normalizeCustomerEmail } from "@/lib/customerAuth"
import { buildPasswordResetUrl, createPasswordResetExpiry, sendPasswordResetEmail } from "@/lib/passwordReset"
import { checkRateLimit } from "@/lib/rateLimit"
import { readCustomers, withCustomersLock, writeCustomers } from "@/lib/stores/customers"

type ForgotPasswordBody = {
  email?: string
}

export async function POST(req: Request) {
  const rate = await checkRateLimit(req, { keyPrefix: "customer-password-forgot", windowMs: 15 * 60 * 1000, max: 8 })
  if (!rate.allowed) {
    return jsonError("Demasiados intentos. Intenta de nuevo en unos minutos.", 429, {
      headers: {
        "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000))
      }
    })
  }

  const body = await readJsonBody<ForgotPasswordBody>(req)
  const email = normalizeCustomerEmail(body?.email || "")
  if (!email || !email.includes("@")) return jsonError("Ingresa un correo válido.", 400)

  const successMessage =
    "Si encontramos una cuenta con ese correo, te enviaremos un enlace para restablecer tu contraseña."
  const requestOrigin = new URL(req.url).origin

  let emailJob:
    | {
        email: string
        fullName: string
        resetUrl: string
        expiresAt: string
      }
    | null = null

  await withCustomersLock(async () => {
    const customers = await readCustomers()
    const customerIndex = customers.findIndex((entry) => entry.email === email)
    if (customerIndex === -1) return

    const token = createPasswordResetToken()
    const requestedAt = new Date().toISOString()
    const expiresAt = createPasswordResetExpiry()
    const customer = customers[customerIndex]

    customers[customerIndex] = {
      ...customer,
      passwordResetTokenHash: hashPasswordResetToken(token),
      passwordResetExpiresAt: expiresAt,
      passwordResetRequestedAt: requestedAt,
      updatedAt: requestedAt
    }
    await writeCustomers(customers)

    emailJob = {
      email: customer.email,
      fullName: customer.profile.fullName,
      resetUrl: buildPasswordResetUrl(token, requestOrigin),
      expiresAt
    }
  })

  let previewUrl: string | undefined
  if (emailJob) {
    try {
      const delivery = await sendPasswordResetEmail(emailJob)
      if (delivery.mode === "preview") {
        previewUrl = delivery.previewUrl
      }
    } catch (error) {
      console.error("[password-reset] Failed to send recovery email", error)
      return jsonError("No se pudo enviar el enlace de recuperación.", 500)
    }
  }

  return jsonNoStoreOk({
    message: successMessage,
    ...(previewUrl ? { previewUrl } : {})
  })
}
