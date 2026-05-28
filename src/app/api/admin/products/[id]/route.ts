import { NextResponse } from "next/server"
import type { Perfume } from "@/types/perfume"
import { requireAdmin } from "@/lib/adminAuth"
import { addSuggestion, appendSale, readPerfumes, writePerfumes } from "@/lib/perfumeStore"
import { isPersistenceNotConfiguredError } from "@/lib/persistence"

export const dynamic = "force-dynamic"
export const revalidate = 0

function isAllowedPerfumeImageSrc(value: string) {
  const v = value.trim()
  if (!v) return false
  if (v === "/images/bottle-placeholder.svg") return true
  if (v.startsWith("/uploads/") && v.toLowerCase().endsWith(".webp")) return true
  return false
}

function parseStringArray(value: unknown): string[] | undefined {
  if (value == null) return undefined
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean)
  if (typeof value === "string") {
    const parts = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    return parts.length ? parts : undefined
  }
  return undefined
}

function parseNotes(value: unknown): Perfume["notes"] | undefined {
  if (!value || typeof value !== "object") return undefined
  const record = value as Record<string, unknown>
  const top = parseStringArray(record.top)
  const heart = parseStringArray(record.heart)
  const base = parseStringArray(record.base)
  return top || heart || base ? { top, heart, base } : undefined
}

function parseStock(value: unknown): number | null {
  if (value == null) return null
  if (typeof value !== "number") return null
  if (!Number.isFinite(value)) return null
  const int = Math.floor(value)
  if (int < 0) return null
  return int
}

function parseCost(value: unknown): number | null {
  if (value == null) return null
  if (typeof value !== "number") return null
  if (!Number.isFinite(value)) return null
  if (value < 0) return null
  return value
}

function parseSold(value: unknown): number | null {
  if (value == null) return null
  if (typeof value !== "number") return null
  if (!Number.isFinite(value)) return null
  const int = Math.floor(value)
  if (int < 0) return null
  return int
}

function availabilityFromStock(stock: number): Perfume["availability"] {
  if (stock <= 0) return "out_of_stock"
  if (stock <= 3) return "low_stock"
  return "in_stock"
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdmin(req)
  if (unauthorized) return unauthorized
  const { id } = await params

  const action = req.headers.get("x-perfimes-action")?.trim().toLocaleLowerCase()
  const body = (await req.json()) as Partial<Perfume>
  if (body.imageSrc != null && typeof body.imageSrc === "string" && body.imageSrc.trim()) {
    if (!isAllowedPerfumeImageSrc(body.imageSrc)) {
      return NextResponse.json({ error: "Invalid imageSrc" }, { status: 400 })
    }
  }
  const perfumes = await readPerfumes()
  const idx = perfumes.findIndex((p) => p.id === id)
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const current = perfumes[idx]
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
  try {
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
    await addSuggestion(updated.brand, updated.name)
    return NextResponse.json({ perfume: updated })
  } catch (e) {
    if (isPersistenceNotConfiguredError(e)) return NextResponse.json({ error: e.message }, { status: 501 })
    return NextResponse.json({ error: "Could not save product" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdmin(req)
  if (unauthorized) return unauthorized
  const { id } = await params

  const perfumes = await readPerfumes()
  const next = perfumes.filter((p) => p.id !== id)
  if (next.length === perfumes.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  try {
    await writePerfumes(next)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (isPersistenceNotConfiguredError(e)) return NextResponse.json({ error: e.message }, { status: 501 })
    return NextResponse.json({ error: "Could not delete product" }, { status: 500 })
  }
}
