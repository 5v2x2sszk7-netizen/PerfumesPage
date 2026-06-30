import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { jsonError, jsonNoStoreOk } from "@/lib/apiResponse"
import { isCheckoutReservationActive } from "@/lib/checkout/reservations"
import { readCheckoutOrders, releaseCheckoutOrderReservation } from "@/lib/stores/checkoutOrders"

export const runtime = "nodejs"

const activeReservationCookieName = "perfimes_active_checkout_reservation"

function revalidateShopInventory() {
  revalidatePath("/")
  revalidatePath("/catalog")
  revalidatePath("/catalog/[slug]", "page")
}

function readCookieReservationOrderId(rawValue: string | undefined) {
  if (!rawValue) return ""
  try {
    const parsed = JSON.parse(rawValue) as { orderId?: string } | null
    return typeof parsed?.orderId === "string" ? parsed.orderId.trim() : ""
  } catch {
    return ""
  }
}

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

export async function DELETE(req: Request) {
  const url = new URL(req.url)
  const orderId = url.searchParams.get("orderId")?.trim() || ""
  if (!orderId) return jsonError("Falta el orderId.", 400)

  const cookieStore = await cookies()
  const cookieOrderId = readCookieReservationOrderId(cookieStore.get(activeReservationCookieName)?.value)
  if (!cookieOrderId || cookieOrderId !== orderId) {
    return jsonError("Reserva no autorizada.", 403)
  }

  const order = (await readCheckoutOrders()).find((entry) => entry.id === orderId)
  if (!order) {
    return jsonNoStoreOk({
      released: false
    })
  }

  if (order.status !== "pending") {
    return jsonNoStoreOk({
      released: false
    })
  }

  const updated = await releaseCheckoutOrderReservation(orderId, { reason: "manual" })
  revalidateShopInventory()

  return jsonNoStoreOk({
    released: Boolean(updated)
  })
}
