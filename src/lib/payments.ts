import fs from "node:fs"
import crypto from "node:crypto"
import path from "node:path"
import { siteConfig } from "@/config/site"
import type { CartItem } from "@/lib/cart"
import type { ShippingQuote } from "@/lib/shipping"

export type CheckoutProvider = "mercado_pago" | "paypal"

export type CheckoutCustomer = {
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

export type MercadoPagoPaymentLookupResult = {
  status: string
  id: string
  orderId?: string
}

type CheckoutPricing = Pick<ShippingQuote, "subtotal" | "shippingAmount" | "shippingLabel" | "total">

const localEnvCache = new Map<string, string>()
let localEnvLoaded = false

function readLocalEnvFile() {
  if (localEnvLoaded) return
  localEnvLoaded = true

  try {
    const filePath = path.resolve(process.cwd(), ".env.local")
    const raw = fs.readFileSync(filePath, "utf8")
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue
      const [key, ...rest] = trimmed.split("=")
      localEnvCache.set(key, rest.join("=").trim())
    }
  } catch {
    // Ignore missing local env fallback in environments where only process.env should be used.
  }
}

function envValue(key: string) {
  const fromProcess = process.env[key]?.trim()
  if (fromProcess) return fromProcess
  readLocalEnvFile()
  return localEnvCache.get(key)?.trim() || ""
}

export function getPaymentProviderAvailability() {
  return {
    mercadoPago: Boolean(envValue("MERCADO_PAGO_ACCESS_TOKEN")),
    paypal: Boolean(envValue("PAYPAL_CLIENT_ID") && envValue("PAYPAL_CLIENT_SECRET"))
  }
}

export function resolveSiteUrl() {
  return (envValue("NEXT_PUBLIC_SITE_URL") || "http://localhost:3000").replace(/\/$/, "")
}

function isLocalSiteUrl(value: string) {
  try {
    const url = new URL(value)
    return ["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname)
  } catch {
    return true
  }
}

function fullNameParts(fullName: string) {
  const trimmed = fullName.trim()
  if (!trimmed) return { givenName: "Cliente", surname: "Perfimes" }
  const [givenName, ...rest] = trimmed.split(/\s+/)
  return { givenName, surname: rest.join(" ") || "Perfimes" }
}

function cleanPhone(phone: string) {
  return phone.replace(/[^\d+]/g, "").trim()
}

function hexToBuffer(value: string) {
  if (!/^[a-f0-9]+$/i.test(value) || value.length % 2 !== 0) return null
  return Buffer.from(value, "hex")
}

function paypalBaseUrl() {
  return envValue("PAYPAL_ENV").toLowerCase() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com"
}

async function fetchJson(url: string, init: RequestInit) {
  const response = await fetch(url, init)
  const text = await response.text()
  const json = text ? JSON.parse(text) : null
  if (!response.ok) {
    const message = typeof json?.message === "string" ? json.message : `Request failed: ${response.status}`
    throw new Error(message)
  }
  return json
}

async function getPayPalOrder(orderId: string, token: string) {
  const json = await fetchJson(`${paypalBaseUrl()}/v2/checkout/orders/${orderId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  })

  const purchaseUnit =
    Array.isArray(json?.purchase_units) && json.purchase_units.length > 0
      ? (json.purchase_units[0] as Record<string, unknown>)
      : null
  const localOrderId =
    (typeof purchaseUnit?.custom_id === "string" && purchaseUnit.custom_id.trim()) ||
    (typeof purchaseUnit?.reference_id === "string" && purchaseUnit.reference_id.trim()) ||
    undefined

  return {
    status: typeof json?.status === "string" ? json.status : "UNKNOWN",
    id: typeof json?.id === "string" ? json.id : orderId,
    orderId: localOrderId
  }
}

export async function createMercadoPagoCheckout(input: {
  items: CartItem[]
  customer: CheckoutCustomer
  orderId: string
  pricing: CheckoutPricing
}) {
  const accessToken = envValue("MERCADO_PAGO_ACCESS_TOKEN")
  if (!accessToken) throw new Error("Mercado Pago no esta configurado.")

  const siteUrl = resolveSiteUrl()
  const isLocal = isLocalSiteUrl(siteUrl)
  const phone = cleanPhone(input.customer.phone)

  const body: Record<string, unknown> = {
    external_reference: input.orderId,
    metadata: {
      orderId: input.orderId,
      source: "perfimes"
    },
    items: [
      ...input.items.map((item) => ({
        id: item.id,
        title: `${item.brand} ${item.name} ${item.sizeMl} ml`,
        quantity: item.quantity,
        currency_id: siteConfig.currency,
        unit_price: Number(item.price.toFixed(2))
      })),
      ...(input.pricing.shippingAmount > 0
        ? [
            {
              id: `shipping-${input.orderId}`,
              title: input.pricing.shippingLabel,
              quantity: 1,
              currency_id: siteConfig.currency,
              unit_price: Number(input.pricing.shippingAmount.toFixed(2))
            }
          ]
        : [])
    ],
    payer: {
      name: input.customer.fullName,
      email: input.customer.email,
      phone: phone ? { number: phone } : undefined
    }
  }

  if (!isLocal) {
    body.back_urls = {
      success: `${siteUrl}/checkout/return?provider=mercado_pago&status=approved`,
      failure: `${siteUrl}/checkout/return?provider=mercado_pago&status=failure`,
      pending: `${siteUrl}/checkout/return?provider=mercado_pago&status=pending`
    }
    body.auto_return = "approved"
    body.notification_url = `${siteUrl}/api/webhooks/mercado-pago`
  }

  const json = await fetchJson("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  })

  const checkoutUrl =
    (typeof json?.init_point === "string" && json.init_point) ||
    (typeof json?.sandbox_init_point === "string" && json.sandbox_init_point) ||
    ""

  if (!checkoutUrl) throw new Error("Mercado Pago no devolvio un checkout valido.")

  return { checkoutUrl }
}

async function getPayPalAccessToken() {
  const clientId = envValue("PAYPAL_CLIENT_ID")
  const clientSecret = envValue("PAYPAL_CLIENT_SECRET")
  if (!clientId || !clientSecret) throw new Error("PayPal no esta configurado.")

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
  const json = await fetchJson(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  })

  if (typeof json?.access_token !== "string" || !json.access_token) {
    throw new Error("PayPal no devolvio token de acceso.")
  }

  return json.access_token
}

export async function createPayPalCheckout(input: {
  items: CartItem[]
  customer: CheckoutCustomer
  orderId: string
  pricing: CheckoutPricing
}) {
  const token = await getPayPalAccessToken()
  const siteUrl = resolveSiteUrl()
  const { givenName, surname } = fullNameParts(input.customer.fullName)

  const json = await fetchJson(`${paypalBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      payer: {
        name: {
          given_name: givenName,
          surname
        },
        email_address: input.customer.email
      },
      purchase_units: [
        {
          reference_id: input.orderId,
          custom_id: input.orderId,
          amount: {
            currency_code: siteConfig.currency,
            value: input.pricing.total.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: siteConfig.currency,
                value: input.pricing.subtotal.toFixed(2)
              },
              ...(input.pricing.shippingAmount > 0
                ? {
                    shipping: {
                      currency_code: siteConfig.currency,
                      value: input.pricing.shippingAmount.toFixed(2)
                    }
                  }
                : {})
            }
          },
          items: input.items.map((item) => ({
            name: `${item.brand} ${item.name}`,
            quantity: String(item.quantity),
            unit_amount: {
              currency_code: siteConfig.currency,
              value: item.price.toFixed(2)
            }
          }))
        }
      ],
      application_context: {
        brand_name: envValue("PAYPAL_BRAND_NAME") || "MALO Fragances",
        user_action: "PAY_NOW",
        return_url: `${siteUrl}/checkout/return?provider=paypal`,
        cancel_url: `${siteUrl}/checkout/return?provider=paypal&status=cancelled`
      }
    })
  })

  const approveUrl = Array.isArray(json?.links)
    ? json.links.find((link: { rel?: string; href?: string }) => link?.rel === "approve")?.href
    : undefined

  if (typeof approveUrl !== "string" || !approveUrl) throw new Error("PayPal no devolvio URL de aprobacion.")

  return {
    checkoutUrl: approveUrl,
    orderId: typeof json?.id === "string" ? json.id : undefined
  }
}

export async function capturePayPalOrder(orderId: string) {
  const token = await getPayPalAccessToken()
  try {
    const json = await fetchJson(`${paypalBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    })

    return {
      status: typeof json?.status === "string" ? json.status : "UNKNOWN",
      id: typeof json?.id === "string" ? json.id : orderId,
      orderId:
        (Array.isArray(json?.purchase_units) && json.purchase_units.length > 0
          ? ((((json.purchase_units[0] as Record<string, unknown>).custom_id as string | undefined) || "").trim() ||
              (((json.purchase_units[0] as Record<string, unknown>).reference_id as string | undefined) || "").trim())
          : "") || undefined
    }
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : ""
    if (message.includes("semantically incorrect") || message.includes("business validation")) {
      return await getPayPalOrder(orderId, token)
    }
    throw error
  }
}

export async function getMercadoPagoPayment(paymentId: string) {
  const accessToken = envValue("MERCADO_PAGO_ACCESS_TOKEN")
  if (!accessToken) throw new Error("Mercado Pago no esta configurado.")

  const json = await fetchJson(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  return {
    status: typeof json?.status === "string" ? json.status : "unknown",
    id: typeof json?.id === "number" || typeof json?.id === "string" ? String(json.id) : paymentId,
    orderId:
      (typeof json?.external_reference === "string" && json.external_reference.trim()) ||
      (typeof json?.metadata?.orderId === "string" && json.metadata.orderId.trim()) ||
      undefined
  }
}

export async function searchMercadoPagoPaymentByExternalReference(input: {
  externalReference: string
  status?: string
}) {
  const accessToken = envValue("MERCADO_PAGO_ACCESS_TOKEN")
  if (!accessToken) throw new Error("Mercado Pago no esta configurado.")

  const externalReference = input.externalReference.trim()
  if (!externalReference) throw new Error("Falta la referencia externa de Mercado Pago.")

  const search = new URL("https://api.mercadopago.com/v1/payments/search")
  search.searchParams.set("sort", "date_created")
  search.searchParams.set("criteria", "desc")
  search.searchParams.set("limit", "10")
  search.searchParams.set("external_reference", externalReference)
  if (input.status?.trim()) {
    search.searchParams.set("status", input.status.trim())
  }

  const json = await fetchJson(search.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  const results = Array.isArray(json?.results) ? json.results : []
  const match = results.find((entry: Record<string, unknown>) => {
    const metadata = entry.metadata as Record<string, unknown> | undefined
    const entryExternalReference =
      (typeof entry?.external_reference === "string" && entry.external_reference.trim()) ||
      (typeof metadata?.orderId === "string" && metadata.orderId.trim()) ||
      ""
    return entryExternalReference === externalReference
  })

  if (!match) {
    throw new Error("Mercado Pago no devolvio un pago para esta orden.")
  }

  return {
    status: typeof match?.status === "string" ? match.status : input.status?.trim() || "unknown",
    id: typeof match?.id === "number" || typeof match?.id === "string" ? String(match.id) : externalReference,
    orderId: externalReference
  } satisfies MercadoPagoPaymentLookupResult
}

export async function getMercadoPagoMerchantOrder(merchantOrderId: string) {
  const accessToken = envValue("MERCADO_PAGO_ACCESS_TOKEN")
  if (!accessToken) throw new Error("Mercado Pago no esta configurado.")

  const id = merchantOrderId.trim()
  if (!id) throw new Error("Falta el merchant_order_id de Mercado Pago.")

  const json = await fetchJson(`https://api.mercadopago.com/merchant_orders/${id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  const payments = Array.isArray(json?.payments) ? json.payments : []
  const approvedPayment =
    payments.find(
      (entry: Record<string, unknown>) => typeof entry?.status === "string" && entry.status.trim().toLowerCase() === "approved"
    ) ||
    payments[0] ||
    null

  return {
    status:
      (typeof approvedPayment?.status === "string" && approvedPayment.status) ||
      (typeof json?.order_status === "string" && json.order_status) ||
      "unknown",
    id:
      (typeof approvedPayment?.id === "number" || typeof approvedPayment?.id === "string"
        ? String(approvedPayment.id)
        : id),
    orderId:
      (typeof json?.external_reference === "string" && json.external_reference.trim()) ||
      (typeof json?.preference_id === "string" && json.preference_id.trim()) ||
      undefined
  } satisfies MercadoPagoPaymentLookupResult
}

export function hasPayPalWebhookVerificationConfigured() {
  return Boolean(envValue("PAYPAL_WEBHOOK_ID"))
}

export async function verifyPayPalWebhookSignature(headers: Headers, event: unknown) {
  const webhookId = envValue("PAYPAL_WEBHOOK_ID")
  if (!webhookId) {
    return {
      verified: false,
      skipped: true,
      reason: "PAYPAL_WEBHOOK_ID no configurado."
    }
  }

  const transmissionId = headers.get("paypal-transmission-id")?.trim() || ""
  const transmissionTime = headers.get("paypal-transmission-time")?.trim() || ""
  const transmissionSig = headers.get("paypal-transmission-sig")?.trim() || ""
  const authAlgo = headers.get("paypal-auth-algo")?.trim() || ""
  const certUrl = headers.get("paypal-cert-url")?.trim() || ""

  if (!transmissionId || !transmissionTime || !transmissionSig || !authAlgo || !certUrl) {
    return {
      verified: false,
      skipped: false,
      reason: "Faltan encabezados de verificacion de PayPal."
    }
  }

  const token = await getPayPalAccessToken()
  const json = await fetchJson(`${paypalBaseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      transmission_id: transmissionId,
      transmission_time: transmissionTime,
      cert_url: certUrl,
      auth_algo: authAlgo,
      transmission_sig: transmissionSig,
      webhook_id: webhookId,
      webhook_event: event
    })
  })

  return {
    verified: json?.verification_status === "SUCCESS",
    skipped: false,
    reason: typeof json?.verification_status === "string" ? json.verification_status : "UNKNOWN"
  }
}

export function hasMercadoPagoWebhookSecretConfigured() {
  return Boolean(envValue("MERCADO_PAGO_WEBHOOK_SECRET") || envValue("MERCADOPAGO_WEBHOOK_SECRET"))
}

export function verifyMercadoPagoWebhookSignature(input: {
  headers: Headers
  requestUrl: string
  dataId?: string | null
}) {
  const secret = envValue("MERCADO_PAGO_WEBHOOK_SECRET") || envValue("MERCADOPAGO_WEBHOOK_SECRET")
  if (!secret) {
    return {
      verified: false,
      skipped: true,
      reason: "MERCADO_PAGO_WEBHOOK_SECRET no configurado."
    }
  }

  const xSignature = input.headers.get("x-signature")?.trim() || ""
  if (!xSignature) {
    return {
      verified: false,
      skipped: false,
      reason: "Falta x-signature en la notificacion."
    }
  }

  const parts = new Map(
    xSignature
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [key, ...rest] = entry.split("=")
        return [key, rest.join("=").trim()]
      })
  )

  const ts = parts.get("ts") || ""
  const v1 = parts.get("v1") || ""
  const xRequestId = input.headers.get("x-request-id")?.trim() || ""
  const url = new URL(input.requestUrl)
  const rawDataId = (input.dataId || url.searchParams.get("data.id") || url.searchParams.get("id") || "").trim()
  const normalizedDataId = /^[a-z0-9]+$/i.test(rawDataId) ? rawDataId.toLowerCase() : rawDataId

  const manifestParts: string[] = []
  if (normalizedDataId) manifestParts.push(`id:${normalizedDataId};`)
  if (xRequestId) manifestParts.push(`request-id:${xRequestId};`)
  if (ts) manifestParts.push(`ts:${ts};`)

  if (!v1 || !ts || !manifestParts.length) {
    return {
      verified: false,
      skipped: false,
      reason: "No fue posible construir la firma de Mercado Pago."
    }
  }

  const expected = crypto.createHmac("sha256", secret).update(manifestParts.join("")).digest("hex")
  const expectedBuffer = hexToBuffer(expected)
  const receivedBuffer = hexToBuffer(v1)
  const verified =
    Boolean(expectedBuffer && receivedBuffer) &&
    expectedBuffer!.length === receivedBuffer!.length &&
    crypto.timingSafeEqual(expectedBuffer!, receivedBuffer!)

  return {
    verified,
    skipped: false,
    reason: verified ? "OK" : "Firma invalida."
  }
}
