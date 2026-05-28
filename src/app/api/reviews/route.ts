import { NextResponse } from "next/server"
import type { Review } from "@/lib/perfumeStore"
import { createReview } from "@/lib/perfumeStore"
import { checkRateLimit } from "@/lib/rateLimit"
import { isPersistenceNotConfiguredError } from "@/lib/persistence"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function POST(req: Request) {
  const rate = await checkRateLimit(req, { keyPrefix: "reviews", windowMs: 10 * 60 * 1000, max: 10 })
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limited" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil(rate.retryAfterMs / 1000)))
        }
      }
    )
  }
  const body = (await req.json().catch(() => null)) as (Partial<Review> & { website?: string }) | null
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  const honeypot = typeof body.website === "string" ? body.website.trim() : ""
  if (honeypot) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

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
    return NextResponse.json({ review: created }, { status: 201 })
  } catch (e) {
    if (isPersistenceNotConfiguredError(e)) {
      return NextResponse.json({ error: e.message }, { status: 501 })
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid review" }, { status: 400 })
  }
}
