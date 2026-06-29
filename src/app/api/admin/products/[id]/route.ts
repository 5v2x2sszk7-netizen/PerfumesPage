import type { Perfume } from "@/types/perfume"
import { addSuggestion, appendSale, readPerfumes, withPerfumesLock, writePerfumes } from "@/lib/perfumeStore"
import { isPersistenceNotConfiguredError } from "@/lib/persistence"
import {
  availabilityFromStock,
  isAllowedPerfumeImageSrc,
  parseCost,
  parseNotes,
  parsePerfumeImageGallery,
  parseSold,
  parseStock,
  resolvePerfumeImageGallery
} from "@/lib/perfume/parsers"
import { jsonError, jsonOk, readJsonBody } from "@/lib/apiResponse"

export const runtime = "nodejs"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  const action = req.headers.get("x-perfimes-action")?.trim().toLowerCase()
  const body = await readJsonBody<Partial<Perfume>>(req)
  if (!body) return jsonError("Invalid body", 400)
  if (body.imageSrc != null && typeof body.imageSrc === "string" && body.imageSrc.trim()) {
    if (!isAllowedPerfumeImageSrc(body.imageSrc)) {
      return jsonError("Invalid imageSrc", 400)
    }
  }
  const parsedImageGallery = parsePerfumeImageGallery((body as Record<string, unknown>).imageGallery)
  if ((body as Record<string, unknown>).imageGallery != null && parsedImageGallery === null) {
    return jsonError("Invalid imageGallery", 400)
  }
  const notes = parseNotes(body.notes)
  const stockParsed = parseStock((body as unknown as { stock?: unknown }).stock)
  if (stockParsed === null && (body as unknown as { stock?: unknown }).stock != null) {
    return jsonError("Invalid stock", 400)
  }
  const costParsed = parseCost((body as unknown as { cost?: unknown }).cost)
  if (costParsed === null && (body as unknown as { cost?: unknown }).cost != null) {
    return jsonError("Invalid cost", 400)
  }
  const soldParsed = parseSold((body as unknown as { sold?: unknown }).sold)
  if (soldParsed === null && (body as unknown as { sold?: unknown }).sold != null) {
    return jsonError("Invalid sold", 400)
  }

  try {
    const res = await withPerfumesLock(async () => {
      const perfumes = await readPerfumes()
      const idx = perfumes.findIndex((p) => p.id === id)
      if (idx === -1) return { status: "not_found" as const }

      const current = perfumes[idx]
      const availability =
        stockParsed != null ? availabilityFromStock(stockParsed) : body.availability ?? current.availability
      const nextImages =
        body.imageSrc != null || (body as Record<string, unknown>).imageGallery != null
          ? resolvePerfumeImageGallery({
              imageSrc: typeof body.imageSrc === "string" ? body.imageSrc : undefined,
              imageGallery: parsedImageGallery ?? undefined
            })
          : {
              imageSrc: current.imageSrc,
              imageGallery: current.imageGallery ?? [current.imageSrc]
            }

      const updated: Perfume = {
        ...current,
        ...body,
        id: current.id,
        cost: costParsed ?? current.cost,
        sold: soldParsed ?? current.sold,
        stock: stockParsed ?? current.stock,
        availability,
        imageSrc: nextImages.imageSrc,
        imageGallery: nextImages.imageGallery,
        notes: body.notes ? notes : current.notes
      }

      const shouldLogSale = action === "sell" && soldParsed != null && soldParsed > current.sold
      if (shouldLogSale) {
        const qty = soldParsed - Math.max(0, Math.floor(current.sold))
        if (qty > 0) {
          await appendSale({
            perfumeId: updated.id,
            brand: updated.brand,
            name: updated.name,
            sizeMl: updated.sizeMl,
            unitPrice: updated.price,
            unitCost: updated.cost,
            qty
          })
        }
      }

      const next = [...perfumes]
      next[idx] = updated
      await writePerfumes(next)
      return { status: "ok" as const, perfume: updated }
    })
    if (res.status === "not_found") return jsonError("Not found", 404)
    await addSuggestion(res.perfume.brand, res.perfume.name)
    return jsonOk({ perfume: res.perfume })
  } catch (e) {
    if (isPersistenceNotConfiguredError(e)) return jsonError(e.message, 501)
    return jsonError("Could not save product", 500)
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  try {
    const deleted = await withPerfumesLock(async () => {
      const perfumes = await readPerfumes()
      const next = perfumes.filter((p) => p.id !== id)
      if (next.length === perfumes.length) return false
      await writePerfumes(next)
      return true
    })
    if (!deleted) return jsonError("Not found", 404)
    return jsonOk({})
  } catch (e) {
    if (isPersistenceNotConfiguredError(e)) return jsonError(e.message, 501)
    return jsonError("Could not delete product", 500)
  }
}
