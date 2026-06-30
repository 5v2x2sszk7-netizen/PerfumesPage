import { jsonError, jsonOk, readJsonBody } from "@/lib/apiResponse"
import { getCheckoutReservationExpiresAtMs, isCheckoutReservationActive } from "@/lib/checkout/reservations"
import { sendAdminCriticalReservationAlertEmail } from "@/lib/orderPurchaseEmail"
import { appendCheckoutOrderEventRecord, readCheckoutOrders, withCheckoutOrdersLock, writeCheckoutOrders } from "@/lib/stores/checkoutOrders"

export const runtime = "nodejs"

type CriticalAlertsBody = {
  reservationIds?: string[]
  force?: boolean
}

export async function POST(req: Request) {
  const body = await readJsonBody<CriticalAlertsBody>(req)
  if (!body || !Array.isArray(body.reservationIds) || !body.reservationIds.length) {
    return jsonError("No se recibieron reservas para alertar.", 400)
  }

  const reservationIds = Array.from(
    new Set(body.reservationIds.map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean))
  )
  if (!reservationIds.length) {
    return jsonError("No se recibieron reservas validas.", 400)
  }
  const force = body.force === true

  const result = await withCheckoutOrdersLock(async () => {
    const orders = await readCheckoutOrders()
    const nowMs = Date.now()
    const criticalWindowMs = 5 * 60_000
    const alertedOrders = []

    for (const reservationId of reservationIds) {
      const current = orders.find((order) => order.id === reservationId)
      if (!current) continue
      if (current.status !== "pending" || !isCheckoutReservationActive(current, nowMs)) continue

      const remainingMs = getCheckoutReservationExpiresAtMs(current) - nowMs
      if (remainingMs <= 0 || remainingMs > criticalWindowMs) continue

      const alreadyAlerted = (current.events ?? []).some((event) => event.type === "critical_alert_sent")
      if (alreadyAlerted && !force) continue

      alertedOrders.push(current)
    }

    return {
      alertedOrders
    }
  })

  const delivery = result.alertedOrders.length ? await sendAdminCriticalReservationAlertEmail(result.alertedOrders) : null

  if (result.alertedOrders.length && delivery && delivery.mode !== "skipped") {
    await withCheckoutOrdersLock(async () => {
      const orders = await readCheckoutOrders()
      const alertedIds = new Set(result.alertedOrders.map((order) => order.id))
      const alertedAt = new Date().toISOString()
      const nextOrders = orders.map((order) => {
        if (!alertedIds.has(order.id)) return order
        return appendCheckoutOrderEventRecord(order, {
          type: "critical_alert_sent",
          at: alertedAt,
          detail: force ? "Aviso interno reenviado manualmente desde admin." : "Aviso interno enviado al entrar a ventana critica."
        })
      })
      await writeCheckoutOrders(nextOrders)
    })
  }

  return jsonOk({
    alertedCount: result.alertedOrders.length,
    deliveryMode: delivery?.mode || "skipped"
  })
}
