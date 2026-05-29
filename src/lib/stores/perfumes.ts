import type { Perfume } from "@/types/perfume"
import { dataFilePath, readJsonArray, withStorageLock, writeJson } from "@/lib/storage/jsonFile"
import { availabilityFromStock } from "@/lib/perfume/parsers"

const perfumesPath = dataFilePath("perfumes.json")

function normalizePerfume(input: unknown): Perfume | null {
  if (!input || typeof input !== "object") return null
  const raw = input as Record<string, unknown>

  const id = typeof raw.id === "string" ? raw.id.trim() : ""
  const slug = typeof raw.slug === "string" ? raw.slug.trim() : ""
  const name = typeof raw.name === "string" ? raw.name.trim() : ""
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : ""
  const description = typeof raw.description === "string" ? raw.description.trim() : ""
  const imageSrc = typeof raw.imageSrc === "string" ? raw.imageSrc.trim() : ""

  if (!id || !slug || !name || !brand || !description || !imageSrc) return null

  const category = raw.category === "designer" || raw.category === "niche" ? raw.category : "niche"

  const sizeMlNum = typeof raw.sizeMl === "number" ? raw.sizeMl : Number(raw.sizeMl)
  const sizeMl = Number.isFinite(sizeMlNum) ? Math.max(0, sizeMlNum) : 0

  const priceNum = typeof raw.price === "number" ? raw.price : Number(raw.price)
  const price = Number.isFinite(priceNum) ? priceNum : 0

  const costNum = typeof raw.cost === "number" ? raw.cost : Number(raw.cost)
  const cost = Number.isFinite(costNum) ? Math.max(0, costNum) : 0

  const soldNum = typeof raw.sold === "number" ? raw.sold : Number(raw.sold)
  const sold = Number.isFinite(soldNum) ? Math.max(0, Math.floor(soldNum)) : 0

  const stockNum = typeof raw.stock === "number" ? raw.stock : Number(raw.stock)
  const stockParsed = Number.isFinite(stockNum) ? Math.max(0, Math.floor(stockNum)) : null

  const availabilityRaw =
    raw.availability === "in_stock" || raw.availability === "low_stock" || raw.availability === "out_of_stock"
      ? raw.availability
      : null

  const availability =
    stockParsed != null
      ? availabilityFromStock(stockParsed)
      : availabilityRaw ?? "in_stock"

  const stock = stockParsed ?? (availability === "out_of_stock" ? 0 : 1)

  const concentration = typeof raw.concentration === "string" ? raw.concentration.trim() : undefined

  const notesRaw = raw.notes
  const notes =
    notesRaw && typeof notesRaw === "object"
      ? {
          top: Array.isArray((notesRaw as Record<string, unknown>).top)
            ? ((notesRaw as Record<string, unknown>).top as unknown[]).filter((v): v is string => typeof v === "string")
            : undefined,
          heart: Array.isArray((notesRaw as Record<string, unknown>).heart)
            ? ((notesRaw as Record<string, unknown>).heart as unknown[]).filter((v): v is string => typeof v === "string")
            : undefined,
          base: Array.isArray((notesRaw as Record<string, unknown>).base)
            ? ((notesRaw as Record<string, unknown>).base as unknown[]).filter((v): v is string => typeof v === "string")
            : undefined
        }
      : undefined

  return {
    id,
    slug,
    name,
    brand,
    category,
    concentration: concentration || undefined,
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
}

export async function readPerfumes(): Promise<Perfume[]> {
  const parsed = await readJsonArray<unknown>(perfumesPath)
  return parsed.map(normalizePerfume).filter((p): p is Perfume => Boolean(p))
}

export async function writePerfumes(perfumes: Perfume[]) {
  await writeJson(
    perfumesPath,
    perfumes.map((p) => normalizePerfume(p)).filter((p): p is Perfume => Boolean(p))
  )
}

export async function withPerfumesLock<T>(fn: () => Promise<T>): Promise<T> {
  return withStorageLock(perfumesPath, fn)
}
