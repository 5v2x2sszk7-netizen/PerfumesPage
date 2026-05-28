"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { Perfume } from "@/types/perfume"
import { ButtonGhost } from "@/components/ui/Button"
import { useRouter } from "next/navigation"
import { api } from "@/lib/admin/api"
import type { AdminSection, Draft, Review, ReviewDraft, SaleRecord, Suggestions } from "@/lib/admin/types"
import { emptyDraft, emptyReviewDraft } from "@/lib/admin/types"
import { fromCsv, normalizeKey, toNotesCsv, uniqueNormalized } from "@/lib/admin/utils"
import { Pill } from "@/components/ui/Pill"
import { DeleteProductModal } from "./modals/DeleteProductModal"
import { DeleteReviewModal } from "./modals/DeleteReviewModal"
import { SellModal } from "./modals/SellModal"
import { ProductFormSection } from "./sections/ProductFormSection"
import { ProductsSection } from "./sections/ProductsSection"
import { ReportSection } from "./sections/ReportSection"
import { ReviewsSection } from "./sections/ReviewsSection"

type Finance = {
  price: number
  cost: number
  profit: number
  margin: number
}

function useAdminData({ setBusy, setError }: { setBusy: Dispatch<SetStateAction<boolean>>; setError: Dispatch<SetStateAction<string | null>> }) {
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
      if (productsData.suggestions) setSuggestions(productsData.suggestions)
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
    const t = window.setTimeout(() => {
      void refresh()
    }, 0)
    return () => window.clearTimeout(t)
  }, [refresh])

  return { perfumes, suggestions, sales, reviews, refresh, reset }
}

function useUploads({
  setBusy,
  setError,
  setDraft,
  setReviewDraft
}: {
  setBusy: Dispatch<SetStateAction<boolean>>
  setError: Dispatch<SetStateAction<string | null>>
  setDraft: Dispatch<SetStateAction<Draft>>
  setReviewDraft: Dispatch<SetStateAction<ReviewDraft>>
}) {
  const [uploading, setUploading] = useState(false)
  const [reviewUploading, setReviewUploading] = useState(false)
  const [uploadedPath, setUploadedPath] = useState<string | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)
  const [reviewUploadedPath, setReviewUploadedPath] = useState<string | null>(null)
  const [reviewSelectedFileName, setReviewSelectedFileName] = useState<string | null>(null)
  const [reviewLocalPreviewUrl, setReviewLocalPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
    }
  }, [localPreviewUrl])

  useEffect(() => {
    return () => {
      if (reviewLocalPreviewUrl) URL.revokeObjectURL(reviewLocalPreviewUrl)
    }
  }, [reviewLocalPreviewUrl])

  const resetProductUpload = useCallback(() => {
    setUploadedPath(null)
    setSelectedFileName(null)
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
    setLocalPreviewUrl(null)
  }, [localPreviewUrl])

  const resetReviewUpload = useCallback(() => {
    setReviewUploadedPath(null)
    setReviewSelectedFileName(null)
    if (reviewLocalPreviewUrl) URL.revokeObjectURL(reviewLocalPreviewUrl)
    setReviewLocalPreviewUrl(null)
  }, [reviewLocalPreviewUrl])

  const onUpload = useCallback(
    async (file: File) => {
      setSelectedFileName(file.name || null)
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
      setLocalPreviewUrl(URL.createObjectURL(file))
      setBusy(true)
      setUploading(true)
      setError(null)
      try {
        const form = new FormData()
        form.append("file", file)
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: form
        })
        if (!res.ok) {
          const json = await res.json().catch(() => null)
          throw new Error(json?.error || "Upload failed")
        }
        const json = (await res.json()) as { path: string }
        setUploadedPath(json.path)
        setDraft((d) => ({ ...d, imageSrc: json.path }))
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error")
      } finally {
        setBusy(false)
        setUploading(false)
      }
    },
    [localPreviewUrl, setBusy, setDraft, setError]
  )

  const onUploadReview = useCallback(
    async (file: File) => {
      setReviewSelectedFileName(file.name || null)
      if (reviewLocalPreviewUrl) URL.revokeObjectURL(reviewLocalPreviewUrl)
      setReviewLocalPreviewUrl(URL.createObjectURL(file))
      setBusy(true)
      setReviewUploading(true)
      setError(null)
      try {
        const form = new FormData()
        form.append("file", file)
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: form
        })
        if (!res.ok) {
          const json = await res.json().catch(() => null)
          throw new Error(json?.error || "Upload failed")
        }
        const json = (await res.json()) as { path: string }
        setReviewUploadedPath(json.path)
        setReviewDraft((d) => ({ ...d, imageSrc: json.path }))
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error")
      } finally {
        setBusy(false)
        setReviewUploading(false)
      }
    },
    [reviewLocalPreviewUrl, setBusy, setReviewDraft, setError]
  )

  return {
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
  }
}

function useDraftValidation({ draft, perfumes, suggestions }: { draft: Draft; perfumes: Perfume[]; suggestions: Suggestions | null }) {
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

    const allSuggestionNames = suggestions
      ? Object.values(suggestions.namesByBrand).flatMap((names) => names)
      : []

    return uniqueNormalized([...allSuggestionNames, ...fromPerfumes])
  }, [draft.brand, perfumes, suggestions])

  return { isEditing, canSubmit, missingFields, finance, brandSuggestions, nameSuggestions }
}

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
      <section className="rounded-luxe-xl bg-ink-50/60 p-3 ring-1 ring-inset ring-black/8 sm:p-5">
        <div className="rounded-3xl border border-black/8 bg-white p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs tracking-[0.25em] text-ink-500">ADMIN</p>
              <h1 className="font-display text-3xl text-ink-950">Panel</h1>
            </div>
            <div className="flex items-center gap-2">
              <ButtonGhost
                type="button"
                className="rounded-xl border border-black/8 px-4 py-2.5 text-sm hover:bg-ink-50"
                onClick={refresh}
                disabled={busy}
              >
                Recargar
              </ButtonGhost>
              <ButtonGhost
                type="button"
                className="rounded-xl border border-black/8 px-4 py-2.5 text-sm hover:bg-ink-50"
                onClick={onLogout}
                disabled={busy}
              >
                Salir
              </ButtonGhost>
            </div>
          </div>

          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

          <div className="mt-6 flex flex-wrap gap-2">
            <Pill
              type="button"
              onClick={() => setSection("products")}
              active={section === "products"}
              variant="admin"
            >
              Productos
            </Pill>
            <Pill
              type="button"
              onClick={() => {
                setDraft(emptyDraft)
                resetProductUpload()
                setSection("form")
              }}
              active={section === "form"}
              variant="admin"
            >
              Nuevo / Editar
            </Pill>
            <Pill
              type="button"
              onClick={() => setSection("report")}
              active={section === "report"}
              variant="admin"
            >
              Informe
            </Pill>
            <Pill
              type="button"
              onClick={() => setSection("reviews")}
              active={section === "reviews"}
              variant="admin"
            >
              Reseñas
            </Pill>
          </div>
        </div>
      </section>

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
