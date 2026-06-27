import { siteConfig } from "@/config/site"

const PASSWORD_RESET_TTL_MINUTES = 30

export const passwordResetTtlMs = PASSWORD_RESET_TTL_MINUTES * 60 * 1000

export type PasswordResetDeliveryResult =
  | {
      mode: "email"
    }
  | {
      mode: "preview"
      previewUrl: string
    }

function resolveBaseUrl(origin?: string) {
  const input = origin?.trim() || siteConfig.domain
  if (!input) return "http://localhost:3000"

  try {
    return new URL(input).toString()
  } catch {
    return "http://localhost:3000"
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

export function createPasswordResetExpiry(now = Date.now()) {
  return new Date(now + passwordResetTtlMs).toISOString()
}

export function isPasswordResetExpired(expiresAt: string, now = Date.now()) {
  const expiresAtMs = Date.parse(expiresAt)
  return !Number.isFinite(expiresAtMs) || expiresAtMs <= now
}

export function buildPasswordResetUrl(token: string, origin?: string) {
  const url = new URL("/account/reset-password", resolveBaseUrl(origin))
  url.searchParams.set("token", token)
  return url.toString()
}

export function maskEmailAddress(email: string) {
  const normalized = email.trim().toLowerCase()
  const [localPart = "", domain = ""] = normalized.split("@")
  if (!localPart || !domain) return "tu correo"

  const visibleLocal = localPart.length <= 2 ? localPart[0] || "*" : `${localPart.slice(0, 2)}***`
  const [domainName = "", tld = ""] = domain.split(".")
  const visibleDomain = domainName ? `${domainName.slice(0, 1)}***` : "***"
  return `${visibleLocal}@${visibleDomain}${tld ? `.${tld}` : ""}`
}

export async function sendPasswordResetEmail(input: {
  email: string
  fullName?: string
  resetUrl: string
  expiresAt: string
}): Promise<PasswordResetDeliveryResult> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim()
  const resendFromEmail = process.env.RESEND_FROM_EMAIL?.trim()
  const previewEnabled = process.env.NODE_ENV !== "production"
  const recipientName = input.fullName?.trim() || "Hola"
  const safeName = escapeHtml(recipientName)
  const safeResetUrl = escapeHtml(input.resetUrl)
  const expiresAtLabel = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City"
  }).format(new Date(input.expiresAt))

  const subject = "Recupera tu acceso | MALO Fragances"
  const text = [
    `${recipientName},`,
    "",
    "Recibimos una solicitud para restablecer la contraseña de tu cuenta en MALO Fragances.",
    "Si fuiste tú, abre el siguiente enlace para continuar:",
    input.resetUrl,
    "",
    `Este acceso vence el ${expiresAtLabel} y solo puede usarse una vez.`,
    "",
    "Si no solicitaste este cambio, puedes ignorar este correo con tranquilidad.",
    "",
    "MALO Fragances"
  ].join("\n")
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#f3efe8;padding:32px 16px;color:#111111;">
      <div style="max-width:560px;margin:0 auto;background:linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,246,240,0.98));border:1px solid rgba(17,17,17,0.08);border-radius:28px;overflow:hidden;box-shadow:0 22px 50px rgba(17,17,17,0.08);">
        <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(188,149,79,0.72),transparent);"></div>
        <div style="padding:14px 32px 0;">
          <p style="margin:0;font-size:11px;letter-spacing:0.42em;text-transform:uppercase;color:#1d1d1d;">M A L O</p>
          <p style="margin:6px 0 0;font-size:11px;letter-spacing:0.26em;text-transform:uppercase;color:#6b6256;">Fragances</p>
        </div>
        <div style="padding:28px 32px 32px;">
          <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#7a7267;">Recuperación de acceso</p>
          <h1 style="margin:0 0 16px;font-size:32px;line-height:1.08;font-weight:600;color:#111111;">Restablece tu contraseña</h1>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.8;color:#373737;">${safeName}, recibimos una solicitud para recuperar el acceso a tu cuenta.</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.8;color:#4b453d;">Si fuiste tú, continúa desde el siguiente enlace seguro. Estará disponible solo por una sola ocasión.</p>
          <div style="margin:0 0 24px;">
            <a href="${safeResetUrl}" style="display:inline-block;padding:14px 24px;border-radius:999px;background:#bc954f;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;box-shadow:0 12px 24px rgba(188,149,79,0.24);">Restablecer contraseña</a>
          </div>
          <div style="margin:0 0 24px;border:1px solid rgba(17,17,17,0.08);border-radius:20px;background:rgba(255,255,255,0.68);padding:18px 18px 16px;">
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#7a7267;">Seguridad</p>
            <p style="margin:0;font-size:14px;line-height:1.8;color:#373737;">Este acceso vence el <strong>${escapeHtml(expiresAtLabel)}</strong> y solo puede usarse una vez.</p>
          </div>
          <p style="margin:0 0 8px;font-size:13px;line-height:1.7;color:#666666;">Si el botón no abre, copia y pega este enlace en tu navegador:</p>
          <p style="margin:0;padding:14px 16px;border-radius:18px;background:#ffffff;border:1px solid rgba(17,17,17,0.08);font-size:13px;line-height:1.7;word-break:break-all;color:#111111;">${safeResetUrl}</p>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.8;color:#666666;">Si no solicitaste este cambio, puedes ignorar este correo con tranquilidad.</p>
          <p style="margin:22px 0 0;font-size:12px;line-height:1.8;color:#8a8378;">MALO Fragances</p>
        </div>
      </div>
    </div>
  `.trim()

  if (resendApiKey && resendFromEmail) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [input.email],
        subject,
        html,
        text
      }),
      cache: "no-store"
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      throw new Error(errorText || "No se pudo enviar el correo de recuperación.")
    }

    return { mode: "email" }
  }

  if (!previewEnabled) {
    throw new Error("No hay un proveedor de correo configurado para recuperación de contraseña.")
  }

  console.info(`[password-reset] Preview for ${input.email}: ${input.resetUrl}`)
  return {
    mode: "preview",
    previewUrl: input.resetUrl
  }
}
