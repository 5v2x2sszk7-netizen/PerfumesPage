import { api } from "@/lib/admin/api"
import type {
  CheckoutReservationRecord,
  ConfirmedOrderRecord,
  ReservationEventLogEntry,
  ReservationMetrics,
  Review,
  SaleRecord,
  Suggestions
} from "@/lib/admin/types"
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
  const [orders, setOrders] = useState<ConfirmedOrderRecord[]>([])
  const [checkoutOrders, setCheckoutOrders] = useState<CheckoutReservationRecord[]>([])
  const [reservationMetrics, setReservationMetrics] = useState<ReservationMetrics | null>(null)
  const [reservationEventLog, setReservationEventLog] = useState<ReservationEventLogEntry[]>([])
  const [reviews, setReviews] = useState<Review[]>([])

  const refresh = useCallback(async ({ signal, silent = false }: { signal?: AbortSignal; silent?: boolean } = {}) => {
    if (signal?.aborted) return
    if (!silent) {
      setBusy(true)
      setError(null)
    }
    try {
      const [productsData, reviewsData, reservationsData, reservationEventsData] = await Promise.all([
        api<{
          perfumes: Perfume[]
          suggestions?: Suggestions
          sales?: SaleRecord[]
          orders?: ConfirmedOrderRecord[]
        }>("/api/admin/products", {
          signal
        }),
        api<{ reviews: Review[] }>("/api/admin/reviews", { signal }),
        api<{
          checkoutOrders?: CheckoutReservationRecord[]
          metrics?: ReservationMetrics | null
        }>("/api/admin/reservations", { signal }),
        api<{
          eventLog?: ReservationEventLogEntry[]
        }>("/api/admin/reservations/events", { signal })
      ])
      if (signal?.aborted) return
      setPerfumes(productsData.perfumes)
      setSuggestions(productsData.suggestions ?? null)
      setSales(Array.isArray(productsData.sales) ? productsData.sales : [])
      setOrders(Array.isArray(productsData.orders) ? productsData.orders : [])
      setCheckoutOrders(Array.isArray(reservationsData.checkoutOrders) ? reservationsData.checkoutOrders : [])
      setReservationMetrics(reservationsData.metrics ?? null)
      setReservationEventLog(Array.isArray(reservationEventsData.eventLog) ? reservationEventsData.eventLog : [])
      setReviews(Array.isArray(reviewsData.reviews) ? reviewsData.reviews : [])
    } catch (e) {
      if (signal?.aborted) return
      setError(e instanceof Error ? e.message : "Error")
    } finally {
      if (signal?.aborted) return
      if (!silent) {
        setBusy(false)
      }
    }
  }, [setBusy, setError])

  const reset = useCallback(() => {
    setPerfumes([])
    setSales([])
    setOrders([])
    setCheckoutOrders([])
    setReservationMetrics(null)
    setReservationEventLog([])
    setSuggestions(null)
    setReviews([])
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const raf = window.requestAnimationFrame(() => {
      if (controller.signal.aborted) return
      void refresh({ signal: controller.signal })
    })
    return () => {
      window.cancelAnimationFrame(raf)
      controller.abort()
    }
  }, [refresh])

  return { perfumes, suggestions, sales, orders, checkoutOrders, reservationMetrics, reservationEventLog, reviews, refresh, reset }
}
