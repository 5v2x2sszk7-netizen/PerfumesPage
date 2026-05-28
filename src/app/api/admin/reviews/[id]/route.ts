import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import { deleteReview, updateReview } from "@/lib/perfumeStore"
import type { Review } from "@/lib/perfumeStore"
import { isPersistenceNotConfiguredError } from "@/lib/persistence"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdmin(req)
  if (unauthorized) return unauthorized
  const { id } = await params
  const body = (await req.json()) as Partial<Review>

  try {
    const updated = await updateReview(id, {
      customerName: typeof body.customerName === "string" ? body.customerName.trim() : undefined,
      text: typeof body.text === "string" ? body.text.trim() : undefined,
      rating: typeof body.rating === "number" ? body.rating : undefined,
      imageSrc: typeof body.imageSrc === "string" ? body.imageSrc.trim() : undefined
    })
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ review: updated })
  } catch (e) {
    if (isPersistenceNotConfiguredError(e)) {
      return NextResponse.json({ error: e.message }, { status: 501 })
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid review" }, { status: 400 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdmin(req)
  if (unauthorized) return unauthorized
  const { id } = await params
  try {
    const ok = await deleteReview(id)
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (isPersistenceNotConfiguredError(e)) {
      return NextResponse.json({ error: e.message }, { status: 501 })
    }
    return NextResponse.json({ error: "Could not delete review" }, { status: 500 })
  }
}
