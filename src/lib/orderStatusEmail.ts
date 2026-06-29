import { siteConfig } from "@/config/site"
import { formatCustomerOrderNumber, fulfillmentStatusCustomerLabel, orderStatusSupportingLabel } from "@/lib/orderPresentation"
import type { ConfirmedOrderRecord } from "@/lib/stores/orders"

export type OrderStatusEmailDeliveryResult =
  | {
      mode: "email"
    }
  | {
      mode: "preview"
      previewUrl: string
    }

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

function buildOrderUrl(orderId: string) {
  const url = new URL("/account", resolveBaseUrl())
  url.hash = `order-${orderId}`
  return url.toString()
}

export async function sendOrderStatusUpdateEmail(input: {
  order: ConfirmedOrderRecord
  previousFulfillmentStatus?: string
}): Promise<OrderStatusEmailDeliveryResult> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim()
  const resendFromEmail = process.env.RESEND_FROM_EMAIL?.trim()
  const previewEnabled = process.env.NODE_ENV !== "production"
  const customerName = input.order.customer.fullName.trim() || "Hola"
  const orderNumber = formatCustomerOrderNumber(input.order.id)
  const currentStatusLabel = orderStatusSupportingLabel(input.order)
  const fulfillmentLabel = input.order.fulfillmentStatus
    ? fulfillmentStatusCustomerLabel(input.order.fulfillmentStatus)
    : orderStatusSupportingLabel(input.order)
  const previousStatusLabel = input.previousFulfillmentStatus?.trim()
    ? fulfillmentStatusCustomerLabel(input.previousFulfillmentStatus)
    : "Pago confirmado"
  const orderUrl = buildOrderUrl(input.order.id)
  const safeName = escapeHtml(customerName)
  const safeOrderUrl = escapeHtml(orderUrl)
  const safeOrderNumber = escapeHtml(orderNumber)
  const safeCurrentStatus = escapeHtml(currentStatusLabel)
  const safeFulfillmentLabel = escapeHtml(fulfillmentLabel)
  const safePreviousStatus = escapeHtml(previousStatusLabel)
  const updatedAtLabel = formatDateLabel(new Date().toISOString())
  const safeUpdatedAtLabel = escapeHtml(updatedAtLabel)
  const itemsSummary = input.order.items
    .map((item) => `${item.brand} ${item.name} ${item.sizeMl} ml x${item.quantity}`)
    .join(" | ")

  const subject = `${safeOrderNumber} · ${safeFulfillmentLabel} | ${siteConfig.name}`
  const text = [
    `${customerName},`,
    "",
    `Tu pedido ${orderNumber} cambió de estado en ${siteConfig.name}.`,
    `Estado anterior: ${previousStatusLabel}.`,
    `Estado actual: ${currentStatusLabel}.`,
    `Actualizado el ${updatedAtLabel}.`,
    "",
    "Resumen del pedido:",
    itemsSummary,
    "",
    `Consulta tu pedido aquí: ${orderUrl}`,
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
          <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#7a7267;">Actualización de pedido</p>
          <h1 style="margin:0 0 16px;font-size:32px;line-height:1.08;font-weight:600;color:#111111;">${safeFulfillmentLabel}</h1>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.8;color:#373737;">${safeName}, tu pedido <strong>${safeOrderNumber}</strong> cambió de estado.</p>
          <div style="margin:0 0 24px;border:1px solid rgba(17,17,17,0.08);border-radius:20px;background:rgba(255,255,255,0.68);padding:18px 18px 16px;">
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#7a7267;">Seguimiento</p>
            <p style="margin:0;font-size:14px;line-height:1.8;color:#373737;"><strong>Antes:</strong> ${safePreviousStatus}<br /><strong>Ahora:</strong> ${safeCurrentStatus}<br /><strong>Actualizado:</strong> ${safeUpdatedAtLabel}</p>
          </div>
          <div style="margin:0 0 24px;">
            <a href="${safeOrderUrl}" style="display:inline-block;padding:14px 24px;border-radius:999px;background:#bc954f;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;box-shadow:0 12px 24px rgba(188,149,79,0.24);">Ver mi pedido</a>
          </div>
          <p style="margin:0 0 8px;font-size:13px;line-height:1.7;color:#666666;">Resumen:</p>
          <p style="margin:0;padding:14px 16px;border-radius:18px;background:#ffffff;border:1px solid rgba(17,17,17,0.08);font-size:13px;line-height:1.7;word-break:break-word;color:#111111;">${escapeHtml(itemsSummary)}</p>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.8;color:#666666;">Si prefieres revisar el pedido manualmente, abre este enlace: ${safeOrderUrl}</p>
          <p style="margin:22px 0 0;font-size:12px;line-height:1.8;color:#8a8378;">${escapeHtml(siteConfig.name)}</p>
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
        to: [input.order.customer.email],
        subject,
        html,
        text
      }),
      cache: "no-store"
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      throw new Error(errorText || "No se pudo enviar el correo de actualización de pedido.")
    }

    return { mode: "email" }
  }

  if (!previewEnabled) {
    throw new Error("No hay un proveedor de correo configurado para notificaciones de pedidos.")
  }

  console.info(`[order-status-email] Preview for ${input.order.customer.email}: ${orderUrl}`)
  return {
    mode: "preview",
    previewUrl: orderUrl
  }
}
