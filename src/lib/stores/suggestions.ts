import { dataFilePath, readJson, writeJson } from "@/lib/storage/jsonFile"
import { readPerfumes } from "@/lib/stores/perfumes"
import { normalizeKey } from "@/lib/text"

export type PerfumeSuggestions = {
  brands: string[]
  namesByBrand: Record<string, string[]>
}

const suggestionsPath = dataFilePath("suggestions.json")

function addUniqueCaseInsensitive(list: string[], value: string) {
  const trimmed = value.trim()
  if (!trimmed) return list
  const key = normalizeKey(trimmed)
  const exists = list.some((v) => normalizeKey(v) === key)
  return exists ? list : [...list, trimmed]
}

function buildSuggestionsFromPerfumes(perfumes: Array<{ brand: string; name: string }>): PerfumeSuggestions {
  const out: PerfumeSuggestions = { brands: [], namesByBrand: {} }
  for (const p of perfumes) {
    const brand = String(p.brand ?? "").trim()
    const name = String(p.name ?? "").trim()
    if (!brand) continue
    out.brands = addUniqueCaseInsensitive(out.brands, brand)
    const brandKey = normalizeKey(brand)
    const existingNames = out.namesByBrand[brandKey] ?? []
    out.namesByBrand[brandKey] = addUniqueCaseInsensitive(existingNames, name)
  }
  return out
}

function normalizeSuggestions(input: unknown): PerfumeSuggestions | null {
  if (!input || typeof input !== "object") return null
  const record = input as Record<string, unknown>
  const brandsRaw = record.brands
  const namesByBrandRaw = record.namesByBrand
  if (!Array.isArray(brandsRaw) || !namesByBrandRaw || typeof namesByBrandRaw !== "object") return null

  const brands = brandsRaw.map((v) => String(v).trim()).filter(Boolean)
  const namesByBrand: Record<string, string[]> = {}
  for (const [k, v] of Object.entries(namesByBrandRaw as Record<string, unknown>)) {
    if (!Array.isArray(v)) continue
    const key = normalizeKey(k)
    if (!key) continue
    namesByBrand[key] = v.map((x) => String(x).trim()).filter(Boolean)
  }

  return { brands, namesByBrand }
}

export async function readSuggestions(): Promise<PerfumeSuggestions> {
  const parsed = await readJson<unknown>(suggestionsPath)
  const normalized = normalizeSuggestions(parsed)
  if (normalized) return normalized
  return buildSuggestionsFromPerfumes(await readPerfumes())
}

export async function writeSuggestions(suggestions: PerfumeSuggestions) {
  await writeJson(suggestionsPath, suggestions)
}

export async function addSuggestion(brand: string, name: string) {
  const brandTrimmed = brand.trim()
  const nameTrimmed = name.trim()
  if (!brandTrimmed && !nameTrimmed) return

  const current = await readSuggestions()
  const next: PerfumeSuggestions = {
    brands: current.brands,
    namesByBrand: { ...current.namesByBrand }
  }

  if (brandTrimmed) next.brands = addUniqueCaseInsensitive(next.brands, brandTrimmed)

  if (brandTrimmed && nameTrimmed) {
    const brandKey = normalizeKey(brandTrimmed)
    const existingNames = next.namesByBrand[brandKey] ?? []
    next.namesByBrand[brandKey] = addUniqueCaseInsensitive(existingNames, nameTrimmed)
  }

  await writeSuggestions(next)
}
