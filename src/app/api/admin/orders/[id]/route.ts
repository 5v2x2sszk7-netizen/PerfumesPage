import { jsonError, jsonOk, readJsonBody } from "@/lib/apiResponse"
import { updateCheckoutOrderFulfillmentStatus, updateOrderFulfillmentStatus } from "@/lib/perfumeStore"

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

  const order = await updateOrderFulfillmentStatus(id, fulfillmentStatus)
  if (!order) return jsonError("Orden no encontrada.", 404)

  await updateCheckoutOrderFulfillmentStatus(id, fulfillmentStatus)

  return jsonOk({ order })
}
