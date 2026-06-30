import { dataFilePath, readJsonArrayResult, withStorageLock, writeJson } from "@/lib/storage/jsonFile"
import type { CheckoutOrderCustomer, CheckoutOrderItem } from "@/lib/stores/checkoutOrders"
import type { CheckoutProvider } from "@/lib/payments"

export type ConfirmedOrderRecord = {
  id: string
  provider: CheckoutProvider
  checkoutMode?: "guest" | "account"
  customerId?: string
  createdAt: string
  completedAt: string
  paymentStatus: string
  fulfillmentStatus?: string
  paymentReference: string
  customer: CheckoutOrderCustomer
  subtotal: number
  shippingAmount: number
  shippingLabel?: string
  total: number
  items: CheckoutOrderItem[]
}

const ordersPath = dataFilePath("orders.json")

function normalizeConfirmedOrderRecord(input: unknown): ConfirmedOrderRecord | null {
  if (!input || typeof input !== "object") return null
  const record = input as Record<string, unknown>

  const id = typeof record.id === "string" ? record.id.trim() : ""
  const provider = record.provider === "mercado_pago" || record.provider === "paypal" ? record.provider : null
  const checkoutMode = record.checkoutMode === "account" ? "account" : record.checkoutMode === "guest" ? "guest" : undefined
  const customerId = typeof record.customerId === "string" ? record.customerId.trim() : undefined
  const createdAt = typeof record.createdAt === "string" ? record.createdAt : ""
  const completedAt = typeof record.completedAt === "string" ? record.completedAt : ""
  const paymentStatus = typeof record.paymentStatus === "string" ? record.paymentStatus.trim() : ""
  const fulfillmentStatus = typeof record.fulfillmentStatus === "string" ? record.fulfillmentStatus.trim() : undefined
  const paymentReference = typeof record.paymentReference === "string" ? record.paymentReference.trim() : ""
  const subtotal = typeof record.subtotal === "number" && Number.isFinite(record.subtotal) ? record.subtotal : NaN
  const shippingAmount =
    typeof record.shippingAmount === "number" && Number.isFinite(record.shippingAmount) ? record.shippingAmount : 0
  const shippingLabel = typeof record.shippingLabel === "string" ? record.shippingLabel.trim() : undefined
  const total =
    typeof record.total === "number" && Number.isFinite(record.total) ? record.total : subtotal + shippingAmount
  const customer = record.customer
  const items = record.items

  if (!id || !provider || !createdAt || !completedAt || !paymentStatus || !paymentReference || !(subtotal >= 0)) return null
  if (!(shippingAmount >= 0) || !(total >= 0)) return null
  if (!customer || typeof customer !== "object") return null
  if (!Array.isArray(items) || !items.length) return null

  return {
    id,
    provider,
    checkoutMode,
    customerId,
    createdAt,
    completedAt,
    paymentStatus,
    fulfillmentStatus,
    paymentReference,
    customer: customer as CheckoutOrderCustomer,
    subtotal,
    shippingAmount,
    shippingLabel,
    total,
    items: items as CheckoutOrderItem[]
  }
}

export async function readOrders() {
  const res = await readJsonArrayResult<unknown>(ordersPath)
  if (res.status === "missing" || res.status === "invalid" || res.status === "error") {
    return []
  }
  return res.value.map(normalizeConfirmedOrderRecord).filter(Boolean) as ConfirmedOrderRecord[]
}

async function writeOrders(orders: ConfirmedOrderRecord[]) {
  await writeJson(ordersPath, orders)
}

export async function clearOrders() {
  await withStorageLock(ordersPath, async () => {
    await writeOrders([])
  })
}

export async function appendOrder(order: ConfirmedOrderRecord) {
  await withStorageLock(ordersPath, async () => {
    const existing = await readOrders()
    if (existing.some((entry) => entry.id === order.id)) return
    await writeOrders([order, ...existing])
  })
}

export async function updateOrderFulfillmentStatus(orderId: string, fulfillmentStatus: string) {
  return await withStorageLock(ordersPath, async () => {
    const orders = await readOrders()
    const index = orders.findIndex((entry) => entry.id === orderId)
    if (index === -1) return null
    const normalizedStatus = fulfillmentStatus.trim()
    const updated = {
      ...orders[index],
      fulfillmentStatus: normalizedStatus || undefined
    }
    const next = [...orders]
    next[index] = updated
    await writeOrders(next)
    return updated
  })
}
