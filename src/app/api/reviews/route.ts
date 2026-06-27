import type { Review } from "@/lib/perfumeStore"
import { createReview } from "@/lib/perfumeStore"
import { checkRateLimit } from "@/lib/rateLimit"
import { isPersistenceNotConfiguredError } from "@/lib/persistence"
import { jsonError, jsonOk, readJsonBody } from "@/lib/apiResponse"
import { customerCookieName } from "@/lib/customerAuth"
import { readCustomerFromSessionValue } from "@/lib/customerAccount"
import { formatCustomerOrderNumber } from "@/lib/orderPresentation"
import { getReviewEligibility, readEligibleReviewOrders } from "@/lib/reviewEligibility"

export const runtime = "nodejs"

export const dynamic = "force-dynamic"
export const revalidate = 0

function readCookieValue(cookieHeader: string, name: string) {
  const encodedName = `${encodeURIComponent(name)}=`
  for (const part of cookieHeader.split(/;\s*/)) {
    if (part.startsWith(encodedName)) {
      return decodeURIComponent(part.slice(encodedName.length))
    }
  }
  return null
}

export async function GET(req: Request) {
  const sessionValue = readCookieValue(req.headers.get("cookie") ?? "", customerCookieName)
  const customer = await readCustomerFromSessionValue(sessionValue)

  if (!customer) {
    return jsonOk({
      authenticated: false,
      customerName: "",
      totalOrders: 0,
      eligibleOrders: []
    })
  }

  const eligibility = await getReviewEligibility(customer.id, customer.email)

  return jsonOk({
    authenticated: true,
    customerName: customer.profile.fullName,
    totalOrders: eligibility.totalOrders,
    eligibleOrders: eligibility.eligibleOrders
  })
}

export async function POST(req: Request) {
  const rate = await checkRateLimit(req, { keyPrefix: "reviews", windowMs: 10 * 60 * 1000, max: 10 })
  if (!rate.allowed) {
    return jsonError("Rate limited", 429, {
      headers: {
        "Retry-After": String(Math.max(1, Math.ceil(rate.retryAfterMs / 1000)))
      }
    })
  }
  const body = await readJsonBody<Partial<Review> & { website?: string }>(req)
  if (!body) return jsonError("Invalid body", 400)

  const honeypot = typeof body.website === "string" ? body.website.trim() : ""
  if (honeypot) return jsonError("Invalid request", 400)

  const payload = {
    text: typeof body.text === "string" ? body.text : "",
    rating: typeof body.rating === "number" ? body.rating : undefined,
    deliveryCondition: typeof body.deliveryCondition === "string" ? body.deliveryCondition : undefined,
    deliveryNotes: typeof body.deliveryNotes === "string" ? body.deliveryNotes : undefined,
    deliveryImageSrc: typeof body.deliveryImageSrc === "string" ? body.deliveryImageSrc : undefined,
    deliveryImageSrcs: Array.isArray(body.deliveryImageSrcs) ? body.deliveryImageSrcs : undefined,
    orderId: typeof body.orderId === "string" ? body.orderId.trim() : ""
  }

  try {
    const sessionValue = readCookieValue(req.headers.get("cookie") ?? "", customerCookieName)
    const customer = await readCustomerFromSessionValue(sessionValue)
    if (!customer) {
      return jsonError("Inicia sesión con tu cuenta para dejar una reseña.", 401)
    }

    if (!payload.orderId) {
      return jsonError("Selecciona la compra que quieres reseñar.", 400)
    }

    const eligibleOrders = await readEligibleReviewOrders(customer.id, customer.email)
    const selectedOrder = eligibleOrders.find((order) => order.orderId === payload.orderId)

    if (!selectedOrder) {
      return jsonError("Esa compra ya fue reseñada o no es elegible para comentar.", 403)
    }

    const created = await createReview({
      ...payload,
      customerName: customer.profile.fullName,
      customerId: customer.id,
      customerEmail: customer.email,
      orderId: selectedOrder.orderId,
      orderNumber: selectedOrder.orderNumber || formatCustomerOrderNumber(selectedOrder.orderId),
      verifiedPurchase: true
    })
    return jsonOk({ review: created }, { status: 201 })
  } catch (e) {
    if (isPersistenceNotConfiguredError(e)) {
      return jsonError(e.message, 501)
    }
    return jsonError(e instanceof Error ? e.message : "Invalid review", 400)
  }
}
