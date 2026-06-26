import { jsonError, jsonNoStoreOk, readJsonBody } from "@/lib/apiResponse"
import { applyConfirmedCheckout, isSuccessfulPayment } from "@/lib/checkout/confirmation"
import { isPersistenceNotConfiguredError } from "@/lib/persistence"
import { capturePayPalOrder, getMercadoPagoPayment, type CheckoutProvider } from "@/lib/payments"

type FinalizeCheckoutBody = {
  provider?: CheckoutProvider
  orderId?: string
  paymentId?: string
}

export async function POST(req: Request) {
  const body = await readJsonBody<FinalizeCheckoutBody>(req)
  if (!body) return jsonError("No se pudo leer la confirmacion de pago.", 400)

  try {
    if (body.provider === "paypal") {
      if (!body.orderId?.trim()) return jsonError("Falta el ID de PayPal.", 400)
      const result = await capturePayPalOrder(body.orderId.trim())
      const inventory =
        result.orderId && isSuccessfulPayment("paypal", result.status)
          ? await applyConfirmedCheckout({
              orderId: result.orderId,
              provider: "paypal",
              paymentStatus: result.status,
              paymentReference: result.id
            })
          : {
              inventoryUpdated: false,
              inventoryMessage: "Pago sin cambios de inventario."
            }
      return jsonNoStoreOk({
        provider: "paypal",
        status: result.status,
        reference: result.id,
        orderId: inventory.orderId || result.orderId,
        completedAt: inventory.completedAt,
        inventoryUpdated: inventory.inventoryUpdated,
        inventoryMessage: inventory.inventoryMessage
      })
    }

    if (body.provider === "mercado_pago") {
      if (!body.paymentId?.trim()) return jsonError("Falta el pago de Mercado Pago.", 400)
      const result = await getMercadoPagoPayment(body.paymentId.trim())
      const inventory =
        result.orderId && isSuccessfulPayment("mercado_pago", result.status)
          ? await applyConfirmedCheckout({
              orderId: result.orderId,
              provider: "mercado_pago",
              paymentStatus: result.status,
              paymentReference: result.id
            })
          : {
              inventoryUpdated: false,
              inventoryMessage: "Pago sin cambios de inventario."
            }
      return jsonNoStoreOk({
        provider: "mercado_pago",
        status: result.status,
        reference: result.id,
        orderId: inventory.orderId || result.orderId,
        completedAt: inventory.completedAt,
        inventoryUpdated: inventory.inventoryUpdated,
        inventoryMessage: inventory.inventoryMessage
      })
    }

    return jsonError("Metodo de pago invalido.", 400)
  } catch (error) {
    if (isPersistenceNotConfiguredError(error)) {
      return jsonNoStoreOk({
        provider: body.provider ?? "paypal",
        status: "completed",
        inventoryUpdated: false,
        inventoryMessage: error.message
      })
    }
    const message = error instanceof Error ? error.message : "No se pudo confirmar el pago."
    return jsonError(message, 500)
  }
}
