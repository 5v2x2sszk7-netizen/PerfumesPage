import { useCallback, useEffect, useState } from "react"
import type { Perfume } from "@/types/perfume"
import type { AdminSection, Review } from "@/lib/admin/types"

export function useAdminUiState() {
  const [deleteTarget, setDeleteTarget] = useState<Perfume | null>(null)
  const [sellTarget, setSellTarget] = useState<Perfume | null>(null)
  const [deleteReviewTarget, setDeleteReviewTarget] = useState<Review | null>(null)
  const [sellQty, setSellQty] = useState(1)
  const [section, setSection] = useState<AdminSection>("products")

  useEffect(() => {
    const stored = window.localStorage.getItem("admin_section")
    if (stored === "products" || stored === "form" || stored === "report" || stored === "orders" || stored === "reviews") {
      setSection(stored)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("admin_section", section)
  }, [section])

  const onDelete = useCallback((perfume: Perfume) => setDeleteTarget(perfume), [])
  const onSell = useCallback((perfume: Perfume) => {
    setSellTarget(perfume)
    setSellQty(1)
  }, [])
  const onDeleteReview = useCallback((review: Review) => setDeleteReviewTarget(review), [])

  return {
    section,
    setSection,
    deleteTarget,
    setDeleteTarget,
    sellTarget,
    setSellTarget,
    deleteReviewTarget,
    setDeleteReviewTarget,
    sellQty,
    setSellQty,
    onDelete,
    onSell,
    onDeleteReview
  }
}

export type AdminUiState = ReturnType<typeof useAdminUiState>
