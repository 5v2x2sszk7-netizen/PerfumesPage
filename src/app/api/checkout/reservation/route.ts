import { jsonError, jsonNoStoreOk } from "@/lib/apiResponse"
import { isCheckoutReservationActive } from "@/lib/checkout/reservations"
import { readCheckoutOrders } from "@/lib/stores/checkoutOrders"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const orderId = url.searchParams.get("orderId")?.trim() || ""
  if (!orderId) return jsonError("Falta el orderId.", 400)

  const order = (await readCheckoutOrders()).find((entry) => entry.id === orderId)
  if (!order) {
    return jsonNoStoreOk({
      active: false
    })
  }

  return jsonNoStoreOk({
    active: isCheckoutReservationActive(order),
    orderId: order.id,
    provider: order.provider,
    reservationExpiresAt: order.reservationExpiresAt || null,
    status: order.status
  })
}
