import { jsonError, jsonNoStoreOk, readJsonBody } from "@/lib/apiResponse"
import { readFileSync } from "node:fs"
import { createPasswordResetToken, hashPasswordResetToken, normalizeCustomerEmail } from "@/lib/customerAuth"
import { buildPasswordResetUrl, createPasswordResetExpiry, sendPasswordResetEmail } from "@/lib/passwordReset"
import { isPersistenceNotConfiguredError } from "@/lib/persistence"
import { checkRateLimit } from "@/lib/rateLimit"
import { readCustomers, withCustomersLock, writeCustomers } from "@/lib/stores/customers"

type ForgotPasswordBody = {
  email?: string
}

export async function POST(req: Request) {
  const debugMode = req.headers.get("x-debug-admin") === process.env.ADMIN_TOKEN?.trim()
  const debug = {
    hasUpstashUrl: Boolean(process.env.UPSTASH_REDIS_REST_URL?.trim()),
    hasUpstashToken: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN?.trim()),
    hasResendApiKey: Boolean(process.env.RESEND_API_KEY?.trim()),
    hasResendFromEmail: Boolean(process.env.RESEND_FROM_EMAIL?.trim()),
    customerIndex: -1,
    customersCount: 0,
    emailJobCreated: false,
    deliveryMode: "" as "" | "email" | "preview"
  }
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

  try {
    await withCustomersLock(async () => {
      const customers = await readCustomers()
      const customerIndex = customers.findIndex((entry) => entry.email === email)
      debug.customerIndex = customerIndex
      debug.customersCount = customers.length
      // #region debug-point A:customer-match
      ;(() => {
        let u = "http://127.0.0.1:7777/event"
        let s = "password-email-delivery"
        try {
          const e = readFileSync(".dbg/password-email-delivery.env", "utf8")
          u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u
          s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s
        } catch {}
        fetch(u, {
          method: "POST",
          body: JSON.stringify({
            sessionId: s,
            runId: "pre-fix",
            hypothesisId: "A",
            location: "forgot/route.ts:customerIndex",
            msg: "[DEBUG] customer lookup completed",
            data: { email, customerIndex, totalCustomers: customers.length },
            ts: Date.now()
          })
        }).catch(() => {})
      })()
      // #endregion
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
      // #region debug-point B:token-persisted
      ;(() => {
        let u = "http://127.0.0.1:7777/event"
        let s = "password-email-delivery"
        try {
          const e = readFileSync(".dbg/password-email-delivery.env", "utf8")
          u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u
          s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s
        } catch {}
        fetch(u, {
          method: "POST",
          body: JSON.stringify({
            sessionId: s,
            runId: "pre-fix",
            hypothesisId: "B",
            location: "forgot/route.ts:writeCustomers",
            msg: "[DEBUG] password reset token persisted",
            data: { email: customer.email, requestedAt, expiresAt },
            ts: Date.now()
          })
        }).catch(() => {})
      })()
      // #endregion

      emailJob = {
        email: customer.email,
        fullName: customer.profile.fullName,
        resetUrl: buildPasswordResetUrl(token, requestOrigin),
        expiresAt
      }
      debug.emailJobCreated = true
    })
  } catch (error) {
    if (isPersistenceNotConfiguredError(error)) {
      return jsonError(error.message, 501)
    }
    throw error
  }

  let previewUrl: string | undefined
  if (emailJob) {
    const currentEmailJob: { email: string; fullName: string; resetUrl: string; expiresAt: string } = emailJob
    // #region debug-point C:email-job-ready
    ;(() => {
      let u = "http://127.0.0.1:7777/event"
      let s = "password-email-delivery"
      try {
        const e = readFileSync(".dbg/password-email-delivery.env", "utf8")
        u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u
        s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s
      } catch {}
      fetch(u, {
        method: "POST",
        body: JSON.stringify({
          sessionId: s,
          runId: "pre-fix",
          hypothesisId: "C",
          location: "forgot/route.ts:beforeSend",
          msg: "[DEBUG] email job ready for delivery",
          data: { email: currentEmailJob.email, expiresAt: currentEmailJob.expiresAt },
          ts: Date.now()
        })
      }).catch(() => {})
    })()
    // #endregion
    try {
      const delivery = await sendPasswordResetEmail(currentEmailJob)
      debug.deliveryMode = delivery.mode
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
    ...(debugMode ? { debug } : {}),
    ...(previewUrl ? { previewUrl } : {})
  })
}
