import { jsonError, jsonNoStoreOk, readJsonBody } from "@/lib/apiResponse"
import { appendCheckoutOrder, readPerfumesCached } from "@/lib/perfumeStore"
import { createMercadoPagoCheckout, createPayPalCheckout, type CheckoutCustomer, type CheckoutProvider } from "@/lib/payments"
import { toCartItem } from "@/lib/cart"
import { customerCookieName } from "@/lib/customerAuth"
import { mergeCustomerProfile, readCustomerFromSessionValue } from "@/lib/customerAccount"
import { readCustomers, withCustomersLock, writeCustomers } from "@/lib/stores/customers"

type CheckoutLineInput = {
  id?: string
  quantity?: number
}

type StartCheckoutBody = {
  checkoutMode?: "guest" | "account"
  provider?: CheckoutProvider
  items?: CheckoutLineInput[]
  customer?: Partial<CheckoutCustomer>
}

function readCookieValue(req: Request, name: string) {
  const raw = req.headers.get("cookie") || ""
  const cookies = raw.split(/;\s*/)
  for (const entry of cookies) {
    const index = entry.indexOf("=")
    if (index === -1) continue
    const key = entry.slice(0, index).trim()
    if (key !== name) continue
    return decodeURIComponent(entry.slice(index + 1))
  }
  return ""
}

function normalizeCustomer(value: Partial<CheckoutCustomer> | null | undefined): CheckoutCustomer | null {
  if (!value) return null

  const neighborhood = value.neighborhood?.trim() || ""
  const customer: CheckoutCustomer = {
    fullName: value.fullName?.trim() || "",
    email: value.email?.trim() || "",
    phone: value.phone?.trim() || "",
    addressLine1: value.addressLine1?.trim() || "",
    addressLine2: value.addressLine2?.trim() || "",
    neighborhood: neighborhood || undefined,
    city: value.city?.trim() || "",
    state: value.state?.trim() || "",
    postalCode: value.postalCode?.trim() || "",
    notes: value.notes?.trim() || ""
  }

  if (
    !customer.fullName ||
    !customer.email.includes("@") ||
    !customer.phone ||
    !customer.addressLine1 ||
    !customer.city ||
    !customer.state ||
    !customer.postalCode
  ) {
    return null
  }

  return customer
}

export async function POST(req: Request) {
  const body = await readJsonBody<StartCheckoutBody>(req)
  if (!body) return jsonError("No se pudo leer el checkout.", 400)
  if (body.provider !== "mercado_pago" && body.provider !== "paypal") {
    return jsonError("Metodo de pago invalido.", 400)
  }

  const checkoutMode = body.checkoutMode === "account" ? "account" : "guest"
  const sessionValue = readCookieValue(req, customerCookieName)
  const sessionCustomer = await readCustomerFromSessionValue(sessionValue)

  if (checkoutMode === "account" && !sessionCustomer) {
    return jsonError("Inicia sesion o crea tu cuenta para comprar con cuenta.", 401)
  }

  let customer = normalizeCustomer(body.customer)
  if (!customer) return jsonError("Completa tus datos de envio.", 400)
  if (sessionCustomer && checkoutMode === "account") {
    customer = {
      ...customer,
      email: sessionCustomer.email
    }
  }

  const requestedItems = Array.isArray(body.items) ? body.items : []
  if (!requestedItems.length) return jsonError("Tu carrito esta vacio.", 400)

  const perfumes = await readPerfumesCached()
  const orderItems = requestedItems.flatMap((line) => {
    if (!line?.id || typeof line.id !== "string") return []
    const perfume = perfumes.find((entry) => entry.id === line.id)
    if (!perfume || perfume.price <= 0 || perfume.stock <= 0 || perfume.availability === "out_of_stock") return []

    const quantity = Math.max(1, Math.min(perfume.stock, Math.trunc(line.quantity ?? 1) || 1))
    return [
      {
        cartItem: toCartItem(perfume, quantity),
        orderItem: {
          perfumeId: perfume.id,
          brand: perfume.brand,
          name: perfume.name,
          sizeMl: perfume.sizeMl,
          unitPrice: perfume.price,
          unitCost: perfume.cost,
          quantity
        }
      }
    ]
  })

  if (!orderItems.length) return jsonError("No hay productos validos para cobrar.", 400)

  const items = orderItems.map((entry) => entry.cartItem)

  const orderId = globalThis.crypto?.randomUUID?.() || `order-${Date.now()}`

  try {
    if (sessionCustomer && checkoutMode === "account") {
      await withCustomersLock(async () => {
        const customers = await readCustomers()
        const customerIndex = customers.findIndex((entry) => entry.id === sessionCustomer.id)
        if (customerIndex === -1) return

        customers[customerIndex] = {
          ...customers[customerIndex],
          updatedAt: new Date().toISOString(),
          profile: {
            ...mergeCustomerProfile(customers[customerIndex].profile, customer),
            email: customers[customerIndex].email
          }
        }

        await writeCustomers(customers)
      })
    }

    const result =
      body.provider === "mercado_pago"
        ? await createMercadoPagoCheckout({ items, customer, orderId })
        : await createPayPalCheckout({ items, customer, orderId })

    await appendCheckoutOrder({
      id: orderId,
      provider: body.provider,
      checkoutMode,
      customerId: checkoutMode === "account" ? sessionCustomer?.id : undefined,
      status: "pending",
      createdAt: new Date().toISOString(),
      customer,
      subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      items: orderItems.map((entry) => entry.orderItem)
    })

    return jsonNoStoreOk({
      url: result.checkoutUrl,
      orderId
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo iniciar el pago."
    return jsonError(message, 500)
  }
}
