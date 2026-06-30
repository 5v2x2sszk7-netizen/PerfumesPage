import { availabilityFromStock } from "@/lib/perfume/parsers"
import { readPerfumes } from "@/lib/stores/perfumes"
import { readCheckoutOrders, type CheckoutOrderRecord } from "@/lib/stores/checkoutOrders"
import type { Perfume } from "@/types/perfume"

const defaultReservationMinutes = 15

function parseReservationMinutes(rawValue: string | undefined) {
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed)) return defaultReservationMinutes
  return Math.max(1, Math.min(60, Math.floor(parsed)))
}

export function getCheckoutReservationWindowMs() {
  return parseReservationMinutes(process.env.CHECKOUT_RESERVATION_MINUTES) * 60_000
}

export function getCheckoutReservationExpiresAt(createdAt: string) {
  const createdAtMs = new Date(createdAt).getTime()
  const fallbackMs = Date.now() + getCheckoutReservationWindowMs()
  const expiresAtMs = Number.isNaN(createdAtMs) ? fallbackMs : createdAtMs + getCheckoutReservationWindowMs()
  return new Date(expiresAtMs).toISOString()
}

export function getCheckoutReservationExpiresAtMs(order: Pick<CheckoutOrderRecord, "createdAt" | "reservationExpiresAt">) {
  const explicitExpiresAtMs = order.reservationExpiresAt ? new Date(order.reservationExpiresAt).getTime() : Number.NaN
  if (!Number.isNaN(explicitExpiresAtMs)) return explicitExpiresAtMs

  const createdAtMs = new Date(order.createdAt).getTime()
  if (!Number.isNaN(createdAtMs)) return createdAtMs + getCheckoutReservationWindowMs()

  return 0
}

export function isCheckoutReservationActive(order: CheckoutOrderRecord, nowMs = Date.now()) {
  if (order.status !== "pending") return false
  return getCheckoutReservationExpiresAtMs(order) > nowMs
}

export function getReservedQuantityForPerfume(input: {
  orders: CheckoutOrderRecord[]
  perfumeId: string
  excludeOrderId?: string
  nowMs?: number
}) {
  const targetPerfumeId = input.perfumeId.trim()
  if (!targetPerfumeId) return 0

  const excludedOrderId = input.excludeOrderId?.trim() || ""
  const nowMs = input.nowMs ?? Date.now()

  return input.orders.reduce((sum, order) => {
    if (excludedOrderId && order.id === excludedOrderId) return sum
    if (!isCheckoutReservationActive(order, nowMs)) return sum

    const reservedUnits = order.items.reduce((itemsSum, item) => {
      return item.perfumeId === targetPerfumeId ? itemsSum + item.quantity : itemsSum
    }, 0)

    return sum + reservedUnits
  }, 0)
}

export function toSellablePerfume(input: {
  perfume: Perfume
  checkoutOrders: CheckoutOrderRecord[]
  excludeOrderId?: string
  nowMs?: number
}) {
  const reservedQuantity = getReservedQuantityForPerfume({
    orders: input.checkoutOrders,
    perfumeId: input.perfume.id,
    excludeOrderId: input.excludeOrderId,
    nowMs: input.nowMs
  })
  const sellableStock = Math.max(0, input.perfume.stock - reservedQuantity)

  return {
    ...input.perfume,
    stock: sellableStock,
    availability: availabilityFromStock(sellableStock)
  } satisfies Perfume
}

export async function readSellablePerfumes() {
  const [perfumes, checkoutOrders] = await Promise.all([readPerfumes(), readCheckoutOrders()])
  const nowMs = Date.now()
  return perfumes.map((perfume) =>
    toSellablePerfume({
      perfume,
      checkoutOrders,
      nowMs
    })
  )
}
