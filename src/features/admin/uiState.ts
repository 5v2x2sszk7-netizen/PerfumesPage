import { useCallback, useState, useSyncExternalStore } from "react"
import type { Perfume } from "@/types/perfume"
import type { AdminSection, Review } from "@/lib/admin/types"

const adminSectionStorageKey = "admin_section"

function readAdminSection(): AdminSection {
  if (typeof window === "undefined") return "products"
  const stored = window.localStorage.getItem(adminSectionStorageKey)
  if (stored === "products" || stored === "form" || stored === "report" || stored === "reviews") return stored
  return "products"
}

function subscribeAdminSection(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined
  const onChange = () => onStoreChange()
  window.addEventListener("storage", onChange)
  window.addEventListener("admin-section-change", onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener("admin-section-change", onChange)
  }
}

export function useAdminUiState() {
  const [deleteTarget, setDeleteTarget] = useState<Perfume | null>(null)
  const [sellTarget, setSellTarget] = useState<Perfume | null>(null)
  const [deleteReviewTarget, setDeleteReviewTarget] = useState<Review | null>(null)
  const [sellQty, setSellQty] = useState(1)
  const section: AdminSection = useSyncExternalStore(
    subscribeAdminSection,
    readAdminSection,
    (): AdminSection => "products"
  )
  const setSection = useCallback((next: AdminSection) => {
    window.localStorage.setItem(adminSectionStorageKey, next)
    window.dispatchEvent(new Event("admin-section-change"))
  }, [])

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
