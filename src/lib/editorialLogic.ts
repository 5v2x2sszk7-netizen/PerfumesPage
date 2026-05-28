import type { Perfume } from "@/types/perfume"

export function splitSentences(raw: string) {
  const cleaned = raw.trim().replace(/\s+/g, " ")
  if (!cleaned) return { headline: "", rest: "" }
  const parts = cleaned
    .split(/(?<=[.!?])\s+/g)
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length <= 1) return { headline: cleaned, rest: "" }
  return { headline: parts[0] ?? cleaned, rest: parts.slice(1).join(" ") }
}

export function guessOlfactoryFamily({ description, notes }: Pick<Perfume, "description" | "notes">) {
  const pool = [
    ...(notes?.top ?? []),
    ...(notes?.heart ?? []),
    ...(notes?.base ?? []),
    description ?? ""
  ]
    .join(" ")
    .toLowerCase()

  const hasAny = (keys: string[]) => keys.some((k) => pool.includes(k))

  if (hasAny(["vainilla", "praliné", "praline", "tonka", "cacao", "chocolate", "ron", "gourmand"])) return "Gourmand"
  if (hasAny(["ámbar", "ambar", "resina", "incienso", "ambarado"])) return "Ambarada"
  if (hasAny(["sándalo", "sandalo", "cedro", "maderas", "amader"])) return "Amaderada"
  if (hasAny(["bergamota", "limón", "limon", "cítrico", "citric"])) return "Cítrica"
  if (hasAny(["aromático", "aromatic", "pimienta", "cardamomo"])) return "Aromática"
  return "—"
}
