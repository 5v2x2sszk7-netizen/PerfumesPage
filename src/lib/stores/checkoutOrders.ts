import type { CheckoutProvider } from "@/lib/payments"
import { dataFilePath, readJsonArrayResult, withStorageLock, writeJson } from "@/lib/storage/jsonFile"

export type CheckoutOrderItem = {
  perfumeId: string
  brand: string
  name: string
  sizeMl: number
  unitPrice: number
  unitCost: number
  quantity: number
}

export type CheckoutOrderCustomer = {
  fullName: string
  email: string
  phone: string
  addressLine1: string
  addressLine2?: string
  neighborhood?: string
  city: string
  state: string
  postalCode: string
  notes?: string
}

export type CheckoutOrderRecord = {
  id: string
  provider: CheckoutProvider
  checkoutMode?: "guest" | "account"
  customerId?: string
  status: "pending" | "completed" | "inventory_rejected"
  createdAt: string
  completedAt?: string
  paymentStatus?: string
  fulfillmentStatus?: string
  paymentReference?: string
  customer: CheckoutOrderCustomer
  subtotal: number
  shippingAmount: number
  shippingLabel?: string
  total: number
  items: CheckoutOrderItem[]
}

const checkoutOrdersPath = dataFilePath("checkout-orders.json")

function normalizeCheckoutOrderItem(input: unknown): CheckoutOrderItem | null {
  if (!input || typeof input !== "object") return null
  const item = input as Record<string, unknown>

  const perfumeId = typeof item.perfumeId === "string" ? item.perfumeId.trim() : ""
  const brand = typeof item.brand === "string" ? item.brand.trim() : ""
  const name = typeof item.name === "string" ? item.name.trim() : ""
  const sizeMl = typeof item.sizeMl === "number" && Number.isFinite(item.sizeMl) ? Math.floor(item.sizeMl) : NaN
  const unitPrice = typeof item.unitPrice === "number" && Number.isFinite(item.unitPrice) ? item.unitPrice : NaN
  const unitCost = typeof item.unitCost === "number" && Number.isFinite(item.unitCost) ? item.unitCost : NaN
  const quantity = typeof item.quantity === "number" && Number.isFinite(item.quantity) ? Math.floor(item.quantity) : NaN

  if (!perfumeId || !brand || !name) return null
  if (!(sizeMl > 0) || !(unitPrice >= 0) || !(unitCost >= 0) || !(quantity > 0)) return null

  return {
    perfumeId,
    brand,
    name,
    sizeMl,
    unitPrice,
    unitCost,
    quantity
  }
}

function normalizeCheckoutOrderCustomer(input: unknown): CheckoutOrderCustomer | null {
  if (!input || typeof input !== "object") return null
  const customer = input as Record<string, unknown>

  const fullName = typeof customer.fullName === "string" ? customer.fullName.trim() : ""
  const email = typeof customer.email === "string" ? customer.email.trim() : ""
  const phone = typeof customer.phone === "string" ? customer.phone.trim() : ""
  const addressLine1 = typeof customer.addressLine1 === "string" ? customer.addressLine1.trim() : ""
  const addressLine2 = typeof customer.addressLine2 === "string" ? customer.addressLine2.trim() : undefined
  const neighborhood =
    typeof customer.neighborhood === "string" && customer.neighborhood.trim() ? customer.neighborhood.trim() : undefined
  const city = typeof customer.city === "string" ? customer.city.trim() : ""
  const state = typeof customer.state === "string" ? customer.state.trim() : ""
  const postalCode = typeof customer.postalCode === "string" ? customer.postalCode.trim() : ""
  const notes = typeof customer.notes === "string" ? customer.notes.trim() : undefined

  if (!fullName || !email || !phone || !addressLine1 || !city || !state || !postalCode) return null

  return {
    fullName,
    email,
    phone,
    addressLine1,
    addressLine2,
    neighborhood,
    city,
    state,
    postalCode,
    notes
  }
}

function normalizeCheckoutOrderRecord(input: unknown): CheckoutOrderRecord | null {
  if (!input || typeof input !== "object") return null
  const record = input as Record<string, unknown>

  const id = typeof record.id === "string" ? record.id.trim() : ""
  const provider = record.provider === "mercado_pago" || record.provider === "paypal" ? record.provider : null
  const checkoutMode = record.checkoutMode === "account" ? "account" : record.checkoutMode === "guest" ? "guest" : undefined
  const customerId = typeof record.customerId === "string" ? record.customerId.trim() : undefined
  const status =
    record.status === "completed"
      ? "completed"
      : record.status === "pending"
        ? "pending"
        : record.status === "inventory_rejected"
          ? "inventory_rejected"
          : null
  const createdAt = typeof record.createdAt === "string" ? record.createdAt : ""
  const completedAt = typeof record.completedAt === "string" ? record.completedAt : undefined
  const paymentStatus = typeof record.paymentStatus === "string" ? record.paymentStatus : undefined
  const fulfillmentStatus = typeof record.fulfillmentStatus === "string" ? record.fulfillmentStatus.trim() : undefined
  const paymentReference = typeof record.paymentReference === "string" ? record.paymentReference : undefined
  const customer = normalizeCheckoutOrderCustomer(record.customer)
  const subtotal = typeof record.subtotal === "number" && Number.isFinite(record.subtotal) ? record.subtotal : NaN
  const shippingAmount =
    typeof record.shippingAmount === "number" && Number.isFinite(record.shippingAmount) ? record.shippingAmount : 0
  const shippingLabel = typeof record.shippingLabel === "string" ? record.shippingLabel.trim() : undefined
  const total =
    typeof record.total === "number" && Number.isFinite(record.total) ? record.total : subtotal + shippingAmount
  const items = Array.isArray(record.items) ? record.items.map(normalizeCheckoutOrderItem).filter(Boolean) as CheckoutOrderItem[] : []

  if (!id || !provider || !status || !createdAt || !customer || !(subtotal >= 0) || !(shippingAmount >= 0) || !(total >= 0) || !items.length) {
    return null
  }

  return {
    id,
    provider,
    checkoutMode,
    customerId,
    status,
    createdAt,
    completedAt,
    paymentStatus,
    fulfillmentStatus,
    paymentReference,
    customer,
    subtotal,
    shippingAmount,
    shippingLabel,
    total,
    items
  }
}

export async function readCheckoutOrders() {
  const res = await readJsonArrayResult<unknown>(checkoutOrdersPath)
  if (res.status === "missing" || res.status === "invalid" || res.status === "error") {
    return []
  }
  return res.value.map(normalizeCheckoutOrderRecord).filter(Boolean) as CheckoutOrderRecord[]
}

export async function writeCheckoutOrders(orders: CheckoutOrderRecord[]) {
  await writeJson(checkoutOrdersPath, orders)
}

export async function appendCheckoutOrder(order: CheckoutOrderRecord) {
  await withStorageLock(checkoutOrdersPath, async () => {
    const existing = await readCheckoutOrders()
    await writeCheckoutOrders([order, ...existing.filter((entry) => entry.id !== order.id)])
  })
}

export async function withCheckoutOrdersLock<T>(fn: () => Promise<T>): Promise<T> {
  return withStorageLock(checkoutOrdersPath, fn)
}

export async function updateCheckoutOrderFulfillmentStatus(orderId: string, fulfillmentStatus: string) {
  return await withCheckoutOrdersLock(async () => {
    const orders = await readCheckoutOrders()
    const index = orders.findIndex((entry) => entry.id === orderId)
    if (index === -1) return null
    const normalizedStatus = fulfillmentStatus.trim()
    const updated = {
      ...orders[index],
      fulfillmentStatus: normalizedStatus || undefined
    }
    const next = [...orders]
    next[index] = updated
    await writeCheckoutOrders(next)
    return updated
  })
}
