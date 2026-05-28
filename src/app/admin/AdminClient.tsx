"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { Perfume } from "@/types/perfume"
import { useRouter } from "next/navigation"
import { api } from "@/lib/admin/api"
import type { AdminSection, Draft, Review, ReviewDraft } from "@/lib/admin/types"
import { emptyDraft, emptyReviewDraft } from "@/lib/admin/types"
import { fromCsv, toNotesCsv } from "@/lib/admin/utils"
import { DeleteProductModal } from "./modals/DeleteProductModal"
import { DeleteReviewModal } from "./modals/DeleteReviewModal"
import { SellModal } from "./modals/SellModal"
import { ProductFormSection } from "./sections/ProductFormSection"
import { ProductsSection } from "./sections/ProductsSection"
import { ReportSection } from "./sections/ReportSection"
import { ReviewsSection } from "./sections/ReviewsSection"
import { AdminShell } from "./AdminShell"
import { useAdminData } from "@/lib/admin/hooks/useAdminData"
import { useDraftValidation } from "@/lib/admin/hooks/useDraftValidation"
import { useUploads } from "@/lib/admin/hooks/useUploads"

function useAdminUiState() {
  const [deleteTarget, setDeleteTarget] = useState<Perfume | null>(null)
  const [sellTarget, setSellTarget] = useState<Perfume | null>(null)
  const [deleteReviewTarget, setDeleteReviewTarget] = useState<Review | null>(null)
  const [sellQty, setSellQty] = useState(1)
  const [section, setSection] = useState<AdminSection>(() => {
    if (typeof window === "undefined") return "products"
    const stored = window.localStorage.getItem("admin_section")
    if (stored === "products" || stored === "form" || stored === "report" || stored === "reviews") return stored
    return "products"
  })

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

function useAdminActions(opts: {
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
  router: ReturnType<typeof useRouter>
  ui: ReturnType<typeof useAdminUiState>
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
    router,
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
    const currentStock = Math.max(0, Math.floor(ui.sellTarget.stock ?? 0))
    const qty = Math.min(currentStock, Math.max(1, Math.floor(ui.sellQty)))
    const nextStock = Math.max(0, currentStock - qty)
    setBusy(true)
    setError(null)
    try {
      const nextSold = Math.max(0, Math.floor((ui.sellTarget.sold ?? 0) + qty))
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
        cost: String(p.cost ?? 0),
        stock: String(p.stock ?? (p.availability === "out_of_stock" ? 0 : 1)),
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

  const onLogout = useCallback(() => {
    fetch("/api/admin/logout", { method: "POST" }).finally(() => {
      resetAdminData()
      setDraft(emptyDraft)
      setReviewDraft(emptyReviewDraft)
      resetProductUpload()
      resetReviewUpload()
      router.replace("/admin/login")
    })
  }, [resetAdminData, resetProductUpload, resetReviewUpload, router, setDraft, setReviewDraft])

  const onStartForm = useCallback(() => {
    setDraft(emptyDraft)
    resetProductUpload()
    ui.setSection("form")
  }, [resetProductUpload, setDraft, ui])

  return { onSave, onCreateReview, confirmDelete, confirmDeleteReview, confirmSell, onEdit, onLogout, onStartForm }
}

export function AdminClient() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const reviewFileInputRef = useRef<HTMLInputElement | null>(null)
  const router = useRouter()
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft>(emptyReviewDraft)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ui = useAdminUiState()

  const { perfumes, suggestions, sales, reviews, refresh, reset: resetAdminData } = useAdminData({
    setBusy,
    setError
  })
  const {
    uploading,
    uploadedPath,
    selectedFileName,
    localPreviewUrl,
    reviewUploading,
    reviewUploadedPath,
    reviewSelectedFileName,
    reviewLocalPreviewUrl,
    onUpload,
    onUploadReview,
    resetProductUpload,
    resetReviewUpload
  } = useUploads({ setBusy, setError, setDraft, setReviewDraft })
  const { isEditing, canSubmit, missingFields, finance, brandSuggestions, nameSuggestions } = useDraftValidation({
    draft,
    perfumes,
    suggestions
  })

  const actions = useAdminActions({
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
    router,
    ui
  })

  return (
    <div className="space-y-10 sm:space-y-12">
      <SellModal
        sellTarget={ui.sellTarget}
        busy={busy}
        sellQty={ui.sellQty}
        setSellQty={ui.setSellQty}
        onClose={() => ui.setSellTarget(null)}
        onConfirm={actions.confirmSell}
      />
      <DeleteProductModal
        deleteTarget={ui.deleteTarget}
        busy={busy}
        onClose={() => ui.setDeleteTarget(null)}
        onConfirm={actions.confirmDelete}
      />
      <DeleteReviewModal
        deleteReviewTarget={ui.deleteReviewTarget}
        busy={busy}
        onClose={() => ui.setDeleteReviewTarget(null)}
        onConfirm={actions.confirmDeleteReview}
      />
      <AdminShell
        busy={busy}
        error={error}
        section={ui.section}
        onRefresh={refresh}
        onLogout={actions.onLogout}
        onSelectSection={ui.setSection}
        onStartForm={actions.onStartForm}
      />

      {ui.section === "report" ? <ReportSection perfumes={perfumes} sales={sales} /> : null}
      {ui.section === "reviews" ? (
        <ReviewsSection
          reviews={reviews}
          reviewDraft={reviewDraft}
          setReviewDraft={setReviewDraft}
          busy={busy}
          reviewUploading={reviewUploading}
          reviewUploadedPath={reviewUploadedPath}
          reviewSelectedFileName={reviewSelectedFileName}
          reviewLocalPreviewUrl={reviewLocalPreviewUrl}
          reviewFileInputRef={reviewFileInputRef}
          onUploadReview={onUploadReview}
          onCreateReview={actions.onCreateReview}
          onDeleteReview={ui.onDeleteReview}
        />
      ) : null}
      {ui.section === "form" ? (
        <ProductFormSection
          draft={draft}
          setDraft={setDraft}
          isEditing={isEditing}
          canSubmit={canSubmit}
          missingFields={missingFields}
          finance={finance}
          busy={busy}
          uploading={uploading}
          uploadedPath={uploadedPath}
          selectedFileName={selectedFileName}
          localPreviewUrl={localPreviewUrl}
          fileInputRef={fileInputRef}
          brandSuggestions={brandSuggestions}
          nameSuggestions={nameSuggestions}
          onUpload={onUpload}
          onSave={actions.onSave}
          onCancelEdit={() => setDraft(emptyDraft)}
        />
      ) : null}
      {ui.section === "products" ? (
        <ProductsSection
          perfumes={perfumes}
          busy={busy}
          onEdit={actions.onEdit}
          onSell={ui.onSell}
          onDelete={ui.onDelete}
        />
      ) : null}
    </div>
  )
}
