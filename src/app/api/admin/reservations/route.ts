import { jsonNoStoreOk } from "@/lib/apiResponse"
import { buildReservationMetrics } from "@/lib/admin/reservations"
import { readCheckoutOrders } from "@/lib/stores/checkoutOrders"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const checkoutOrders = await readCheckoutOrders()
  const metrics = buildReservationMetrics(checkoutOrders)
  return jsonNoStoreOk({
    checkoutOrders,
    metrics
  })
}
