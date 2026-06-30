import type { ReservationEventLogEntry, ReservationMetrics } from "@/lib/admin/types"
import { getCheckoutReservationExpiresAtMs, isCheckoutReservationActive } from "@/lib/checkout/reservations"
import type { CheckoutOrderRecord } from "@/lib/stores/checkoutOrders"

function toRate(count: number, total: number) {
  if (total <= 0) return 0
  return Math.round((count / total) * 1000) / 10
}

export function buildReservationMetrics(totalOrders: CheckoutOrderRecord[]): ReservationMetrics {
  const nowMs = Date.now()
  const expiringSoonWindowMs = 5 * 60_000

  const active = totalOrders.filter((order) => isCheckoutReservationActive(order, nowMs))
  const expiringSoon = active.filter((order) => getCheckoutReservationExpiresAtMs(order) - nowMs <= expiringSoonWindowMs)
  const criticalAlertSent = expiringSoon.filter((order) => (order.events ?? []).some((event) => event.type === "critical_alert_sent"))
  const criticalAlertPending = expiringSoon.filter((order) => !(order.events ?? []).some((event) => event.type === "critical_alert_sent"))
  const expiredPending = totalOrders.filter((order) => order.status === "pending" && !isCheckoutReservationActive(order, nowMs))
  const completed = totalOrders.filter((order) => order.status === "completed")
  const inventoryRejected = totalOrders.filter((order) => order.status === "inventory_rejected")
  const manuallyReleased = totalOrders.filter((order) => order.reservationReleaseReason === "manual")
  const cleanupReleased = totalOrders.filter((order) => order.reservationReleaseReason === "expired_cleanup")

  return {
    total: totalOrders.length,
    active: active.length,
    expiringSoon: expiringSoon.length,
    criticalAlertSent: criticalAlertSent.length,
    criticalAlertPending: criticalAlertPending.length,
    expiredPending: expiredPending.length,
    completed: completed.length,
    inventoryRejected: inventoryRejected.length,
    manuallyReleased: manuallyReleased.length,
    cleanupReleased: cleanupReleased.length,
    conversionRate: toRate(completed.length, totalOrders.length),
    expirationRate: toRate(expiredPending.length, totalOrders.length),
    rejectionRate: toRate(inventoryRejected.length, totalOrders.length)
  }
}

export function buildReservationEventLog(orders: CheckoutOrderRecord[]): ReservationEventLogEntry[] {
  return orders
    .flatMap((order) => {
      const itemsSummary = order.items.map((item) => `${item.brand} ${item.name} ${item.sizeMl} ml x${item.quantity}`).join(" | ")

      return (order.events ?? []).map((event) => ({
        reservationId: order.id,
        provider: order.provider,
        reservationStatus: order.status,
        isReservationActive: order.status === "pending" && isCheckoutReservationActive(order),
        customerName: order.customer.fullName,
        customerEmail: order.customer.email,
        itemsSummary,
        event
      }))
    })
    .sort((a, b) => new Date(b.event.at).getTime() - new Date(a.event.at).getTime())
}
