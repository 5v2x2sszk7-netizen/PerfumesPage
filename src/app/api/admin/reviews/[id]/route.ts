import { deleteReview, updateReview } from "@/lib/perfumeStore"
import type { Review } from "@/lib/perfumeStore"
import { isPersistenceNotConfiguredError } from "@/lib/persistence"
import { jsonError, jsonOk, readJsonBody } from "@/lib/apiResponse"

export const runtime = "nodejs"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await readJsonBody<Partial<Review>>(req)
  if (!body) return jsonError("Invalid body", 400)

  try {
    const updated = await updateReview(id, {
      customerName: typeof body.customerName === "string" ? body.customerName.trim() : undefined,
      text: typeof body.text === "string" ? body.text.trim() : undefined,
      rating: typeof body.rating === "number" ? body.rating : undefined,
      imageSrc: typeof body.imageSrc === "string" ? body.imageSrc.trim() : undefined
    })
    if (!updated) return jsonError("Not found", 404)
    return jsonOk({ review: updated })
  } catch (e) {
    if (isPersistenceNotConfiguredError(e)) {
      return jsonError(e.message, 501)
    }
    return jsonError(e instanceof Error ? e.message : "Invalid review", 400)
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const ok = await deleteReview(id)
    if (!ok) return jsonError("Not found", 404)
    return jsonOk({})
  } catch (e) {
    if (isPersistenceNotConfiguredError(e)) {
      return jsonError(e.message, 501)
    }
    return jsonError("Could not delete review", 500)
  }
}
