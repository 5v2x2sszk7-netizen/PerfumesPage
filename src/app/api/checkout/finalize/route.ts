import { jsonError, jsonNoStoreOk, readJsonBody } from "@/lib/apiResponse"
import { applyConfirmedCheckout, isSuccessfulPayment } from "@/lib/checkout/confirmation"
import { isPersistenceNotConfiguredError } from "@/lib/persistence"
import { readOrders } from "@/lib/stores/orders"
import {
  capturePayPalOrder,
  getMercadoPagoMerchantOrder,
  getMercadoPagoPayment,
  searchMercadoPagoPaymentByExternalReference,
  type CheckoutProvider,
  type MercadoPagoPaymentLookupResult
} from "@/lib/payments"

type FinalizeCheckoutBody = {
  provider?: CheckoutProvider
  orderId?: string
  paymentId?: string
  collectionId?: string
  merchantOrderId?: string
  externalReference?: string
  status?: string
}

async function readFulfillmentStatus(orderId?: string) {
  const normalized = orderId?.trim() || ""
  if (!normalized) return ""
  const order = (await readOrders()).find((entry) => entry.id === normalized)
  return order?.fulfillmentStatus || ""
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
      const resolvedOrderId = inventory.orderId || result.orderId
      return jsonNoStoreOk({
        provider: "paypal",
        status: result.status,
        reference: result.id,
        orderId: resolvedOrderId,
        completedAt: inventory.completedAt,
        fulfillmentStatus: await readFulfillmentStatus(resolvedOrderId),
        inventoryUpdated: inventory.inventoryUpdated,
        inventoryMessage: inventory.inventoryMessage
      })
    }

    if (body.provider === "mercado_pago") {
      const paymentId = body.paymentId?.trim() || body.collectionId?.trim() || ""
      const merchantOrderId = body.merchantOrderId?.trim() || ""
      const externalReference = body.externalReference?.trim() || ""
      const statusHint = body.status?.trim() || ""

      if (!paymentId && !merchantOrderId && !externalReference) {
        return jsonError("Falta la referencia de Mercado Pago.", 400)
      }

      let result: MercadoPagoPaymentLookupResult | null = null
      let lastError: Error | null = null

      if (paymentId) {
        try {
          result = await getMercadoPagoPayment(paymentId)
        } catch (error) {
          lastError = error instanceof Error ? error : new Error("No se pudo consultar el pago de Mercado Pago.")
        }
      }

      if (!result && externalReference) {
        try {
          result = await searchMercadoPagoPaymentByExternalReference({
            externalReference,
            status: statusHint || undefined
          })
        } catch (error) {
          lastError = error instanceof Error ? error : new Error("No se pudo buscar el pago de Mercado Pago por referencia.")
        }
      }

      if (!result && merchantOrderId) {
        try {
          result = await getMercadoPagoMerchantOrder(merchantOrderId)
        } catch (error) {
          lastError = error instanceof Error ? error : new Error("No se pudo consultar la orden comercial de Mercado Pago.")
        }
      }

      if (!result) {
        throw lastError || new Error("No se pudo localizar el pago de Mercado Pago.")
      }

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
      const resolvedOrderId = inventory.orderId || result.orderId
      return jsonNoStoreOk({
        provider: "mercado_pago",
        status: result.status,
        reference: result.id,
        orderId: resolvedOrderId,
        completedAt: inventory.completedAt,
        fulfillmentStatus: await readFulfillmentStatus(resolvedOrderId),
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
