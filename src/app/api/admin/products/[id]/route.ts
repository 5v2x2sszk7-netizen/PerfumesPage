import { NextResponse } from "next/server"
import type { Perfume } from "@/types/perfume"
import { addSuggestion, appendSale, readPerfumes, withPerfumesLock, writePerfumes } from "@/lib/perfumeStore"
import { isPersistenceNotConfiguredError } from "@/lib/persistence"
import { availabilityFromStock, isAllowedPerfumeImageSrc, parseCost, parseNotes, parseSold, parseStock } from "@/lib/perfume/parsers"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const action = req.headers.get("x-perfimes-action")?.trim().toLocaleLowerCase()
  const body = (await req.json()) as Partial<Perfume>
  if (body.imageSrc != null && typeof body.imageSrc === "string" && body.imageSrc.trim()) {
    if (!isAllowedPerfumeImageSrc(body.imageSrc)) {
      return NextResponse.json({ error: "Invalid imageSrc" }, { status: 400 })
    }
  }
  const notes = parseNotes(body.notes)
  const stockParsed = parseStock((body as unknown as { stock?: unknown }).stock)
  if (stockParsed === null && (body as unknown as { stock?: unknown }).stock != null) {
    return NextResponse.json({ error: "Invalid stock" }, { status: 400 })
  }
  const costParsed = parseCost((body as unknown as { cost?: unknown }).cost)
  if (costParsed === null && (body as unknown as { cost?: unknown }).cost != null) {
    return NextResponse.json({ error: "Invalid cost" }, { status: 400 })
  }
  const soldParsed = parseSold((body as unknown as { sold?: unknown }).sold)
  if (soldParsed === null && (body as unknown as { sold?: unknown }).sold != null) {
    return NextResponse.json({ error: "Invalid sold" }, { status: 400 })
  }

  try {
    const res = await withPerfumesLock(async () => {
      const perfumes = await readPerfumes()
      const idx = perfumes.findIndex((p) => p.id === id)
      if (idx === -1) return { status: "not_found" as const }

      const current = perfumes[idx]
      const availability =
        stockParsed != null ? availabilityFromStock(stockParsed) : body.availability ?? current.availability

      const updated: Perfume = {
        ...current,
        ...body,
        id: current.id,
        cost: costParsed ?? current.cost,
        sold: soldParsed ?? current.sold,
        stock: stockParsed ?? current.stock,
        availability,
        notes: body.notes ? notes : current.notes
      }

      const shouldLogSale = action === "sell" && soldParsed != null && soldParsed > current.sold
      if (shouldLogSale) {
        const qty = soldParsed - Math.max(0, Math.floor(current.sold ?? 0))
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
    if (res.status === "not_found") return NextResponse.json({ error: "Not found" }, { status: 404 })
    await addSuggestion(res.perfume.brand, res.perfume.name)
    return NextResponse.json({ perfume: res.perfume })
  } catch (e) {
    if (isPersistenceNotConfiguredError(e)) return NextResponse.json({ error: e.message }, { status: 501 })
    return NextResponse.json({ error: "Could not save product" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const deleted = await withPerfumesLock(async () => {
      const perfumes = await readPerfumes()
      const next = perfumes.filter((p) => p.id !== id)
      if (next.length === perfumes.length) return false
      await writePerfumes(next)
      return true
    })
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (isPersistenceNotConfiguredError(e)) return NextResponse.json({ error: e.message }, { status: 501 })
    return NextResponse.json({ error: "Could not delete product" }, { status: 500 })
  }
}
