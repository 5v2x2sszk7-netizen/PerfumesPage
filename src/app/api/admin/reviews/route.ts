import { createReview, readReviews } from "@/lib/perfumeStore"
import type { Review } from "@/lib/perfumeStore"
import { isPersistenceNotConfiguredError } from "@/lib/persistence"
import { jsonError, jsonNoStoreOk, jsonOk } from "@/lib/apiResponse"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const reviews = await readReviews()
  return jsonNoStoreOk({ reviews })
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<Review>

  try {
    const created = await createReview({
      customerName: String(body.customerName ?? "").trim(),
      text: String(body.text ?? "").trim(),
      rating: typeof body.rating === "number" ? body.rating : undefined,
      imageSrc: typeof body.imageSrc === "string" ? body.imageSrc.trim() : undefined
    })
    return jsonOk({ review: created }, { status: 201 })
  } catch (e) {
    if (isPersistenceNotConfiguredError(e)) {
      return jsonError(e.message, 501)
    }
    return jsonError(e instanceof Error ? e.message : "Invalid review", 400)
  }
}
