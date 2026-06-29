"use client"

import { useState } from "react"
import type { Draft } from "@/lib/admin/types"
import { emptyDraft } from "@/lib/admin/types"
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
import { useAdminUiState } from "@/features/admin/uiState"
import { useAdminActions } from "@/features/admin/actions"

export function AdminClient() {
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ui = useAdminUiState()

  const { perfumes, suggestions, sales, orders, reviews, refresh, reset: resetAdminData } = useAdminData({
    setBusy,
    setError
  })

  const { isEditing, canSubmit, missingFields, finance, brandSuggestions, nameSuggestions } = useDraftValidation({
    draft,
    perfumes,
    suggestions
  })

  const actions = useAdminActions({
    draft,
    setDraft,
    canSubmit,
    isEditing,
    setBusy,
    setError,
    refresh,
    resetAdminData,
    resetProductUpload: () => undefined,
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
          busy={busy}
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
          setBusy={setBusy}
          setError={setError}
          brandSuggestions={brandSuggestions}
          nameSuggestions={nameSuggestions}
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
