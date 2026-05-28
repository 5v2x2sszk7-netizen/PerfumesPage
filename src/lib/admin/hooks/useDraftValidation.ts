import type { Draft, Suggestions } from "@/lib/admin/types"
import { normalizeKey, uniqueNormalized } from "@/lib/admin/utils"
import type { Perfume } from "@/types/perfume"
import { useMemo } from "react"

type Finance = {
  price: number
  cost: number
  profit: number
  margin: number
}

export function useDraftValidation({
  draft,
  perfumes,
  suggestions
}: {
  draft: Draft
  perfumes: Perfume[]
  suggestions: Suggestions | null
}) {
  const isEditing = Boolean(draft.id)

  const canSubmit = useMemo(() => {
    const costNum = Number(draft.cost)
    const isCostValid = !draft.cost.trim() || (Number.isFinite(costNum) && costNum >= 0)
    return Boolean(
      draft.name.trim() &&
        draft.brand.trim() &&
        draft.description.trim() &&
        Number(draft.sizeMl) > 0 &&
        Number.isFinite(Number(draft.price)) &&
        isCostValid
    )
  }, [draft])

  const missingFields = useMemo(() => {
    const missing: string[] = []
    if (!draft.name.trim()) missing.push("Nombre")
    if (!draft.brand.trim()) missing.push("Marca")
    if (!draft.description.trim()) missing.push("Descripción")
    if (!(Number(draft.sizeMl) > 0)) missing.push("Tamaño (ml)")
    if (!Number.isFinite(Number(draft.price))) missing.push("Precio")
    if (draft.cost.trim() && !(Number.isFinite(Number(draft.cost)) && Number(draft.cost) >= 0)) missing.push("Costo")
    return missing
  }, [draft])

  const finance = useMemo<Finance>(() => {
    const price = Number(draft.price)
    const cost = Number(draft.cost)
    const priceOk = Number.isFinite(price) && price >= 0
    const costOk = Number.isFinite(cost) && cost >= 0
    const profit = priceOk && costOk ? price - cost : NaN
    const margin = priceOk && costOk && price > 0 ? profit / price : NaN
    return { price, cost, profit, margin }
  }, [draft.cost, draft.price])

  const brandSuggestions = useMemo(() => {
    return uniqueNormalized([...(suggestions?.brands ?? []), ...perfumes.map((p) => p.brand)])
  }, [perfumes, suggestions?.brands])

  const nameSuggestions = useMemo(() => {
    const draftBrandKey = normalizeKey(draft.brand)
    const fromSuggestions = draftBrandKey ? (suggestions?.namesByBrand[draftBrandKey] ?? []) : []
    const fromPerfumes = draftBrandKey
      ? perfumes.filter((p) => normalizeKey(p.brand) === draftBrandKey).map((p) => p.name)
      : perfumes.map((p) => p.name)

    if (draftBrandKey) return uniqueNormalized([...fromSuggestions, ...fromPerfumes])

    const allSuggestionNames = suggestions ? Object.values(suggestions.namesByBrand).flatMap((names) => names) : []

    return uniqueNormalized([...allSuggestionNames, ...fromPerfumes])
  }, [draft.brand, perfumes, suggestions])

  return { isEditing, canSubmit, missingFields, finance, brandSuggestions, nameSuggestions }
}
