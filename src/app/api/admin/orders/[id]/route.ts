import { jsonError, jsonOk, readJsonBody } from "@/lib/apiResponse"
import { sendOrderStatusUpdateEmail } from "@/lib/orderStatusEmail"
import { updateCheckoutOrderFulfillmentStatus, updateOrderFulfillmentStatus } from "@/lib/perfumeStore"
import { readOrders } from "@/lib/stores/orders"

export const runtime = "nodejs"

type UpdateOrderBody = {
  fulfillmentStatus?: string
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await readJsonBody<UpdateOrderBody>(req)
  if (!body) return jsonError("Invalid body", 400)

  const fulfillmentStatus = typeof body.fulfillmentStatus === "string" ? body.fulfillmentStatus.trim() : ""
  const allowed = new Set(["", "preparing", "shipped", "delivered"])
  if (!allowed.has(fulfillmentStatus)) {
    return jsonError("Estado logistico invalido.", 400)
  }

  const currentOrder = (await readOrders()).find((entry) => entry.id === id)
  if (!currentOrder) return jsonError("Orden no encontrada.", 404)

  const previousFulfillmentStatus = currentOrder.fulfillmentStatus || ""
  const order = await updateOrderFulfillmentStatus(id, fulfillmentStatus)
  if (!order) return jsonError("Orden no encontrada.", 404)

  await updateCheckoutOrderFulfillmentStatus(id, fulfillmentStatus)

  const shouldNotify = Boolean(fulfillmentStatus && fulfillmentStatus !== previousFulfillmentStatus)
  if (shouldNotify) {
    try {
      await sendOrderStatusUpdateEmail({
        order,
        previousFulfillmentStatus
      })
    } catch (error) {
      await updateOrderFulfillmentStatus(id, previousFulfillmentStatus)
      await updateCheckoutOrderFulfillmentStatus(id, previousFulfillmentStatus)
      return jsonError(error instanceof Error ? error.message : "No se pudo enviar el correo al cliente.", 500)
    }
  }

  return jsonOk({ order })
}
