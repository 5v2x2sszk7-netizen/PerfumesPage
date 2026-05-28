import { NextResponse } from "next/server"
import { createReview, readReviews } from "@/lib/perfumeStore"
import type { Review } from "@/lib/perfumeStore"
import { isPersistenceNotConfiguredError } from "@/lib/persistence"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const reviews = await readReviews()
  return NextResponse.json(
    { reviews },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0"
      }
    }
  )
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
    return NextResponse.json({ review: created }, { status: 201 })
  } catch (e) {
    if (isPersistenceNotConfiguredError(e)) {
      return NextResponse.json({ error: e.message }, { status: 501 })
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid review" }, { status: 400 })
  }
}
