import type { PerfumeAvailability, PerfumeNotes } from "@/types/perfume"

export function isAllowedPerfumeImageSrc(value: string) {
  const v = value.trim()
  if (!v) return false
  if (v === "/images/bottle-placeholder.svg") return true
  if (v.startsWith("/uploads/") && v.toLowerCase().endsWith(".webp")) return true
  return false
}

export function parseStringArray(value: unknown): string[] | undefined {
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

export function parseNotes(value: unknown): PerfumeNotes | undefined {
  if (!value || typeof value !== "object") return undefined
  const record = value as Record<string, unknown>
  const top = parseStringArray(record.top)
  const heart = parseStringArray(record.heart)
  const base = parseStringArray(record.base)
  return top || heart || base ? { top, heart, base } : undefined
}

export function parseStock(value: unknown): number | null {
  if (value == null) return null
  if (typeof value !== "number") return null
  if (!Number.isFinite(value)) return null
  const int = Math.floor(value)
  if (int < 0) return null
  return int
}

export function parseCost(value: unknown): number | null {
  if (value == null) return null
  if (typeof value !== "number") return null
  if (!Number.isFinite(value)) return null
  if (value < 0) return null
  return value
}

export function parseSold(value: unknown): number | null {
  if (value == null) return null
  if (typeof value !== "number") return null
  if (!Number.isFinite(value)) return null
  const int = Math.floor(value)
  if (int < 0) return null
  return int
}

export function availabilityFromStock(stock: number): PerfumeAvailability {
  if (stock <= 0) return "out_of_stock"
  if (stock <= 3) return "low_stock"
  return "in_stock"
}
