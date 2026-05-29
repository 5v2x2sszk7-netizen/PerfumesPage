import type { Perfume } from "@/types/perfume"
import { addSuggestion, readPerfumes, readSales, readSuggestions, withPerfumesLock, writePerfumes } from "@/lib/perfumeStore"
import { slugify } from "@/lib/slug"
import { isPersistenceNotConfiguredError } from "@/lib/persistence"
import { availabilityFromStock, isAllowedPerfumeImageSrc, parseCost, parseNotes, parseSold, parseStock } from "@/lib/perfume/parsers"
import { jsonError, jsonNoStoreOk, jsonOk, readJsonBody } from "@/lib/apiResponse"

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
  return jsonNoStoreOk({ perfumes, suggestions, sales })
}

export async function POST(req: Request) {
  const raw = await readJsonBody<unknown>(req)
  if (!raw || typeof raw !== "object") return jsonError("Invalid body", 400)
  const body = raw as Record<string, unknown>

  const name = typeof body.name === "string" ? body.name.trim() : ""
  const brand = typeof body.brand === "string" ? body.brand.trim() : ""
  const description = typeof body.description === "string" ? body.description.trim() : ""
  const category = body.category === "designer" || body.category === "niche" ? body.category : null
  if (!name || !brand || !description || !category) return jsonError("Missing required fields", 400)

  const sizeRaw = body.sizeMl
  const sizeMl = typeof sizeRaw === "number" ? sizeRaw : typeof sizeRaw === "string" ? Number(sizeRaw) : NaN
  if (!Number.isFinite(sizeMl) || sizeMl <= 0) return jsonError("Invalid sizeMl", 400)

  const priceRaw = body.price
  const price = typeof priceRaw === "number" ? priceRaw : typeof priceRaw === "string" ? Number(priceRaw) : NaN
  if (!Number.isFinite(price) || price < 0) return jsonError("Invalid price", 400)

  const availabilityBody =
    body.availability === "in_stock" || body.availability === "low_stock" || body.availability === "out_of_stock"
      ? body.availability
      : null
  if (!availabilityBody) return jsonError("Missing availability", 400)

  const slugInput = typeof body.slug === "string" ? body.slug.trim() : undefined
  const idInput = typeof body.id === "string" ? body.id.trim() : undefined

  const notes = parseNotes(body.notes)
  const stockParsed = parseStock(body.stock)
  if (stockParsed === null && body.stock != null) return jsonError("Invalid stock", 400)

  const costParsed = parseCost(body.cost)
  if (costParsed === null && body.cost != null) return jsonError("Invalid cost", 400)
  const cost = costParsed ?? 0

  const soldParsed = parseSold(body.sold)
  if (soldParsed === null && body.sold != null) return jsonError("Invalid sold", 400)
  const sold = soldParsed ?? 0

  const stock = stockParsed ?? (availabilityBody === "out_of_stock" ? 0 : 1)
  const availability = stockParsed != null ? availabilityFromStock(stock) : availabilityBody

  const imageSrcRaw = typeof body.imageSrc === "string" ? body.imageSrc.trim() : ""
  const imageSrc = imageSrcRaw ? imageSrcRaw : "/images/bottle-placeholder.svg"
  if (imageSrcRaw && !isAllowedPerfumeImageSrc(imageSrcRaw)) return jsonError("Invalid imageSrc", 400)

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
    return jsonOk({ perfume: created }, { status: 201 })
  } catch (e) {
    if (isPersistenceNotConfiguredError(e)) return jsonError(e.message, 501)
    return jsonError("Could not save product", 500)
  }
}
