import { api } from "@/lib/admin/api"
import type { Review, SaleRecord, Suggestions } from "@/lib/admin/types"
import type { Perfume } from "@/types/perfume"
import { useCallback, useEffect, useState } from "react"
import type { Dispatch, SetStateAction } from "react"

export function useAdminData({
  setBusy,
  setError
}: {
  setBusy: Dispatch<SetStateAction<boolean>>
  setError: Dispatch<SetStateAction<string | null>>
}) {
  const [perfumes, setPerfumes] = useState<Perfume[]>([])
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null)
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [reviews, setReviews] = useState<Review[]>([])

  const refresh = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const [productsData, reviewsData] = await Promise.all([
        api<{ perfumes: Perfume[]; suggestions?: Suggestions; sales?: SaleRecord[] }>(`/api/admin/products?_ts=${Date.now()}`),
        api<{ reviews: Review[] }>(`/api/admin/reviews?_ts=${Date.now()}`)
      ])
      setPerfumes(productsData.perfumes)
      setSuggestions(productsData.suggestions ?? null)
      setSales(Array.isArray(productsData.sales) ? productsData.sales : [])
      setReviews(Array.isArray(reviewsData.reviews) ? reviewsData.reviews : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error")
    } finally {
      setBusy(false)
    }
  }, [setBusy, setError])

  const reset = useCallback(() => {
    setPerfumes([])
    setSales([])
    setSuggestions(null)
    setReviews([])
  }, [])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      void refresh()
    })
    return () => {
      cancelled = true
    }
  }, [refresh])

  return { perfumes, suggestions, sales, reviews, refresh, reset }
}
