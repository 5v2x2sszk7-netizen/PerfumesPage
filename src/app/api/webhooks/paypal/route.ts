import { jsonError, jsonOk } from "@/lib/apiResponse"
import { applyConfirmedCheckout, isSuccessfulPayment } from "@/lib/checkout/confirmation"
import { capturePayPalOrder, hasPayPalWebhookVerificationConfigured, verifyPayPalWebhookSignature } from "@/lib/payments"

type PayPalWebhookEvent = {
  event_type?: string
  resource?: {
    id?: string
    supplementary_data?: {
      related_ids?: {
        order_id?: string
      }
    }
  }
}

export async function POST(req: Request) {
  const event = (await req.json().catch(() => null)) as PayPalWebhookEvent | null
  if (!event) return jsonError("No se pudo leer el webhook de PayPal.", 400)

  try {
    const verification = await verifyPayPalWebhookSignature(req.headers, event)
    if (process.env.NODE_ENV === "production" && !hasPayPalWebhookVerificationConfigured()) {
      return jsonError("Verificacion de webhook PayPal no configurada en produccion.", 503)
    }
    if (!verification.skipped && !verification.verified) {
      return jsonError(`Firma de PayPal invalida. ${verification.reason}`, 400)
    }

    const eventType = event.event_type?.trim() || ""
    const paypalOrderId =
      (eventType === "CHECKOUT.ORDER.APPROVED" && event.resource?.id?.trim()) ||
      event.resource?.supplementary_data?.related_ids?.order_id?.trim() ||
      ""

    if (!paypalOrderId) {
      return jsonOk({
        received: true,
        provider: "paypal",
        ignored: true,
        reason: "Evento sin order_id util para conciliacion."
      })
    }

    if (eventType !== "CHECKOUT.ORDER.APPROVED" && eventType !== "PAYMENT.CAPTURE.COMPLETED") {
      return jsonOk({
        received: true,
        provider: "paypal",
        ignored: true,
        reason: `Evento no procesado: ${eventType || "desconocido"}.`
      })
    }

    const capture = await capturePayPalOrder(paypalOrderId)
    const inventory =
      capture.orderId && isSuccessfulPayment("paypal", capture.status)
        ? await applyConfirmedCheckout({
            orderId: capture.orderId,
            provider: "paypal",
            paymentStatus: capture.status,
            paymentReference: capture.id
          })
        : {
            inventoryUpdated: false,
            inventoryMessage: "Pago sin cambios de inventario."
          }

    return jsonOk({
      received: true,
      provider: "paypal",
      eventType,
      orderId: capture.orderId,
      reference: capture.id,
      status: capture.status,
      inventoryUpdated: inventory.inventoryUpdated,
      inventoryMessage: inventory.inventoryMessage,
      verification: verification.skipped ? "skipped" : "verified"
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo procesar el webhook de PayPal."
    return jsonError(message, 500)
  }
}
