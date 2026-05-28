import type { Perfume } from "@/types/perfume"
import type { ReactNode } from "react"

function renderInlineBold(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-ink-950">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={idx}>{part}</span>
  })
}

export function renderDescription(value: string): ReactNode {
  const raw = value?.trim()
  if (!raw) return null

  const blocks = raw
    .split(/\n\s*\n/g)
    .map((b) => b.trim())
    .filter(Boolean)

  const isSingleDenseBlock = blocks.length === 1 && raw.includes("\n") && !raw.includes("\n\n")

  return (
    <div className="mt-4 max-w-[72ch] space-y-4 text-[15px] leading-[1.85] text-ink-700">
      {(isSingleDenseBlock ? blocks[0].split("\n").map((l) => l.trim()).filter(Boolean) : blocks).map(
        (block, idx) => {
          const lines = block
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)

          const items = isSingleDenseBlock ? [block] : lines
          const isBullets = items.every((l) => l.startsWith("- ") || l.startsWith("• "))
          if (isBullets) {
            return (
              <ul key={idx} className="list-inside list-disc space-y-1 pl-1 marker:text-ink-400">
                {items.map((l, li) => (
                  <li key={li}>{renderInlineBold(l.replace(/^(-|•)\s+/, ""))}</li>
                ))}
              </ul>
            )
          }

          const single = items.join(" ")
          if (isSingleDenseBlock && idx === 0 && !single.includes(":")) {
            return (
              <p key={idx} className="font-display text-xl leading-[0.95] text-ink-950">
                {renderInlineBold(single)}
              </p>
            )
          }

          if (single.endsWith(":")) {
            return (
              <p key={idx} className="font-semibold text-ink-950">
                {single.slice(0, -1)}
              </p>
            )
          }

          const colonAt = single.indexOf(":")
          const canLabel = colonAt > 0 && colonAt <= 24

          if (canLabel) {
            const label = single.slice(0, colonAt).trim()
            const rest = single.slice(colonAt + 1).trim()
            return (
              <p key={idx}>
                <strong className="font-semibold text-ink-950">{label}:</strong>{" "}
                {renderInlineBold(rest)}
              </p>
            )
          }

          return <p key={idx}>{renderInlineBold(single)}</p>
        }
      )}
    </div>
  )
}

export function splitSentences(raw: string) {
  const cleaned = raw.trim().replace(/\s+/g, " ")
  if (!cleaned) return { headline: "", rest: "" }
  const parts = cleaned.split(/(?<=[.!?])\s+/g).map((p) => p.trim()).filter(Boolean)
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
