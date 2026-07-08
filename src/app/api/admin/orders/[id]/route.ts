import { jsonError, jsonOk, readJsonBody } from "@/lib/apiResponse"
import { sendOrderStatusUpdateEmail } from "@/lib/orderStatusEmail"
import { normalizeTrackingUrl, resolveShippingStatusFromFulfillmentStatus } from "@/lib/orderShipping"
import { updateCheckoutOrderShippingDetails, updateOrderShippingDetails } from "@/lib/perfumeStore"
import { readOrders } from "@/lib/stores/orders"

export const runtime = "nodejs"

type UpdateOrderBody = {
  fulfillmentStatus?: string
  carrier?: string
  trackingNumber?: string
  trackingUrl?: string
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await readJsonBody<UpdateOrderBody>(req)
  if (!body) return jsonError("Invalid body", 400)

  const fulfillmentStatus = typeof body.fulfillmentStatus === "string" ? body.fulfillmentStatus.trim() : ""
  const carrier = typeof body.carrier === "string" ? body.carrier.trim() : ""
  const trackingNumber = typeof body.trackingNumber === "string" ? body.trackingNumber.trim() : ""
  const trackingUrlInput = typeof body.trackingUrl === "string" ? body.trackingUrl.trim() : ""
  const trackingUrl = trackingUrlInput ? normalizeTrackingUrl(trackingUrlInput) : undefined
  const allowed = new Set(["", "preparing", "shipped", "delivered"])
  if (!allowed.has(fulfillmentStatus)) {
    return jsonError("Estado logistico invalido.", 400)
  }
  if (trackingUrlInput && !trackingUrl) {
    return jsonError("La URL de rastreo no es valida.", 400)
  }
  if ((carrier && !trackingNumber) || (!carrier && trackingNumber)) {
    return jsonError("Captura paqueteria y numero de guia juntos.", 400)
  }
  if (fulfillmentStatus === "shipped" && (!carrier || !trackingNumber)) {
    return jsonError("Para marcar como enviado agrega paqueteria y numero de guia.", 400)
  }

  const currentOrder = (await readOrders()).find((entry) => entry.id === id)
  if (!currentOrder) return jsonError("Orden no encontrada.", 404)

  const previousFulfillmentStatus = currentOrder.fulfillmentStatus || ""
  const previousCarrier = currentOrder.carrier || ""
  const previousTrackingNumber = currentOrder.trackingNumber || ""
  const previousTrackingUrl = currentOrder.trackingUrl || ""
  const previousShippedAt = currentOrder.shippedAt
  const previousShippingStatus = currentOrder.shippingStatus
  const nextShippingStatus = resolveShippingStatusFromFulfillmentStatus(fulfillmentStatus, previousShippingStatus)
  const shouldStampShippedAt = (fulfillmentStatus === "shipped" || fulfillmentStatus === "delivered") && !previousShippedAt
  const shippedAt = shouldStampShippedAt ? new Date().toISOString() : previousShippedAt

  const order = await updateOrderShippingDetails(id, {
    fulfillmentStatus,
    carrier,
    trackingNumber,
    trackingUrl,
    shippedAt,
    shippingStatus: nextShippingStatus
  })
  if (!order) return jsonError("Orden no encontrada.", 404)

  await updateCheckoutOrderShippingDetails(id, {
    fulfillmentStatus,
    carrier,
    trackingNumber,
    trackingUrl,
    shippedAt,
    shippingStatus: nextShippingStatus
  })

  const trackingChanged =
    carrier !== previousCarrier || trackingNumber !== previousTrackingNumber || (trackingUrl || "") !== previousTrackingUrl
  const shouldNotify =
    Boolean(fulfillmentStatus && fulfillmentStatus !== previousFulfillmentStatus) ||
    Boolean(fulfillmentStatus === "shipped" && carrier && trackingNumber && trackingChanged)
  if (shouldNotify) {
    try {
      await sendOrderStatusUpdateEmail({
        order,
        previousFulfillmentStatus
      })
    } catch (error) {
      await updateOrderShippingDetails(id, {
        fulfillmentStatus: previousFulfillmentStatus,
        carrier: previousCarrier,
        trackingNumber: previousTrackingNumber,
        trackingUrl: previousTrackingUrl,
        shippedAt: previousShippedAt,
        shippingStatus: previousShippingStatus
      })
      await updateCheckoutOrderShippingDetails(id, {
        fulfillmentStatus: previousFulfillmentStatus,
        carrier: previousCarrier,
        trackingNumber: previousTrackingNumber,
        trackingUrl: previousTrackingUrl,
        shippedAt: previousShippedAt,
        shippingStatus: previousShippingStatus
      })
      return jsonError(error instanceof Error ? error.message : "No se pudo enviar el correo al cliente.", 500)
    }
  }

  return jsonOk({ order })
}
