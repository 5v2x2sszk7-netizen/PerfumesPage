import { NextResponse } from "next/server"
import type { Perfume } from "@/types/perfume"
import { addSuggestion, readPerfumes, readSales, readSuggestions, withPerfumesLock, writePerfumes } from "@/lib/perfumeStore"
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

export async function GET() {
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

  const name = String(body.name)
  const brand = String(body.brand)
  const description = String(body.description)
  const category = body.category as Perfume["category"]
  const sizeMl = body.sizeMl as number
  const price = body.price as number
  const availabilityBody = body.availability as Perfume["availability"]
  const slugInput = body.slug?.trim()
  const idInput = body.id?.trim()

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
  const stock = stockParsed ?? (availabilityBody === "out_of_stock" ? 0 : 1)
  const availability = stockParsed != null ? availabilityFromStock(stock) : availabilityBody

  const imageSrc =
    typeof body.imageSrc === "string" && body.imageSrc.trim()
      ? body.imageSrc.trim()
      : "/images/bottle-placeholder.svg"

  try {
    const created = await withPerfumesLock(async () => {
      const perfumes = await readPerfumes()
      const existingSlugs = new Set(perfumes.map((p) => p.slug))
      const baseSlug = slugify(slugInput || `${brand} ${name}`)
      const slug = ensureUniqueSlug(baseSlug, existingSlugs)
      const idBase = idInput || `${slug}-${sizeMl}`
      const existingIds = new Set(perfumes.map((p) => p.id))
      const id = existingIds.has(idBase) ? `${idBase}-${Date.now()}` : idBase

      const created: Perfume = {
        id,
        slug,
        name,
        brand,
        category,
        description,
        sizeMl,
        price,
        cost,
        sold,
        stock,
        availability,
        imageSrc,
        notes
      }

      const next = [created, ...perfumes]
      await writePerfumes(next)
      return created
    })
    await addSuggestion(created.brand, created.name)
    return NextResponse.json({ perfume: created }, { status: 201 })
  } catch (e) {
    if (isPersistenceNotConfiguredError(e)) return NextResponse.json({ error: e.message }, { status: 501 })
    return NextResponse.json({ error: "Could not save product" }, { status: 500 })
  }
}
