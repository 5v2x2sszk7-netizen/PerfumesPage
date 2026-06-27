import { readOrdersForCustomer } from "@/lib/customerAccount"
import { formatCustomerOrderNumber } from "@/lib/orderPresentation"
import { readReviews } from "@/lib/stores/reviews"

export type EligibleReviewOrder = {
  orderId: string
  orderNumber: string
  completedAt: string
  itemSummary: string
  optionLabel: string
}

function buildOrderItemSummary(order: Awaited<ReturnType<typeof readOrdersForCustomer>>[number]) {
  const firstItem = order.items[0]
  if (!firstItem) return "Compra confirmada"
  const firstLabel = `${firstItem.brand} ${firstItem.name}`.trim()
  const remaining = Math.max(0, order.items.length - 1)
  return remaining > 0 ? `${firstLabel} + ${remaining} más` : firstLabel
}

function buildEligibleOrder(order: Awaited<ReturnType<typeof readOrdersForCustomer>>[number]): EligibleReviewOrder {
  const orderNumber = formatCustomerOrderNumber(order.id)
  const itemSummary = buildOrderItemSummary(order)
  return {
    orderId: order.id,
    orderNumber,
    completedAt: order.completedAt,
    itemSummary,
    optionLabel: `${orderNumber} · ${itemSummary}`
  }
}

export async function readEligibleReviewOrders(customerId: string, email: string) {
  const [orders, reviews] = await Promise.all([readOrdersForCustomer(customerId, email), readReviews()])
  const reviewedOrderIds = new Set(
    reviews
      .map((review) => {
        const orderId = (review as { orderId?: string }).orderId
        return typeof orderId === "string" ? orderId.trim() : ""
      })
      .filter(Boolean)
  )

  return orders
    .filter((order) => !reviewedOrderIds.has(order.id))
    .map(buildEligibleOrder)
}

export async function getReviewEligibility(customerId: string, email: string) {
  const [orders, eligibleOrders] = await Promise.all([readOrdersForCustomer(customerId, email), readEligibleReviewOrders(customerId, email)])

  return {
    totalOrders: orders.length,
    eligibleOrders
  }
}
