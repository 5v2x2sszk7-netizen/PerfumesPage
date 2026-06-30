import { createHash } from "node:crypto"
import { revalidatePath } from "next/cache"
import { jsonError, jsonNoStoreOk, readJsonBody } from "@/lib/apiResponse"
import { createMercadoPagoCheckout, createPayPalCheckout, type CheckoutCustomer, type CheckoutProvider } from "@/lib/payments"
import { getCheckoutReservationExpiresAt, isCheckoutReservationActive, toSellablePerfume } from "@/lib/checkout/reservations"
import { toCartItem } from "@/lib/cart"
import { customerCookieName } from "@/lib/customerAuth"
import { mergeCustomerProfile, readCustomerFromSessionValue } from "@/lib/customerAccount"
import { checkRateLimit } from "@/lib/rateLimit"
import { calculateShippingQuote } from "@/lib/shipping"
import { appendCheckoutOrderEventRecord, readCheckoutOrders, removeCheckoutOrder, withCheckoutOrdersLock, writeCheckoutOrders } from "@/lib/stores/checkoutOrders"
import { readCustomers, withCustomersLock, writeCustomers } from "@/lib/stores/customers"
import { readPerfumes } from "@/lib/stores/perfumes"

const activeReservationCookieName = "perfimes_active_checkout_reservation"
const guestReservationOwnerCookieName = "perfimes_guest_checkout_owner"

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

function invalidCartMessage(input: { invalidCount: number; adjustedCount: number }) {
  if (input.invalidCount > 0 && input.adjustedCount > 0) {
    return "Tu carrito cambio: algunos perfumes ya no estan disponibles y otros tienen menor stock. Revisa tu seleccion antes de pagar."
  }
  if (input.invalidCount > 0) {
    return "Tu carrito cambio: uno o mas perfumes ya no estan disponibles. Revisa tu seleccion antes de pagar."
  }
  return "Tu carrito cambio: una o mas cantidades ya no estan disponibles. Revisa tu seleccion antes de pagar."
}

function revalidateShopInventory() {
  revalidatePath("/")
  revalidatePath("/catalog")
  revalidatePath("/catalog/[slug]", "page")
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

function hashOwnerKey(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function buildReservationOwnerKey(input: {
  checkoutMode: "guest" | "account"
  sessionCustomerId?: string
  guestReservationOwnerId?: string
  customerEmail: string
}) {
  if (input.checkoutMode === "account" && input.sessionCustomerId) {
    return hashOwnerKey(`account:${input.sessionCustomerId}`)
  }
  if (input.guestReservationOwnerId) {
    return hashOwnerKey(`guest-session:${input.guestReservationOwnerId}`)
  }
  return hashOwnerKey(`guest-email:${input.customerEmail.trim().toLowerCase()}`)
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
  const rate = await checkRateLimit(req, { keyPrefix: "checkout-start", windowMs: 10 * 60 * 1000, max: 6 })
  if (!rate.allowed) {
    return jsonError("Demasiados intentos de checkout. Espera un momento antes de volver a intentar.", 429, {
      headers: {
        "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000))
      }
    })
  }

  const body = await readJsonBody<StartCheckoutBody>(req)
  if (!body) return jsonError("No se pudo leer el checkout.", 400)
  if (body.provider !== "mercado_pago" && body.provider !== "paypal") {
    return jsonError("Metodo de pago invalido.", 400)
  }
  const provider = body.provider

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
  const guestReservationOwnerId =
    checkoutMode === "guest"
      ? readCookieValue(req, guestReservationOwnerCookieName) || globalThis.crypto?.randomUUID?.() || `guest-${Date.now()}`
      : ""
  const reservationOwnerKey = buildReservationOwnerKey({
    checkoutMode,
    sessionCustomerId: sessionCustomer?.id,
    guestReservationOwnerId,
    customerEmail: customer.email
  })

  const requestedItems = Array.isArray(body.items) ? body.items : []
  if (!requestedItems.length) return jsonError("Tu carrito esta vacio.", 400)
  const requestedItemIds = new Set(requestedItems.map((line) => (typeof line?.id === "string" ? line.id : "")).filter(Boolean))

  const orderId = globalThis.crypto?.randomUUID?.() || `order-${Date.now()}`
  const createdAt = new Date().toISOString()

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

    const reservation = await withCheckoutOrdersLock(async () => {
      const checkoutOrders = await readCheckoutOrders()
      const nowIso = new Date().toISOString()
      const perfumes = await readPerfumes()
      const nowMs = Date.now()
      let invalidCount = 0
      let adjustedCount = 0
      const normalizedCheckoutOrders = checkoutOrders.map((entry) => {
        if (
          entry.status !== "pending" ||
          entry.reservationOwnerKey !== reservationOwnerKey ||
          !isCheckoutReservationActive(entry, nowMs)
        ) {
          return entry
        }

        const overlapsRequestedItems = entry.items.some((item) => requestedItemIds.has(item.perfumeId))
        if (!overlapsRequestedItems) return entry

        return appendCheckoutOrderEventRecord({
          ...entry,
          reservationExpiresAt: nowIso,
          reservationReleasedAt: nowIso,
          reservationReleaseReason: "manual"
        }, {
          type: "reservation_released",
          at: nowIso,
          detail: "Reserva previa liberada al iniciar un nuevo checkout con los mismos articulos."
        })
      })

      const orderItems = requestedItems.flatMap((line) => {
        if (!line?.id || typeof line.id !== "string") return []
        const perfume = perfumes.find((entry) => entry.id === line.id)
        if (!perfume) {
          invalidCount += 1
          return []
        }

        const sellablePerfume = toSellablePerfume({
          perfume,
          checkoutOrders: normalizedCheckoutOrders,
          nowMs
        })

        if (sellablePerfume.price <= 0 || sellablePerfume.stock <= 0 || sellablePerfume.availability === "out_of_stock") {
          invalidCount += 1
          return []
        }

        const requestedQuantity = Math.max(1, Math.trunc(line.quantity ?? 1) || 1)
        const quantity = Math.max(1, Math.min(sellablePerfume.stock, requestedQuantity))
        if (quantity !== requestedQuantity) adjustedCount += 1

        return [
          {
            cartItem: toCartItem(sellablePerfume, quantity),
            orderItem: {
              perfumeId: sellablePerfume.id,
              brand: sellablePerfume.brand,
              name: sellablePerfume.name,
              sizeMl: sellablePerfume.sizeMl,
              unitPrice: sellablePerfume.price,
              unitCost: sellablePerfume.cost,
              quantity
            }
          }
        ]
      })

      if (invalidCount > 0 || adjustedCount > 0) {
        return {
          ok: false as const,
          invalidCount,
          adjustedCount
        }
      }

      if (!orderItems.length) {
        return {
          ok: false as const,
          invalidCount: 1,
          adjustedCount: 0
        }
      }

      const items = orderItems.map((entry) => entry.cartItem)
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const shipping = calculateShippingQuote({
        subtotal,
        state: customer.state,
        postalCode: customer.postalCode
      })

      if (!shipping.isReady) {
        return {
          ok: false as const,
          shippingError: true
        }
      }

      await writeCheckoutOrders([
        appendCheckoutOrderEventRecord({
          id: orderId,
          provider,
          checkoutMode,
          customerId: checkoutMode === "account" ? sessionCustomer?.id : undefined,
          reservationOwnerKey,
          status: "pending",
          createdAt,
          reservationExpiresAt: getCheckoutReservationExpiresAt(createdAt),
          customer,
          subtotal,
          shippingAmount: shipping.shippingAmount,
          shippingLabel: shipping.shippingLabel,
          total: shipping.total,
          items: orderItems.map((entry) => entry.orderItem)
        }, {
          type: "reservation_created",
          at: createdAt,
          detail: "Reserva temporal creada al iniciar checkout."
        }),
        ...normalizedCheckoutOrders.filter((entry) => entry.id !== orderId)
      ])

      return {
        ok: true as const,
        items,
        shipping,
        reservationExpiresAt: getCheckoutReservationExpiresAt(createdAt)
      }
    })

    if (!reservation.ok) {
      if (reservation.shippingError) {
        return jsonError("No se pudo calcular el envio para esta direccion. Revisa tu estado y codigo postal.", 400)
      }
      return jsonError(
        invalidCartMessage({
          invalidCount: reservation.invalidCount ?? 0,
          adjustedCount: reservation.adjustedCount ?? 0
        }),
        409
      )
    }

    revalidateShopInventory()

    const result =
      provider === "mercado_pago"
        ? await createMercadoPagoCheckout({ items: reservation.items, customer, orderId, pricing: reservation.shipping })
        : await createPayPalCheckout({ items: reservation.items, customer, orderId, pricing: reservation.shipping })

    await withCheckoutOrdersLock(async () => {
      const checkoutOrders = await readCheckoutOrders()
      const next = checkoutOrders.map((entry) =>
        entry.id === orderId
          ? appendCheckoutOrderEventRecord(entry, {
              type: "checkout_started",
              detail: `Checkout externo listo en ${provider === "paypal" ? "PayPal" : "Mercado Pago"}.`
            })
          : entry
      )
      await writeCheckoutOrders(next)
    })

    const response = jsonNoStoreOk({
      url: result.checkoutUrl,
      orderId,
      reservationExpiresAt: reservation.reservationExpiresAt
    })

    const expiresAtMs = new Date(reservation.reservationExpiresAt).getTime()
    const maxAge = Number.isNaN(expiresAtMs) ? 10 * 60 : Math.max(1, Math.ceil((expiresAtMs - Date.now()) / 1000))
    response.cookies.set(activeReservationCookieName, JSON.stringify({
      orderId,
      provider,
      expiresAt: reservation.reservationExpiresAt,
      linesKey: requestedItems
        .map((line) => ({
          id: typeof line.id === "string" ? line.id.trim() : "",
          quantity: Math.max(1, Math.trunc(line.quantity ?? 1) || 1)
        }))
        .filter((line) => line.id)
        .sort((a, b) => a.id.localeCompare(b.id, "es"))
        .map((line) => `${line.id}:${line.quantity}`)
        .join("|")
    }), {
      path: "/",
      sameSite: "lax",
      secure: true,
      maxAge
    })
    if (checkoutMode === "guest" && guestReservationOwnerId) {
      response.cookies.set(guestReservationOwnerCookieName, guestReservationOwnerId, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30
      })
    }

    return response
  } catch (error) {
    await removeCheckoutOrder(orderId)
    revalidateShopInventory()
    const message = error instanceof Error ? error.message : "No se pudo iniciar el pago."
    return jsonError(message, 500)
  }
}
