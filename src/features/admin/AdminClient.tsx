"use client"

import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import type { Draft, ReviewDraft } from "@/lib/admin/types"
import { emptyDraft, emptyReviewDraft } from "@/lib/admin/types"
import { DeleteProductModal } from "./modals/DeleteProductModal"
import { DeleteReviewModal } from "./modals/DeleteReviewModal"
import { SellModal } from "./modals/SellModal"
import { OrdersSection } from "./sections/OrdersSection"
import { ProductFormSection } from "./sections/ProductFormSection"
import { ProductsSection } from "./sections/ProductsSection"
import { ReportSection } from "./sections/ReportSection"
import { ReviewsSection } from "./sections/ReviewsSection"
import { AdminShell } from "./AdminShell"
import { useAdminData } from "@/lib/admin/hooks/useAdminData"
import { useDraftValidation } from "@/lib/admin/hooks/useDraftValidation"
import { useSingleUpload } from "@/lib/admin/hooks/useSingleUpload"
import { useAdminUiState } from "@/features/admin/uiState"
import { useAdminActions } from "@/features/admin/actions"

export function AdminClient() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const reviewFileInputRef = useRef<HTMLInputElement | null>(null)
  const router = useRouter()
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft>(emptyReviewDraft)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ui = useAdminUiState()

  const { perfumes, suggestions, sales, orders, reviews, refresh, reset: resetAdminData } = useAdminData({
    setBusy,
    setError
  })

  const productUpload = useSingleUpload({
    endpoint: "/api/admin/upload",
    setBusy,
    setError,
    onUploaded: (path) => setDraft((d) => ({ ...d, imageSrc: path }))
  })
  const reviewUpload = useSingleUpload({
    endpoint: "/api/admin/upload",
    setBusy,
    setError,
    onUploaded: (path) => setReviewDraft((d) => ({ ...d, imageSrc: path }))
  })

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
    resetProductUpload: productUpload.resetUpload,
    resetReviewUpload: reviewUpload.resetUpload,
    routerReplace: router.replace,
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

      {ui.section === "report" ? <ReportSection perfumes={perfumes} sales={sales} orders={orders} /> : null}
      {ui.section === "orders" ? <OrdersSection orders={orders} refresh={refresh} /> : null}
      {ui.section === "reviews" ? (
        <ReviewsSection
          reviews={reviews}
          reviewDraft={reviewDraft}
          setReviewDraft={setReviewDraft}
          busy={busy}
          reviewUploading={reviewUpload.uploading}
          reviewUploadedPath={reviewUpload.uploadedPath}
          reviewSelectedFileName={reviewUpload.selectedFileName}
          reviewLocalPreviewUrl={reviewUpload.localPreviewUrl}
          reviewFileInputRef={reviewFileInputRef}
          onUploadReview={reviewUpload.onUpload}
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
          uploading={productUpload.uploading}
          uploadedPath={productUpload.uploadedPath}
          selectedFileName={productUpload.selectedFileName}
          localPreviewUrl={productUpload.localPreviewUrl}
          fileInputRef={fileInputRef}
          brandSuggestions={brandSuggestions}
          nameSuggestions={nameSuggestions}
          onUpload={productUpload.onUpload}
          onSave={actions.onSave}
          onCancelEdit={() => setDraft(emptyDraft)}
        />
      ) : null}
      {ui.section === "products" ? (
        <ProductsSection perfumes={perfumes} busy={busy} onEdit={actions.onEdit} onSell={ui.onSell} onDelete={ui.onDelete} />
      ) : null}
    </div>
  )
}
