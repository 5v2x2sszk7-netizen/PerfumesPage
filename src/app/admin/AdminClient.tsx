"use client"

import { useEffect, useRef, useState } from "react"
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

export function AdminClient() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const reviewFileInputRef = useRef<HTMLInputElement | null>(null)
  const router = useRouter()
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft>(emptyReviewDraft)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Perfume | null>(null)
  const [sellTarget, setSellTarget] = useState<Perfume | null>(null)
  const [deleteReviewTarget, setDeleteReviewTarget] = useState<Review | null>(null)
  const [sellQty, setSellQty] = useState(1)
  const [section, setSection] = useState<AdminSection>("products")

  const { perfumes, suggestions, sales, reviews, refresh, reset: resetAdminData } = useAdminData({ setBusy, setError })
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

  useEffect(() => {
    const t = window.setTimeout(() => {
      const stored = localStorage.getItem("admin_section")
      if (stored === "products" || stored === "form" || stored === "report" || stored === "reviews") setSection(stored)
    }, 0)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    localStorage.setItem("admin_section", section)
  }, [section])

  async function onSave() {
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
      setSection("products")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error")
    } finally {
      setBusy(false)
    }
  }

  async function onCreateReview() {
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
      setSection("reviews")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error")
    } finally {
      setBusy(false)
    }
  }

  function onDelete(perfume: Perfume) {
    setDeleteTarget(perfume)
  }

  function onDeleteReview(review: Review) {
    setDeleteReviewTarget(review)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setBusy(true)
    setError(null)
    try {
      await api(`/api/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" })
      await refresh()
      if (draft.id === id) setDraft(emptyDraft)
      setDeleteTarget(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error")
    } finally {
      setBusy(false)
    }
  }

  async function confirmDeleteReview() {
    if (!deleteReviewTarget) return
    const id = deleteReviewTarget.id
    setBusy(true)
    setError(null)
    try {
      await api(`/api/admin/reviews/${encodeURIComponent(id)}`, { method: "DELETE" })
      await refresh()
      setDeleteReviewTarget(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error")
    } finally {
      setBusy(false)
    }
  }

  function onSell(perfume: Perfume) {
    setSellTarget(perfume)
    setSellQty(1)
  }

  async function confirmSell() {
    if (!sellTarget) return
    const currentStock = Math.max(0, Math.floor(sellTarget.stock ?? 0))
    const qty = Math.min(currentStock, Math.max(1, Math.floor(sellQty)))
    const nextStock = Math.max(0, currentStock - qty)
    setBusy(true)
    setError(null)
    try {
      const nextSold = Math.max(0, Math.floor((sellTarget.sold ?? 0) + qty))
      await api(`/api/admin/products/${encodeURIComponent(sellTarget.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Perfimes-Action": "sell" },
        body: JSON.stringify({ stock: nextStock, sold: nextSold })
      })
      setSellTarget(null)
      await refresh()
      if (draft.id === sellTarget.id) setDraft(emptyDraft)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error")
    } finally {
      setBusy(false)
    }
  }

  function onEdit(p: Perfume) {
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
    setSection("form")
  }

  function onLogout() {
    fetch("/api/admin/logout", { method: "POST" }).finally(() => {
      resetAdminData()
      setDraft(emptyDraft)
      setReviewDraft(emptyReviewDraft)
      resetProductUpload()
      resetReviewUpload()
      router.replace("/admin/login")
    })
  }

  return (
    <div className="space-y-10 sm:space-y-12">
      <SellModal
        sellTarget={sellTarget}
        busy={busy}
        sellQty={sellQty}
        setSellQty={setSellQty}
        onClose={() => setSellTarget(null)}
        onConfirm={confirmSell}
      />
      <DeleteProductModal
        deleteTarget={deleteTarget}
        busy={busy}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
      <DeleteReviewModal
        deleteReviewTarget={deleteReviewTarget}
        busy={busy}
        onClose={() => setDeleteReviewTarget(null)}
        onConfirm={confirmDeleteReview}
      />
      <AdminShell
        busy={busy}
        error={error}
        section={section}
        onRefresh={refresh}
        onLogout={onLogout}
        onSelectSection={setSection}
        onStartForm={() => {
          setDraft(emptyDraft)
          resetProductUpload()
          setSection("form")
        }}
      />

      {section === "report" ? <ReportSection perfumes={perfumes} sales={sales} /> : null}
      {section === "reviews" ? (
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
          onCreateReview={onCreateReview}
          onDeleteReview={onDeleteReview}
        />
      ) : null}
      {section === "form" ? (
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
          onSave={onSave}
          onCancelEdit={() => setDraft(emptyDraft)}
        />
      ) : null}
      {section === "products" ? (
        <ProductsSection perfumes={perfumes} busy={busy} onEdit={onEdit} onSell={onSell} onDelete={onDelete} />
      ) : null}
    </div>
  )
}
