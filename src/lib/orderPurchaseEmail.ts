import { siteConfig } from "@/config/site"
import { formatCustomerOrderNumber } from "@/lib/orderPresentation"
import type { ConfirmedOrderRecord } from "@/lib/stores/orders"
import type { CheckoutOrderRecord } from "@/lib/stores/checkoutOrders"

type EmailDeliveryResult =
  | { mode: "email" }
  | { mode: "preview"; previewUrl: string }
  | { mode: "skipped"; reason: string }

function resolveBaseUrl() {
  const input = siteConfig.domain.trim()
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

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City"
  }).format(new Date(value))
}

function buildAccountOrderUrl(orderId: string) {
  const url = new URL("/account", resolveBaseUrl())
  url.hash = `order-${orderId}`
  return url.toString()
}

function buildItemsSummary(order: ConfirmedOrderRecord) {
  return order.items.map((item) => `${item.brand} ${item.name} ${item.sizeMl} ml x${item.quantity}`).join(" | ")
}

function buildReservationItemsSummary(order: CheckoutOrderRecord) {
  return order.items.map((item) => `${item.brand} ${item.name} ${item.sizeMl} ml x${item.quantity}`).join(" | ")
}

function getReservationExpiresAtLabel(order: CheckoutOrderRecord) {
  const explicit = order.reservationExpiresAt ? new Date(order.reservationExpiresAt).getTime() : Number.NaN
  const createdAtMs = new Date(order.createdAt).getTime()
  const fallback = Number.isNaN(createdAtMs) ? Date.now() : createdAtMs + 10 * 60_000
  const targetMs = Number.isNaN(explicit) ? fallback : explicit
  return formatDateLabel(new Date(targetMs).toISOString())
}

function resolveEmailConfig() {
  return {
    resendApiKey: process.env.RESEND_API_KEY?.trim() || "",
    resendFromEmail: process.env.RESEND_FROM_EMAIL?.trim() || "",
    previewEnabled: process.env.NODE_ENV !== "production"
  }
}

async function sendEmail(input: {
  to: string[]
  subject: string
  html: string
  text: string
}) {
  const { resendApiKey, resendFromEmail, previewEnabled } = resolveEmailConfig()
  if (resendApiKey && resendFromEmail) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text
      }),
      cache: "no-store"
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      throw new Error(errorText || "No se pudo enviar el correo.")
    }

    return { mode: "email" } satisfies EmailDeliveryResult
  }

  if (!previewEnabled) {
    return { mode: "skipped", reason: "No hay un proveedor de correo configurado." } satisfies EmailDeliveryResult
  }

  return {
    mode: "preview",
    previewUrl: resolveBaseUrl()
  } satisfies EmailDeliveryResult
}

export async function sendCustomerPurchaseConfirmationEmail(order: ConfirmedOrderRecord): Promise<EmailDeliveryResult> {
  const customerEmail = order.customer.email.trim()
  if (!customerEmail) {
    return { mode: "skipped", reason: "La orden no tiene correo de cliente." }
  }

  const customerName = order.customer.fullName.trim() || "Hola"
  const orderNumber = formatCustomerOrderNumber(order.id)
  const completedAtLabel = formatDateLabel(order.completedAt)
  const itemsSummary = buildItemsSummary(order)
  const accountOrderUrl = order.checkoutMode === "account" || order.customerId ? buildAccountOrderUrl(order.id) : ""
  const safeName = escapeHtml(customerName)
  const safeOrderNumber = escapeHtml(orderNumber)
  const safeItemsSummary = escapeHtml(itemsSummary)
  const safeOrderUrl = escapeHtml(accountOrderUrl)
  const safeCompletedAtLabel = escapeHtml(completedAtLabel)
  const subject = `${safeOrderNumber} · Compra confirmada | ${siteConfig.name}`
  const text = [
    `${customerName},`,
    "",
    `Recibimos tu compra correctamente en ${siteConfig.name}.`,
    `Pedido: ${orderNumber}.`,
    `Total: $${order.total.toFixed(2)} ${siteConfig.currency}.`,
    `Proveedor: ${order.provider === "paypal" ? "PayPal" : "Mercado Pago"}.`,
    `Confirmado el ${completedAtLabel}.`,
    "",
    "Resumen del pedido:",
    itemsSummary,
    "",
    accountOrderUrl ? `Puedes revisar tu pedido aquí: ${accountOrderUrl}` : "Te notificaremos por correo cuando cambie el estado de tu pedido.",
    "",
    siteConfig.name
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
          <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#7a7267;">Compra confirmada</p>
          <h1 style="margin:0 0 16px;font-size:32px;line-height:1.08;font-weight:600;color:#111111;">Tu pedido ya fue recibido</h1>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.8;color:#373737;">${safeName}, confirmamos correctamente tu compra en ${escapeHtml(siteConfig.name)}.</p>
          <div style="margin:0 0 24px;border:1px solid rgba(17,17,17,0.08);border-radius:20px;background:rgba(255,255,255,0.68);padding:18px 18px 16px;">
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#7a7267;">Pedido</p>
            <p style="margin:0;font-size:14px;line-height:1.8;color:#373737;"><strong>${safeOrderNumber}</strong><br /><strong>Total:</strong> $${order.total.toFixed(2)} ${siteConfig.currency}<br /><strong>Pago:</strong> ${escapeHtml(order.provider === "paypal" ? "PayPal" : "Mercado Pago")}<br /><strong>Confirmado:</strong> ${safeCompletedAtLabel}</p>
          </div>
          ${
            accountOrderUrl
              ? `<div style="margin:0 0 24px;"><a href="${safeOrderUrl}" style="display:inline-block;padding:14px 24px;border-radius:999px;background:#bc954f;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;box-shadow:0 12px 24px rgba(188,149,79,0.24);">Ver mi pedido</a></div>`
              : ""
          }
          <p style="margin:0 0 8px;font-size:13px;line-height:1.7;color:#666666;">Resumen:</p>
          <p style="margin:0;padding:14px 16px;border-radius:18px;background:#ffffff;border:1px solid rgba(17,17,17,0.08);font-size:13px;line-height:1.7;word-break:break-word;color:#111111;">${safeItemsSummary}</p>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.8;color:#666666;">Te notificaremos por correo cuando el pedido avance a preparación, envío o entrega.</p>
          <p style="margin:22px 0 0;font-size:12px;line-height:1.8;color:#8a8378;">${escapeHtml(siteConfig.name)}</p>
        </div>
      </div>
    </div>
  `.trim()

  const result = await sendEmail({
    to: [customerEmail],
    subject,
    html,
    text
  })

  if (result.mode === "preview") {
    console.info(`[purchase-confirmation-email] Preview for ${customerEmail}: ${accountOrderUrl || resolveBaseUrl()}`)
  }
  return result
}

function readAdminRecipients() {
  return (process.env.ORDER_NOTIFICATION_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export async function sendAdminCriticalReservationAlertEmail(orders: CheckoutOrderRecord[]): Promise<EmailDeliveryResult> {
  const recipients = readAdminRecipients()
  if (!recipients.length) {
    return { mode: "skipped", reason: "No hay un correo interno configurado para reservas criticas." }
  }
  if (!orders.length) {
    return { mode: "skipped", reason: "No hay reservas criticas para notificar." }
  }

  const subject =
    orders.length === 1
      ? `Reserva critica · ${formatCustomerOrderNumber(orders[0].id)} | ${siteConfig.name}`
      : `${orders.length} reservas criticas | ${siteConfig.name}`
  const text = [
    orders.length === 1 ? "Una reserva entro a la ventana critica de 5 minutos." : `${orders.length} reservas entraron a la ventana critica de 5 minutos.`,
    "",
    ...orders.flatMap((order) => [
      `Reserva: ${formatCustomerOrderNumber(order.id)}.`,
      `Cliente: ${order.customer.fullName}.`,
      `Correo: ${order.customer.email}.`,
      `Telefono: ${order.customer.phone}.`,
      `Proveedor: ${order.provider === "paypal" ? "PayPal" : "Mercado Pago"}.`,
      `Vence: ${getReservationExpiresAtLabel(order)}.`,
      `Productos: ${buildReservationItemsSummary(order)}.`,
      ""
    ])
  ].join("\n")

  const cards = orders
    .map((order) => {
      const orderNumber = escapeHtml(formatCustomerOrderNumber(order.id))
      const customerName = escapeHtml(order.customer.fullName)
      const customerEmail = escapeHtml(order.customer.email)
      const customerPhone = escapeHtml(order.customer.phone)
      const provider = escapeHtml(order.provider === "paypal" ? "PayPal" : "Mercado Pago")
      const expiresAt = escapeHtml(getReservationExpiresAtLabel(order))
      const itemsSummary = escapeHtml(buildReservationItemsSummary(order))

      return `
        <div style="margin:0 0 16px;border:1px solid rgba(17,17,17,0.08);border-radius:20px;background:#ffffff;padding:18px 18px 16px;">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#7a7267;">${orderNumber}</p>
          <p style="margin:0;font-size:14px;line-height:1.8;color:#373737;"><strong>${customerName}</strong><br />${customerEmail}<br />${customerPhone}<br /><strong>Pago:</strong> ${provider}<br /><strong>Vence:</strong> ${expiresAt}</p>
          <p style="margin:14px 0 0;font-size:13px;line-height:1.7;color:#111111;">${itemsSummary}</p>
        </div>
      `.trim()
    })
    .join("")

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#f3efe8;padding:32px 16px;color:#111111;">
      <div style="max-width:620px;margin:0 auto;background:linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,246,240,0.98));border:1px solid rgba(17,17,17,0.08);border-radius:28px;overflow:hidden;box-shadow:0 22px 50px rgba(17,17,17,0.08);">
        <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(188,149,79,0.72),transparent);"></div>
        <div style="padding:14px 32px 0;">
          <p style="margin:0;font-size:11px;letter-spacing:0.42em;text-transform:uppercase;color:#1d1d1d;">M A L O</p>
          <p style="margin:6px 0 0;font-size:11px;letter-spacing:0.26em;text-transform:uppercase;color:#6b6256;">Fragances</p>
        </div>
        <div style="padding:28px 32px 32px;">
          <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#7a7267;">Reserva critica</p>
          <h1 style="margin:0 0 16px;font-size:32px;line-height:1.08;font-weight:600;color:#111111;">${escapeHtml(
            orders.length === 1 ? "Una reserva esta por expirar" : `${orders.length} reservas estan por expirar`
          )}</h1>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.8;color:#373737;">Se detecto una reserva dentro de la ventana critica de 5 minutos. Revisa el panel admin para confirmar o liberar a tiempo.</p>
          ${cards}
        </div>
      </div>
    </div>
  `.trim()

  const result = await sendEmail({
    to: recipients,
    subject,
    html,
    text
  })

  if (result.mode === "preview") {
    console.info(`[admin-critical-reservation-email] Preview for ${recipients.join(", ")}: ${resolveBaseUrl()}/admin`)
  }
  return result
}

export async function sendAdminNewOrderNotificationEmail(order: ConfirmedOrderRecord): Promise<EmailDeliveryResult> {
  const recipients = readAdminRecipients()
  if (!recipients.length) {
    return { mode: "skipped", reason: "No hay un correo interno configurado para nuevas compras." }
  }

  const orderNumber = formatCustomerOrderNumber(order.id)
  const completedAtLabel = formatDateLabel(order.completedAt)
  const itemsSummary = buildItemsSummary(order)
  const customerAddress = [
    order.customer.addressLine1,
    order.customer.addressLine2,
    order.customer.neighborhood,
    `${order.customer.city}, ${order.customer.state}`,
    order.customer.postalCode
  ]
    .filter(Boolean)
    .join(", ")
  const accountOrderUrl = buildAccountOrderUrl(order.id)
  const safeOrderNumber = escapeHtml(orderNumber)
  const safeItemsSummary = escapeHtml(itemsSummary)
  const safeCustomerName = escapeHtml(order.customer.fullName)
  const safeCustomerEmail = escapeHtml(order.customer.email)
  const safeCustomerPhone = escapeHtml(order.customer.phone)
  const safeCustomerAddress = escapeHtml(customerAddress)
  const safeOrderUrl = escapeHtml(accountOrderUrl)
  const safeCompletedAtLabel = escapeHtml(completedAtLabel)
  const subject = `${safeOrderNumber} · Nueva compra recibida | ${siteConfig.name}`
  const text = [
    "Nueva compra confirmada.",
    "",
    `Pedido: ${orderNumber}.`,
    `Cliente: ${order.customer.fullName}.`,
    `Correo: ${order.customer.email}.`,
    `Teléfono: ${order.customer.phone}.`,
    `Total: $${order.total.toFixed(2)} ${siteConfig.currency}.`,
    `Proveedor: ${order.provider === "paypal" ? "PayPal" : "Mercado Pago"}.`,
    `Confirmado el ${completedAtLabel}.`,
    "",
    `Dirección: ${customerAddress}`,
    "",
    "Resumen del pedido:",
    itemsSummary,
    "",
    `Revisa la orden en: ${accountOrderUrl}`
  ].join("\n")

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#f3efe8;padding:32px 16px;color:#111111;">
      <div style="max-width:620px;margin:0 auto;background:linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,246,240,0.98));border:1px solid rgba(17,17,17,0.08);border-radius:28px;overflow:hidden;box-shadow:0 22px 50px rgba(17,17,17,0.08);">
        <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(188,149,79,0.72),transparent);"></div>
        <div style="padding:14px 32px 0;">
          <p style="margin:0;font-size:11px;letter-spacing:0.42em;text-transform:uppercase;color:#1d1d1d;">M A L O</p>
          <p style="margin:6px 0 0;font-size:11px;letter-spacing:0.26em;text-transform:uppercase;color:#6b6256;">Fragances</p>
        </div>
        <div style="padding:28px 32px 32px;">
          <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#7a7267;">Nueva compra</p>
          <h1 style="margin:0 0 16px;font-size:32px;line-height:1.08;font-weight:600;color:#111111;">${safeOrderNumber}</h1>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.8;color:#373737;">Se confirmó una nueva compra en ${escapeHtml(siteConfig.name)}.</p>
          <div style="margin:0 0 24px;border:1px solid rgba(17,17,17,0.08);border-radius:20px;background:rgba(255,255,255,0.68);padding:18px 18px 16px;">
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#7a7267;">Resumen</p>
            <p style="margin:0;font-size:14px;line-height:1.8;color:#373737;"><strong>Total:</strong> $${order.total.toFixed(2)} ${siteConfig.currency}<br /><strong>Pago:</strong> ${escapeHtml(order.provider === "paypal" ? "PayPal" : "Mercado Pago")}<br /><strong>Confirmado:</strong> ${safeCompletedAtLabel}</p>
          </div>
          <div style="margin:0 0 18px;border:1px solid rgba(17,17,17,0.08);border-radius:20px;background:#ffffff;padding:18px 18px 16px;">
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#7a7267;">Cliente</p>
            <p style="margin:0;font-size:14px;line-height:1.8;color:#373737;"><strong>${safeCustomerName}</strong><br />${safeCustomerEmail}<br />${safeCustomerPhone}<br />${safeCustomerAddress}</p>
          </div>
          <div style="margin:0 0 24px;"><a href="${safeOrderUrl}" style="display:inline-block;padding:14px 24px;border-radius:999px;background:#bc954f;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;box-shadow:0 12px 24px rgba(188,149,79,0.24);">Ver pedido</a></div>
          <p style="margin:0 0 8px;font-size:13px;line-height:1.7;color:#666666;">Productos:</p>
          <p style="margin:0;padding:14px 16px;border-radius:18px;background:#ffffff;border:1px solid rgba(17,17,17,0.08);font-size:13px;line-height:1.7;word-break:break-word;color:#111111;">${safeItemsSummary}</p>
          ${
            order.customer.notes
              ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.8;color:#666666;"><strong>Notas del cliente:</strong> ${escapeHtml(order.customer.notes)}</p>`
              : ""
          }
        </div>
      </div>
    </div>
  `.trim()

  const result = await sendEmail({
    to: recipients,
    subject,
    html,
    text
  })

  if (result.mode === "preview") {
    console.info(`[admin-new-order-email] Preview for ${recipients.join(", ")}: ${accountOrderUrl}`)
  }
  return result
}
