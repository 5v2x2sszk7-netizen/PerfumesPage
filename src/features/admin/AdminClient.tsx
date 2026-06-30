"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
import { Button } from "@/components/ui/Button"
import { useAdminData } from "@/lib/admin/hooks/useAdminData"
import { useDraftValidation } from "@/lib/admin/hooks/useDraftValidation"
import { useAdminUiState } from "@/features/admin/uiState"
import { useAdminActions } from "@/features/admin/actions"

type CriticalReservationToast = {
  id: number
  count: number
  customerPreview: string
}

const criticalReservationsSeenSessionKey = "admin-critical-reservations-seen:v1"

function getReservationExpiresAtMs(createdAt: string, reservationExpiresAt?: string) {
  const explicit = reservationExpiresAt ? new Date(reservationExpiresAt).getTime() : Number.NaN
  if (!Number.isNaN(explicit)) return explicit

  const createdAtMs = new Date(createdAt).getTime()
  if (Number.isNaN(createdAtMs)) return 0

  return createdAtMs + 15 * 60_000
}

export function AdminClient() {
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [criticalToast, setCriticalToast] = useState<CriticalReservationToast | null>(null)
  const ui = useAdminUiState()
  const previousCriticalIdsRef = useRef<Set<string>>(new Set())
  const seenCriticalIdsRef = useRef<Set<string>>(new Set())
  const criticalToastCounterRef = useRef(0)
  const hasInitializedCriticalReservationsRef = useRef(false)

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(criticalReservationsSeenSessionKey)
      if (!raw) return
      const ids = JSON.parse(raw)
      if (!Array.isArray(ids)) return
      seenCriticalIdsRef.current = new Set(ids.filter((value): value is string => typeof value === "string" && value.trim().length > 0))
    } catch {
      seenCriticalIdsRef.current = new Set()
    }
  }, [])

  const { perfumes, suggestions, sales, orders, checkoutOrders, reservationMetrics, reservationEventLog, reviews, refresh, reset: resetAdminData } = useAdminData({
    setBusy,
    setError
  })

  const criticalReservations = useMemo(() => {
    const nowMs = Date.now()
    const criticalWindowMs = 5 * 60_000

    return checkoutOrders.filter((order) => {
      if (order.status !== "pending") return false
      const remainingMs = getReservationExpiresAtMs(order.createdAt, order.reservationExpiresAt) - nowMs
      return remainingMs > 0 && remainingMs <= criticalWindowMs
    })
  }, [checkoutOrders])

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

  useEffect(() => {
    const criticalIds = new Set(criticalReservations.map((reservation) => reservation.id))

    if (!hasInitializedCriticalReservationsRef.current) {
      previousCriticalIdsRef.current = criticalIds
      hasInitializedCriticalReservationsRef.current = true
      return
    }

    const newCriticalReservations = criticalReservations.filter(
      (reservation) => !previousCriticalIdsRef.current.has(reservation.id) && !seenCriticalIdsRef.current.has(reservation.id)
    )
    previousCriticalIdsRef.current = criticalIds

    if (!newCriticalReservations.length) return

    newCriticalReservations.forEach((reservation) => {
      seenCriticalIdsRef.current.add(reservation.id)
    })
    try {
      window.sessionStorage.setItem(criticalReservationsSeenSessionKey, JSON.stringify(Array.from(seenCriticalIdsRef.current)))
    } catch {}

    void fetch("/api/admin/reservations/critical-alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reservationIds: newCriticalReservations.map((reservation) => reservation.id)
      })
    }).catch(() => undefined)

    criticalToastCounterRef.current += 1
    const preview = newCriticalReservations
      .slice(0, 2)
      .map((reservation) => reservation.customer.fullName)
      .join(", ")

    setCriticalToast({
      id: criticalToastCounterRef.current,
      count: newCriticalReservations.length,
      customerPreview: preview
    })
  }, [criticalReservations])

  useEffect(() => {
    if (!criticalToast) return

    const timeout = window.setTimeout(() => {
      setCriticalToast((current) => (current?.id === criticalToast.id ? null : current))
    }, 9000)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [criticalToast])

  return (
    <div className="space-y-10 sm:space-y-12">
      {criticalToast ? (
        <div className="fixed right-4 top-4 z-[80] w-[min(92vw,26rem)]">
          <div className="rounded-luxe-xl border border-[rgba(140,40,20,0.18)] bg-white/95 p-4 shadow-[0_20px_46px_rgba(10,10,10,0.16)] backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[rgb(140,40,20)]" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[rgb(140,40,20)]">Reserva Critica</p>
                <p className="mt-1 text-sm font-medium leading-6 text-ink-950">
                  {criticalToast.count === 1
                    ? "Una reserva entro a la ventana critica de 5 minutos."
                    : `${criticalToast.count} reservas entraron a la ventana critica de 5 minutos.`}
                </p>
                <p className="mt-1 text-sm leading-6 text-ink-600">
                  {criticalToast.customerPreview}
                  {criticalToast.count > 2 ? " y otras mas." : "."}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="px-3 py-2 text-sm"
                    onClick={() => {
                      ui.setSection("orders")
                      setCriticalToast(null)
                    }}
                  >
                    Revisar ordenes
                  </Button>
                  <button
                    type="button"
                    className="text-sm text-ink-500 transition hover:text-ink-950"
                    onClick={() => setCriticalToast(null)}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
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
        expiringReservationsCount={reservationMetrics?.expiringSoon ?? 0}
        onRefresh={refresh}
        onLogout={actions.onLogout}
        onSelectSection={ui.setSection}
        onStartForm={actions.onStartForm}
      />

      {ui.section === "report" ? <ReportSection perfumes={perfumes} sales={sales} orders={orders} /> : null}
      {ui.section === "orders" ? (
        <OrdersSection
          orders={orders}
          checkoutOrders={checkoutOrders}
          reservationMetrics={reservationMetrics}
          reservationEventLog={reservationEventLog}
          refresh={refresh}
        />
      ) : null}
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
