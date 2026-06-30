import { revalidatePath } from "next/cache"
import { jsonError, jsonOk, readJsonBody } from "@/lib/apiResponse"
import { releaseCheckoutOrderReservation, readCheckoutOrders } from "@/lib/stores/checkoutOrders"

export const runtime = "nodejs"

type UpdateCheckoutOrderBody = {
  action?: string
}

function revalidateShopInventory() {
  revalidatePath("/")
  revalidatePath("/catalog")
  revalidatePath("/catalog/[slug]", "page")
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await readJsonBody<UpdateCheckoutOrderBody>(req)
  if (!body) return jsonError("Invalid body", 400)

  if (body.action !== "release_reservation") {
    return jsonError("Accion invalida.", 400)
  }

  const order = (await readCheckoutOrders()).find((entry) => entry.id === id)
  if (!order) return jsonError("Reserva no encontrada.", 404)
  if (order.status !== "pending") {
    return jsonError("La reserva ya no esta pendiente.", 409)
  }

  const updated = await releaseCheckoutOrderReservation(id, { reason: "manual" })
  if (!updated) return jsonError("No se pudo liberar la reserva.", 500)

  revalidateShopInventory()

  return jsonOk({ checkoutOrder: updated })
}
