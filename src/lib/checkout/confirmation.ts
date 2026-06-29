import { revalidatePath } from "next/cache"
import { appendOrder, appendSale, readCheckoutOrders, readPerfumes, withCheckoutOrdersLock, withPerfumesLock, writeCheckoutOrders, writePerfumes } from "@/lib/perfumeStore"
import { availabilityFromStock } from "@/lib/perfume/parsers"
import type { CheckoutProvider } from "@/lib/payments"

export function isSuccessfulPayment(provider: CheckoutProvider, status: string) {
  const normalized = status.trim().toLowerCase()
  if (provider === "paypal") return normalized === "completed"
  return normalized === "approved"
}

export async function applyConfirmedCheckout(input: {
  orderId: string
  provider: CheckoutProvider
  paymentStatus: string
  paymentReference: string
}) {
  return await withCheckoutOrdersLock(async () => {
    const orders = await readCheckoutOrders()
    const orderIndex = orders.findIndex((entry) => entry.id === input.orderId)
    if (orderIndex === -1) {
      return {
        inventoryUpdated: false,
        inventoryMessage: "No se encontro una orden local para actualizar inventario."
      }
    }

    const currentOrder = orders[orderIndex]
    if (currentOrder.status === "completed") {
      revalidatePath("/catalog")
      revalidatePath("/catalog/[slug]", "page")
      return {
        inventoryUpdated: true,
        inventoryMessage: "Inventario ya aplicado previamente.",
        orderId: currentOrder.id,
        completedAt: currentOrder.completedAt
      }
    }

    await withPerfumesLock(async () => {
      const perfumes = await readPerfumes()
      const nextPerfumes = [...perfumes]

      for (const line of currentOrder.items) {
        const perfumeIndex = nextPerfumes.findIndex((entry) => entry.id === line.perfumeId)
        if (perfumeIndex === -1) continue

        const currentPerfume = nextPerfumes[perfumeIndex]
        const nextStock = Math.max(0, currentPerfume.stock - line.quantity)
        const nextSold = Math.max(0, Math.floor(currentPerfume.sold) + line.quantity)

        nextPerfumes[perfumeIndex] = {
          ...currentPerfume,
          stock: nextStock,
          sold: nextSold,
          availability: availabilityFromStock(nextStock)
        }
      }

      await writePerfumes(nextPerfumes)
    })

    for (const line of currentOrder.items) {
      await appendSale({
        perfumeId: line.perfumeId,
        brand: line.brand,
        name: line.name,
        sizeMl: line.sizeMl,
        unitPrice: line.unitPrice,
        unitCost: line.unitCost,
        qty: line.quantity
      })
    }

    const nextOrders = [...orders]
    const completedAt = new Date().toISOString()
    const completedOrder = {
      ...currentOrder,
      provider: input.provider,
      status: "completed" as const,
      completedAt,
      paymentStatus: input.paymentStatus,
      fulfillmentStatus: currentOrder.fulfillmentStatus,
      paymentReference: input.paymentReference
    }
    nextOrders[orderIndex] = completedOrder
    await writeCheckoutOrders(nextOrders)
    await appendOrder({
      id: completedOrder.id,
      provider: completedOrder.provider,
      checkoutMode: completedOrder.checkoutMode,
      customerId: completedOrder.customerId,
      createdAt: completedOrder.createdAt,
      completedAt,
      paymentStatus: completedOrder.paymentStatus || input.paymentStatus,
      fulfillmentStatus: completedOrder.fulfillmentStatus,
      paymentReference: completedOrder.paymentReference || input.paymentReference,
      customer: completedOrder.customer,
      subtotal: completedOrder.subtotal,
      shippingAmount: completedOrder.shippingAmount,
      shippingLabel: completedOrder.shippingLabel,
      total: completedOrder.total,
      items: completedOrder.items
    })

    revalidatePath("/catalog")
    revalidatePath("/catalog/[slug]", "page")

    return {
      inventoryUpdated: true,
      inventoryMessage: "Inventario y venta actualizados.",
      orderId: completedOrder.id,
      completedAt
    }
  })
}
