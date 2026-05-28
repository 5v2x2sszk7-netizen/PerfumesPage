import { NextResponse } from "next/server"
import type { Perfume } from "@/types/perfume"
import { requireAdmin } from "@/lib/adminAuth"
import { addSuggestion, readPerfumes, readSales, readSuggestions, writePerfumes } from "@/lib/perfumeStore"
import { slugify } from "@/lib/slug"
import { isPersistenceNotConfiguredError } from "@/lib/persistence"
import { availabilityFromStock, isAllowedPerfumeImageSrc, parseCost, parseNotes, parseSold, parseStock } from "@/lib/perfume/parsers"

export const dynamic = "force-dynamic"
export const revalidate = 0

function ensureUniqueSlug(slug: string, existing: Set<string>) {
  if (!existing.has(slug)) return slug
  let i = 2
  while (existing.has(`${slug}-${i}`)) i += 1
  return `${slug}-${i}`
}

export async function GET(req: Request) {
  const unauthorized = requireAdmin(req)
  if (unauthorized) return unauthorized
  const perfumes = await readPerfumes()
  const suggestions = await readSuggestions()
  const sales = await readSales()
  return NextResponse.json(
    { perfumes, suggestions, sales },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0"
      }
    }
  )
}

export async function POST(req: Request) {
  const unauthorized = requireAdmin(req)
  if (unauthorized) return unauthorized

  const body = (await req.json()) as Partial<Perfume>
  if (!body.name || !body.brand || !body.category || !body.description) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }
  if (!body.sizeMl || typeof body.sizeMl !== "number") {
    return NextResponse.json({ error: "Invalid sizeMl" }, { status: 400 })
  }
  if (typeof body.price !== "number") {
    return NextResponse.json({ error: "Invalid price" }, { status: 400 })
  }
  if (!body.availability) {
    return NextResponse.json({ error: "Missing availability" }, { status: 400 })
  }

  if (body.imageSrc != null && typeof body.imageSrc === "string" && body.imageSrc.trim()) {
    if (!isAllowedPerfumeImageSrc(body.imageSrc)) {
      return NextResponse.json({ error: "Invalid imageSrc" }, { status: 400 })
    }
  }

  const perfumes = await readPerfumes()
  const existingSlugs = new Set(perfumes.map((p) => p.slug))
  const baseSlug = slugify(body.slug?.trim() || `${body.brand} ${body.name}`)
  const slug = ensureUniqueSlug(baseSlug, existingSlugs)
  const idBase = body.id?.trim() || `${slug}-${body.sizeMl}`
  const existingIds = new Set(perfumes.map((p) => p.id))
  const id = existingIds.has(idBase) ? `${idBase}-${Date.now()}` : idBase

  const notes = parseNotes(body.notes)
  const stockParsed = parseStock((body as unknown as { stock?: unknown }).stock)
  if (stockParsed === null && (body as unknown as { stock?: unknown }).stock != null) {
    return NextResponse.json({ error: "Invalid stock" }, { status: 400 })
  }
  const costParsed = parseCost((body as unknown as { cost?: unknown }).cost)
  if (costParsed === null && (body as unknown as { cost?: unknown }).cost != null) {
    return NextResponse.json({ error: "Invalid cost" }, { status: 400 })
  }
  const cost = costParsed ?? 0
  const soldParsed = parseSold((body as unknown as { sold?: unknown }).sold)
  if (soldParsed === null && (body as unknown as { sold?: unknown }).sold != null) {
    return NextResponse.json({ error: "Invalid sold" }, { status: 400 })
  }
  const sold = soldParsed ?? 0
  const stock = stockParsed ?? (body.availability === "out_of_stock" ? 0 : 1)
  const availability = stockParsed != null ? availabilityFromStock(stock) : body.availability

  const created: Perfume = {
    id,
    slug,
    name: String(body.name),
    brand: String(body.brand),
    category: body.category,
    description: String(body.description),
    sizeMl: body.sizeMl,
    price: body.price,
    cost,
    sold,
    stock,
    availability,
    imageSrc: (typeof body.imageSrc === "string" && body.imageSrc.trim() ? body.imageSrc.trim() : "/images/bottle-placeholder.svg"),
    notes
  }

  const next = [created, ...perfumes]
  try {
    await writePerfumes(next)
    await addSuggestion(created.brand, created.name)
  } catch (e) {
    if (isPersistenceNotConfiguredError(e)) return NextResponse.json({ error: e.message }, { status: 501 })
    return NextResponse.json({ error: "Could not save product" }, { status: 500 })
  }
  return NextResponse.json({ perfume: created }, { status: 201 })
}
