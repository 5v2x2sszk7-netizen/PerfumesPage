import { useCallback } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { Perfume } from "@/types/perfume"
import type { Draft, ReviewDraft } from "@/lib/admin/types"
import { emptyDraft, emptyReviewDraft } from "@/lib/admin/types"
import { api } from "@/lib/admin/api"
import { fromCsv, toNotesCsv } from "@/lib/admin/utils"
import type { AdminUiState } from "@/features/admin/uiState"

export function useAdminActions(opts: {
  draft: Draft
  setDraft: Dispatch<SetStateAction<Draft>>
  reviewDraft: ReviewDraft
  setReviewDraft: Dispatch<SetStateAction<ReviewDraft>>
  canSubmit: boolean
  isEditing: boolean
  setBusy: Dispatch<SetStateAction<boolean>>
  setError: Dispatch<SetStateAction<string | null>>
  refresh: () => Promise<void>
  resetAdminData: () => void
  resetProductUpload: () => void
  resetReviewUpload: () => void
  routerReplace: (href: string) => void
  ui: AdminUiState
}) {
  const {
    draft,
    setDraft,
    reviewDraft,
    setReviewDraft,
    canSubmit,
    isEditing,
    setBusy,
    setError,
    refresh,
    resetAdminData,
    resetProductUpload,
    resetReviewUpload,
    routerReplace,
    ui
  } = opts

  const onSave = useCallback(async () => {
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    try {
      const stock = Math.max(0, Math.floor(Number(draft.stock)))
      const costRaw = Number(draft.cost)
      const cost = Math.max(0, Number.isFinite(costRaw) ? costRaw : 0)
      const payload: Partial<Perfume> = {
        name: draft.name.trim(),
        brand: draft.brand.trim(),
        category: draft.category,
        description: draft.description.trim(),
        sizeMl: Number(draft.sizeMl),
        price: Number(draft.price),
        cost,
        stock,
        availability: draft.availability,
        imageSrc: draft.imageSrc.trim() || "/images/bottle-placeholder.svg",
        notes: {
          top: fromCsv(draft.notesTop),
          heart: fromCsv(draft.notesHeart),
          base: fromCsv(draft.notesBase)
        }
      }

      if (isEditing && draft.id) {
        await api(`/api/admin/products/${encodeURIComponent(draft.id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
      } else {
        await api("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
      }
      setDraft(emptyDraft)
      resetProductUpload()
      await refresh()
      ui.setSection("products")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error")
    } finally {
      setBusy(false)
    }
  }, [canSubmit, draft, isEditing, refresh, resetProductUpload, setBusy, setDraft, setError, ui])

  const onCreateReview = useCallback(async () => {
    const customerName = reviewDraft.customerName.trim()
    const text = reviewDraft.text.trim()
    const ratingNum = Number(reviewDraft.rating)
    const rating = reviewDraft.rating.trim() ? (Number.isFinite(ratingNum) ? ratingNum : undefined) : undefined
    if (!customerName || !text) return
    setBusy(true)
    setError(null)
    try {
      await api("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          text,
          rating,
          imageSrc: reviewDraft.imageSrc.trim() || undefined
        })
      })
      setReviewDraft(emptyReviewDraft)
      resetReviewUpload()
      await refresh()
      ui.setSection("reviews")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error")
    } finally {
      setBusy(false)
    }
  }, [refresh, resetReviewUpload, reviewDraft, setBusy, setError, setReviewDraft, ui])

  const confirmDelete = useCallback(async () => {
    if (!ui.deleteTarget) return
    const id = ui.deleteTarget.id
    setBusy(true)
    setError(null)
    try {
      await api(`/api/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" })
      await refresh()
      if (draft.id === id) setDraft(emptyDraft)
      ui.setDeleteTarget(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error")
    } finally {
      setBusy(false)
    }
  }, [draft.id, refresh, setBusy, setDraft, setError, ui])

  const confirmDeleteReview = useCallback(async () => {
    if (!ui.deleteReviewTarget) return
    const id = ui.deleteReviewTarget.id
    setBusy(true)
    setError(null)
    try {
      await api(`/api/admin/reviews/${encodeURIComponent(id)}`, { method: "DELETE" })
      await refresh()
      ui.setDeleteReviewTarget(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error")
    } finally {
      setBusy(false)
    }
  }, [refresh, setBusy, setError, ui])

  const confirmSell = useCallback(async () => {
    if (!ui.sellTarget) return
    const currentStock = Math.max(0, Math.floor(ui.sellTarget.stock))
    const qty = Math.min(currentStock, Math.max(1, Math.floor(ui.sellQty)))
    const nextStock = Math.max(0, currentStock - qty)
    setBusy(true)
    setError(null)
    try {
      const nextSold = Math.max(0, Math.floor(ui.sellTarget.sold + qty))
      await api(`/api/admin/products/${encodeURIComponent(ui.sellTarget.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Perfimes-Action": "sell" },
        body: JSON.stringify({ stock: nextStock, sold: nextSold })
      })
      const soldId = ui.sellTarget.id
      ui.setSellTarget(null)
      await refresh()
      if (draft.id === soldId) setDraft(emptyDraft)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error")
    } finally {
      setBusy(false)
    }
  }, [draft.id, refresh, setBusy, setDraft, setError, ui])

  const onEdit = useCallback(
    (p: Perfume) => {
      resetProductUpload()
      setDraft({
        id: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        description: p.description,
        sizeMl: String(p.sizeMl),
        price: String(p.price),
        cost: String(p.cost),
        stock: String(p.stock),
        availability: p.availability,
        imageSrc: p.imageSrc,
        notesTop: toNotesCsv(p.notes?.top),
        notesHeart: toNotesCsv(p.notes?.heart),
        notesBase: toNotesCsv(p.notes?.base)
      })
      ui.setSection("form")
    },
    [resetProductUpload, setDraft, ui]
  )

  const onLogout = useCallback(async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST", cache: "no-store", keepalive: true })
    } catch {
      // Even if the request is interrupted in dev, clear local UI state before leaving admin.
    } finally {
      resetAdminData()
      setDraft(emptyDraft)
      setReviewDraft(emptyReviewDraft)
      resetProductUpload()
      resetReviewUpload()
      window.location.replace("/admin/login")
    }
  }, [resetAdminData, resetProductUpload, resetReviewUpload, routerReplace, setDraft, setReviewDraft])

  const onStartForm = useCallback(() => {
    setDraft(emptyDraft)
    resetProductUpload()
    ui.setSection("form")
  }, [resetProductUpload, setDraft, ui])

  return { onSave, onCreateReview, confirmDelete, confirmDeleteReview, confirmSell, onEdit, onLogout, onStartForm }
}
