import { siteConfig } from "@/config/site"
import { normalizeKey } from "@/lib/text"

export function toNotesCsv(value?: string[]) {
  return (value ?? []).join(", ")
}

export function fromCsv(value: string) {
  const items = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  return items.length ? items : undefined
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: siteConfig.currency,
    maximumFractionDigits: 0
  }).format(value)
}

export function uniqueNormalized(values: string[]) {
  const seen = new Map<string, string>()
  for (const raw of values) {
    const value = raw.trim()
    if (!value) continue
    const key = normalizeKey(value)
    if (!seen.has(key)) seen.set(key, value)
  }
  const collator = new Intl.Collator("es", { sensitivity: "base" })
  return Array.from(seen.values()).sort(collator.compare)
}

export { normalizeKey }
