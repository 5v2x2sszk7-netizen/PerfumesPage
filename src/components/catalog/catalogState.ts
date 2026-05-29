import { useCallback, useEffect, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { PerfumeCardModel } from "@/components/perfume/PerfumeCard"

export type SortKey = "recommended" | "name_asc" | "brand_asc" | "availability" | "price_asc" | "price_desc"
export type ViewMode = "grid" | "list"
export type CatalogCategory = PerfumeCardModel["category"]

export function parseSortKey(value: string | null): SortKey {
  if (
    value === "name_asc" ||
    value === "brand_asc" ||
    value === "availability" ||
    value === "price_asc" ||
    value === "price_desc" ||
    value === "recommended"
  ) {
    return value
  }
  return "recommended"
}

export function parseViewMode(value: string | null): ViewMode {
  if (value === "list" || value === "grid") return value
  return "grid"
}

export function parseCategory(value: string | null): CatalogCategory {
  if (value === "designer" || value === "niche") return value
  return "niche"
}

export function compareAvailability(a: PerfumeCardModel["availability"], b: PerfumeCardModel["availability"]) {
  const rank: Record<PerfumeCardModel["availability"], number> = {
    in_stock: 0,
    low_stock: 1,
    out_of_stock: 2
  }
  return rank[a] - rank[b]
}

export type ReplaceQuery = (mut: (next: URLSearchParams) => void) => void

export function useCatalogQueryState() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const replaceQuery = useCallback<ReplaceQuery>(
    (mut) => {
      const next = new URLSearchParams(searchParams.toString())
      mut(next)
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  return { searchParams, replaceQuery }
}

export function useCatalogPreferences(searchParams: ReturnType<typeof useSearchParams>, replaceQuery: ReplaceQuery) {
  const view = parseViewMode(searchParams.get("view"))
  const category = parseCategory(searchParams.get("category"))
  const didHydrateDefaultsRef = useRef(false)

  useEffect(() => {
    if (didHydrateDefaultsRef.current) return
    didHydrateDefaultsRef.current = true

    const storedViewRaw = localStorage.getItem("catalog_view")
    const viewToSet = storedViewRaw === "grid" || storedViewRaw === "list" ? storedViewRaw : null

    const storedCategoryRaw = localStorage.getItem("catalog_category")
    const categoryToSet = storedCategoryRaw === "niche" || storedCategoryRaw === "designer" ? storedCategoryRaw : null

    const shouldSetView = !searchParams.get("view") && viewToSet != null && viewToSet !== "grid"
    const shouldSetCategory = !searchParams.get("category") && categoryToSet != null && categoryToSet !== "niche"

    if (!shouldSetView && !shouldSetCategory) return

    replaceQuery((next) => {
      if (shouldSetView) next.set("view", viewToSet)
      if (shouldSetCategory) next.set("category", categoryToSet)
    })
  }, [replaceQuery, searchParams])

  useEffect(() => {
    localStorage.setItem("catalog_view", view)
  }, [view])

  useEffect(() => {
    localStorage.setItem("catalog_category", category)
  }, [category])

  return { view, category }
}
