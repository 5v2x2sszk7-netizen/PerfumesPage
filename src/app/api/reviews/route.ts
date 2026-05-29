import type { Review } from "@/lib/perfumeStore"
import { createReview } from "@/lib/perfumeStore"
import { checkRateLimit } from "@/lib/rateLimit"
import { isPersistenceNotConfiguredError } from "@/lib/persistence"
import { jsonError, jsonOk, readJsonBody } from "@/lib/apiResponse"

export const dynamic = "force-dynamic"
export const revalidate = 0

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
    customerName: typeof body.customerName === "string" ? body.customerName : "",
    text: typeof body.text === "string" ? body.text : "",
    rating: typeof body.rating === "number" ? body.rating : undefined,
    deliveryCondition: typeof body.deliveryCondition === "string" ? body.deliveryCondition : undefined,
    deliveryNotes: typeof body.deliveryNotes === "string" ? body.deliveryNotes : undefined,
    deliveryImageSrc: typeof body.deliveryImageSrc === "string" ? body.deliveryImageSrc : undefined,
    deliveryImageSrcs: Array.isArray(body.deliveryImageSrcs) ? body.deliveryImageSrcs : undefined
  }

  try {
    const created = await createReview(payload)
    return jsonOk({ review: created }, { status: 201 })
  } catch (e) {
    if (isPersistenceNotConfiguredError(e)) {
      return jsonError(e.message, 501)
    }
    return jsonError(e instanceof Error ? e.message : "Invalid review", 400)
  }
}
