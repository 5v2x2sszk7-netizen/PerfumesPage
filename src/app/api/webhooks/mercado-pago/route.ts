import { jsonError, jsonOk } from "@/lib/apiResponse"
import { applyConfirmedCheckout, isSuccessfulPayment } from "@/lib/checkout/confirmation"
import {
  getMercadoPagoPayment,
  hasMercadoPagoWebhookSecretConfigured,
  verifyMercadoPagoWebhookSignature
} from "@/lib/payments"

type MercadoPagoWebhookBody = {
  action?: string
  api_version?: string
  data?: {
    id?: string | number
  }
  id?: string | number
  live_mode?: boolean
  type?: string
}

function paymentIdFromBody(body: MercadoPagoWebhookBody | null) {
  const raw = body?.data?.id ?? body?.id
  if (typeof raw === "string" || typeof raw === "number") return String(raw).trim()
  return ""
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as MercadoPagoWebhookBody | null
  const url = new URL(req.url)
  const paymentId =
    url.searchParams.get("data.id")?.trim() ||
    url.searchParams.get("id")?.trim() ||
    paymentIdFromBody(body)

  try {
    const verification = verifyMercadoPagoWebhookSignature({
      headers: req.headers,
      requestUrl: req.url,
      dataId: paymentId
    })
    if (process.env.NODE_ENV === "production" && !hasMercadoPagoWebhookSecretConfigured()) {
      return jsonError("Verificacion de webhook Mercado Pago no configurada en produccion.", 503)
    }
    if (!verification.skipped && !verification.verified) {
      return jsonError(`Firma de Mercado Pago invalida. ${verification.reason}`, 400)
    }

    const topic = (
      url.searchParams.get("topic") ||
      url.searchParams.get("type") ||
      body?.type ||
      ""
    )
      .trim()
      .toLowerCase()

    if (!paymentId || (topic && !topic.includes("payment"))) {
      return jsonOk({
        received: true,
        provider: "mercado_pago",
        ignored: true,
        reason: paymentId ? `Topico no procesado: ${topic}.` : "Evento sin payment id."
      })
    }

    const payment = await getMercadoPagoPayment(paymentId)
    const inventory =
      payment.orderId && isSuccessfulPayment("mercado_pago", payment.status)
        ? await applyConfirmedCheckout({
            orderId: payment.orderId,
            provider: "mercado_pago",
            paymentStatus: payment.status,
            paymentReference: payment.id
          })
        : {
            inventoryUpdated: false,
            inventoryMessage: "Pago sin cambios de inventario."
          }

    return jsonOk({
      received: true,
      provider: "mercado_pago",
      topic: topic || "payment",
      orderId: payment.orderId,
      reference: payment.id,
      status: payment.status,
      inventoryUpdated: inventory.inventoryUpdated,
      inventoryMessage: inventory.inventoryMessage,
      verification: verification.skipped ? "skipped" : "verified"
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo procesar el webhook de Mercado Pago."
    return jsonError(message, 500)
  }
}
