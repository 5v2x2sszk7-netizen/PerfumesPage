"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Surface"
import { Input, Label, Select } from "@/components/ui/Field"
import { api } from "@/lib/admin/api"
import { formatMoney } from "@/lib/admin/utils"
import type {
  CheckoutReservationEvent,
  CheckoutReservationRecord,
  ConfirmedOrderRecord,
  ReservationEventLogEntry,
  ReservationMetrics
} from "@/lib/admin/types"
import { fulfillmentStatusCustomerLabel, orderStatusCustomerLabel } from "@/lib/orderPresentation"
import { resolveStoredOrderTotal } from "@/lib/shipping"
import { AdminPanel } from "@/features/admin/components/AdminPanel"

type Props = {
  orders: ConfirmedOrderRecord[]
  checkoutOrders: CheckoutReservationRecord[]
  reservationMetrics: ReservationMetrics | null
  reservationEventLog: ReservationEventLogEntry[]
  refresh: (options?: { signal?: AbortSignal; silent?: boolean }) => Promise<void>
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date)
}

function formatDateTimeCompact(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date)
}

function formatDateInput(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function csvCell(value: string | number) {
  const text = String(value)
  return `"${text.replaceAll('"', '""')}"`
}

function getFulfillmentMetricKey(value?: string) {
  if (!value?.trim()) return "fallback"
  const label = fulfillmentStatusCustomerLabel(value)
  if (label === "Preparando") return "preparing"
  if (label === "Enviado") return "shipped"
  if (label === "Entregado") return "delivered"
  return "fallback"
}

function getReservationExpiresAtMs(order: CheckoutReservationRecord) {
  const explicit = order.reservationExpiresAt ? new Date(order.reservationExpiresAt).getTime() : Number.NaN
  if (!Number.isNaN(explicit)) return explicit

  const createdAtMs = new Date(order.createdAt).getTime()
  if (Number.isNaN(createdAtMs)) return 0

  return createdAtMs + 15 * 60_000
}

function formatReservationRemaining(ms: number) {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60_000))
  if (totalMinutes <= 1) return "Menos de 1 min"
  if (totalMinutes < 60) return `${totalMinutes} min`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`
}

function formatReservationCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function reservationEventLabel(type: CheckoutReservationEvent["type"]) {
  if (type === "reservation_created") return "Reserva creada"
  if (type === "checkout_started") return "Checkout externo listo"
  if (type === "reservation_released") return "Reserva liberada"
  if (type === "payment_confirmed") return "Pago confirmado"
  if (type === "inventory_rejected") return "Incidencia de inventario"
  if (type === "critical_alert_sent") return "Aviso critico enviado"
  return "Logistica actualizada"
}

function reservationEventClasses(type: CheckoutReservationEvent["type"]) {
  if (type === "inventory_rejected") {
    return "bg-[rgba(140,40,20,0.08)] text-[rgb(140,40,20)] ring-[rgba(140,40,20,0.18)]"
  }
  if (type === "payment_confirmed") {
    return "bg-antiqueGold/14 text-antiqueGold ring-antiqueGold/25"
  }
  if (type === "critical_alert_sent") {
    return "bg-[rgba(33,88,57,0.08)] text-[rgb(33,88,57)] ring-[rgba(33,88,57,0.18)]"
  }
  if (type === "reservation_released") {
    return "bg-ink-950 text-white ring-ink-950/10"
  }
  return "bg-ink-50 text-ink-700 ring-black/8"
}

function sortReservationEvents(events?: CheckoutReservationEvent[]) {
  return [...(events ?? [])].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
}

function reservationEventCategory(type: CheckoutReservationEvent["type"]) {
  if (type === "inventory_rejected" || type === "critical_alert_sent") return "critical"
  if (type === "payment_confirmed") return "payment"
  return "operational"
}

function reservationStatusLabel(entry: Pick<ReservationEventLogEntry, "reservationStatus" | "isReservationActive">) {
  if (entry.reservationStatus === "pending") {
    return entry.isReservationActive ? "Pendiente activa" : "Pendiente expirada"
  }
  if (entry.reservationStatus === "completed") return "Completada"
  return "Inventory rejected"
}

function reservationContextActionLabel(entry: Pick<ReservationEventLogEntry, "reservationStatus">) {
  if (entry.reservationStatus === "pending") return "Ver reserva"
  if (entry.reservationStatus === "completed") return "Ver orden"
  return "Ver incidencia"
}

type ReservationEventPreset = "all" | "critical_watch" | "retry_followup" | "payments_today" | "inventory_incidents"

const RESERVATION_EVENT_PRESET_STORAGE_KEY = "admin:last-reservation-event-preset"

export function OrdersSection({ orders, checkoutOrders, reservationMetrics, reservationEventLog, refresh }: Props) {
  const itemsPerPage = 6
  const reservationEventsPerPage = 12
  const [query, setQuery] = useState("")
  const [provider, setProvider] = useState<"all" | "mercado_pago" | "paypal">("all")
  const [paymentStatus, setPaymentStatus] = useState("all")
  const [fulfillmentStatusFilter, setFulfillmentStatusFilter] = useState("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedOrderIds, setExpandedOrderIds] = useState<string[]>([])
  const [pendingOrderId, setPendingOrderId] = useState("")
  const [pendingReservationId, setPendingReservationId] = useState("")
  const [pendingBulkReservationAction, setPendingBulkReservationAction] = useState("")
  const [reservationFilter, setReservationFilter] = useState<"all" | "active" | "expired">("all")
  const [reservationProviderFilter, setReservationProviderFilter] = useState<"all" | "mercado_pago" | "paypal">("all")
  const [reservationSort, setReservationSort] = useState<"expires_asc" | "expires_desc">("expires_asc")
  const [reservationQuery, setReservationQuery] = useState("")
  const [reservationEventTypeFilter, setReservationEventTypeFilter] = useState<
    "all" | CheckoutReservationEvent["type"] | "critical" | "payment" | "operational"
  >("all")
  const [reservationEventProviderFilter, setReservationEventProviderFilter] = useState<"all" | "mercado_pago" | "paypal">("all")
  const [reservationEventStatusFilter, setReservationEventStatusFilter] = useState<
    "all" | ReservationEventLogEntry["reservationStatus"]
  >("all")
  const [reservationEventPreset, setReservationEventPreset] = useState<ReservationEventPreset>("all")
  const [reservationEventSortBy, setReservationEventSortBy] = useState<"date" | "provider" | "alerts">("date")
  const [reservationEventSort, setReservationEventSort] = useState<"newest" | "oldest">("newest")
  const [reservationEventFromDate, setReservationEventFromDate] = useState("")
  const [reservationEventToDate, setReservationEventToDate] = useState("")
  const [reservationEventQuery, setReservationEventQuery] = useState("")
  const [reservationEventsPage, setReservationEventsPage] = useState(1)
  const [reservationEventQuickFilter, setReservationEventQuickFilter] = useState<"all" | "with_retries" | "alerted_today" | "critical_open">("all")
  const [reservationAlertFilter, setReservationAlertFilter] = useState<"all" | "sent" | "pending">("all")
  const [copiedLogToken, setCopiedLogToken] = useState("")
  const [updateError, setUpdateError] = useState("")
  const [reservationNowMs, setReservationNowMs] = useState(() => Date.now())
  const [lastReservationSyncAt, setLastReservationSyncAt] = useState(() => new Date().toISOString())
  const [isAutoRefreshingReservations, setIsAutoRefreshingReservations] = useState(false)
  const paymentStatuses = useMemo(
    () => Array.from(new Set(orders.map((order) => order.paymentStatus.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "es")),
    [orders]
  )
  const fulfillmentStatuses = [
    { value: "", label: "Usar estado de pago" },
    { value: "preparing", label: "Preparando" },
    { value: "shipped", label: "Enviado" },
    { value: "delivered", label: "Entregado" }
  ]
  const fulfillmentStatusFilters = [
    { value: "all", label: "Todos" },
    { value: "fallback", label: "Sin estado logistico" },
    { value: "preparing", label: "Preparando" },
    { value: "shipped", label: "Enviado" },
    { value: "delivered", label: "Entregado" }
  ]

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const fromTime = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null
    const toTime = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : null

    return orders.filter((order) => {
      if (provider !== "all" && order.provider !== provider) return false
      if (paymentStatus !== "all" && order.paymentStatus !== paymentStatus) return false
      if (fulfillmentStatusFilter === "fallback" && order.fulfillmentStatus) return false
      if (
        fulfillmentStatusFilter !== "all" &&
        fulfillmentStatusFilter !== "fallback" &&
        (order.fulfillmentStatus || "") !== fulfillmentStatusFilter
      ) {
        return false
      }
      const completedAt = new Date(order.completedAt).getTime()
      if (fromTime != null && !Number.isNaN(completedAt) && completedAt < fromTime) return false
      if (toTime != null && !Number.isNaN(completedAt) && completedAt > toTime) return false
      if (!normalizedQuery) return true

      const haystack = [
        order.id,
        order.paymentReference,
        order.paymentStatus,
        order.fulfillmentStatus || "",
        order.customer.fullName,
        order.customer.email,
        order.customer.phone,
        order.customer.city,
        order.customer.state,
        ...order.items.map((item) => `${item.brand} ${item.name}`)
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(normalizedQuery)
    })
  }, [fromDate, fulfillmentStatusFilter, orders, paymentStatus, provider, query, toDate])

  const totalRevenue = filteredOrders.reduce((sum, order) => sum + resolveStoredOrderTotal(order), 0)
  const totalUnits = filteredOrders.reduce(
    (sum, order) => sum + order.items.reduce((itemsSum, item) => itemsSum + item.quantity, 0),
    0
  )
  const logisticsMetrics = useMemo(() => {
    return filteredOrders.reduce(
      (acc, order) => {
        const key = getFulfillmentMetricKey(order.fulfillmentStatus)
        acc[key] += 1
        return acc
      },
      { fallback: 0, preparing: 0, shipped: 0, delivered: 0 }
    )
  }, [filteredOrders])
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedOrders = useMemo(() => {
    const start = (safeCurrentPage - 1) * itemsPerPage
    return filteredOrders.slice(start, start + itemsPerPage)
  }, [filteredOrders, safeCurrentPage])
  const visibleRangeStart = filteredOrders.length ? (safeCurrentPage - 1) * itemsPerPage + 1 : 0
  const visibleRangeEnd = Math.min(safeCurrentPage * itemsPerPage, filteredOrders.length)
  const earliestDate = useMemo(() => {
    if (!orders.length) return ""
    return orders
      .map((order) => formatDateInput(order.completedAt))
      .filter(Boolean)
      .sort()[0] || ""
  }, [orders])
  const latestDate = useMemo(() => {
    if (!orders.length) return ""
    const dates = orders.map((order) => formatDateInput(order.completedAt)).filter(Boolean).sort()
    return dates[dates.length - 1] || ""
  }, [orders])
  const reservations = useMemo(() => {
    return checkoutOrders
      .filter((order) => order.status === "pending")
      .map((order) => {
        const expiresAtMs = getReservationExpiresAtMs(order)
        const remainingMs = Math.max(0, expiresAtMs - reservationNowMs)
        const reservedUnits = order.items.reduce((sum, item) => sum + item.quantity, 0)
        return {
          ...order,
          expiresAtMs,
          remainingMs,
          reservedUnits,
          isActive: expiresAtMs > reservationNowMs
        }
      })
  }, [checkoutOrders, reservationNowMs])
  const activeReservations = useMemo(() => reservations.filter((entry) => entry.isActive), [reservations])
  const expiredReservations = useMemo(() => reservations.filter((entry) => !entry.isActive), [reservations])
  const filteredReservations = useMemo(() => {
    const normalizedReservationQuery = reservationQuery.trim().toLowerCase()
    const next = reservations.filter((entry) => {
      if (reservationProviderFilter !== "all" && entry.provider !== reservationProviderFilter) return false
      if (reservationFilter === "active" && !entry.isActive) return false
      if (reservationFilter === "expired" && entry.isActive) return false
      const hasCriticalAlert = (entry.events ?? []).some((event) => event.type === "critical_alert_sent")
      const isCriticalWindow = entry.isActive && entry.remainingMs <= 5 * 60_000
      if (reservationAlertFilter === "sent" && (!isCriticalWindow || !hasCriticalAlert)) return false
      if (reservationAlertFilter === "pending" && (!isCriticalWindow || hasCriticalAlert)) return false
      if (!normalizedReservationQuery) return true

      const haystack = [
        entry.id,
        entry.customer.fullName,
        entry.customer.email,
        entry.customer.phone,
        entry.customer.city,
        entry.customer.state,
        entry.customer.postalCode,
        entry.provider === "paypal" ? "paypal" : "mercado pago",
        ...entry.items.map((item) => `${item.brand} ${item.name} ${item.sizeMl} ml`)
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(normalizedReservationQuery)
    })

    next.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
      if (reservationSort === "expires_desc") {
        return b.expiresAtMs - a.expiresAtMs
      }
      return a.expiresAtMs - b.expiresAtMs
    })

    return next
  }, [reservationAlertFilter, reservationFilter, reservationProviderFilter, reservationQuery, reservationSort, reservations])
  const reservedUnits = activeReservations.reduce((sum, entry) => sum + entry.reservedUnits, 0)
  const criticalReservationsPendingAlert = useMemo(() => {
    return activeReservations.filter((reservation) => {
      const isCriticalWindow = reservation.remainingMs <= 5 * 60_000
      const hasCriticalAlert = (reservation.events ?? []).some((event) => event.type === "critical_alert_sent")
      return isCriticalWindow && !hasCriticalAlert
    })
  }, [activeReservations])
  const releasableExpiredReservations = expiredReservations.filter((entry) => !entry.reservationReleasedAt)
  const rejectedReservationIncidents = useMemo(() => {
    return checkoutOrders
      .filter((order) => order.status === "inventory_rejected")
      .map((order) => {
        const events = sortReservationEvents(order.events)
        const incidentEvent = events.find((event) => event.type === "inventory_rejected")
        return {
          ...order,
          incidentAt: incidentEvent?.at || order.completedAt || order.createdAt,
          incidentDetail: incidentEvent?.detail || "Pago recibido sin stock disponible al confirmar.",
          history: events.slice(0, 4)
        }
      })
      .sort((a, b) => new Date(b.incidentAt).getTime() - new Date(a.incidentAt).getTime())
  }, [checkoutOrders])
  const reservationAlertStats = useMemo(() => {
    return new Map(
      checkoutOrders.map((order) => {
        const alertEvents = sortReservationEvents(order.events).filter((event) => event.type === "critical_alert_sent")
        return [
          order.id,
          {
            sentCount: alertEvents.length,
            retryCount: Math.max(0, alertEvents.length - 1),
            latestSentAt: alertEvents[0]?.at || ""
          }
        ]
      })
    )
  }, [checkoutOrders])
  const reservationAlertMetrics = useMemo(() => {
    let totalRetries = 0
    let reservationsWithMultipleAlerts = 0
    const today = new Date()
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

    for (const [, stats] of reservationAlertStats) {
      totalRetries += stats.retryCount
      if (stats.sentCount > 1) reservationsWithMultipleAlerts += 1
    }

    const reservationsAlertedToday = Array.from(reservationAlertStats.values()).filter((stats) => {
      if (!stats.latestSentAt) return false
      const sentAt = new Date(stats.latestSentAt)
      if (Number.isNaN(sentAt.getTime())) return false
      const sentKey = `${sentAt.getFullYear()}-${String(sentAt.getMonth() + 1).padStart(2, "0")}-${String(sentAt.getDate()).padStart(2, "0")}`
      return sentKey === todayKey
    }).length

    return {
      totalRetries,
      reservationsWithMultipleAlerts,
      reservationsAlertedToday
    }
  }, [reservationAlertStats])
  const reservationEventPresetSummary = useMemo(() => {
    const today = formatDateInput(new Date().toISOString())

    const criticalOpen = reservationEventLog.filter((entry) => {
      return reservationEventCategory(entry.event.type) === "critical" && entry.reservationStatus === "pending"
    }).length

    const retryFollowup = Array.from(reservationAlertStats.values()).filter((stats) => stats.retryCount > 0).length

    const paymentsToday = reservationEventLog.filter((entry) => {
      return entry.event.type === "payment_confirmed" && formatDateInput(entry.event.at) === today
    }).length

    const inventoryIncidents = reservationEventLog.filter((entry) => entry.event.type === "inventory_rejected").length

    return {
      criticalOpen,
      retryFollowup,
      paymentsToday,
      inventoryIncidents
    }
  }, [reservationAlertStats, reservationEventLog])
  const filteredReservationEventLog = useMemo(() => {
    const normalizedQuery = reservationEventQuery.trim().toLowerCase()
    const fromTime = reservationEventFromDate ? new Date(`${reservationEventFromDate}T00:00:00`).getTime() : null
    const toTime = reservationEventToDate ? new Date(`${reservationEventToDate}T23:59:59.999`).getTime() : null
    const today = new Date()
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

    const next = reservationEventLog.filter((entry) => {
      if (reservationEventProviderFilter !== "all" && entry.provider !== reservationEventProviderFilter) return false
      if (reservationEventStatusFilter !== "all" && entry.reservationStatus !== reservationEventStatusFilter) return false
      if (reservationEventTypeFilter === "critical") {
        if (entry.event.type !== "inventory_rejected" && entry.event.type !== "critical_alert_sent") return false
      } else if (reservationEventTypeFilter === "payment") {
        if (reservationEventCategory(entry.event.type) !== "payment") return false
      } else if (reservationEventTypeFilter === "operational") {
        if (reservationEventCategory(entry.event.type) !== "operational") return false
      } else if (reservationEventTypeFilter !== "all" && entry.event.type !== reservationEventTypeFilter) {
        return false
      }
      const eventAtMs = new Date(entry.event.at).getTime()
      if (fromTime != null && !Number.isNaN(eventAtMs) && eventAtMs < fromTime) return false
      if (toTime != null && !Number.isNaN(eventAtMs) && eventAtMs > toTime) return false
      const stats = reservationAlertStats.get(entry.reservationId)
      if (reservationEventQuickFilter === "with_retries" && (stats?.retryCount ?? 0) <= 0) return false
      if (reservationEventQuickFilter === "alerted_today") {
        if (!stats?.latestSentAt) return false
        const latestSentAt = new Date(stats.latestSentAt)
        if (Number.isNaN(latestSentAt.getTime())) return false
        const latestKey = `${latestSentAt.getFullYear()}-${String(latestSentAt.getMonth() + 1).padStart(2, "0")}-${String(latestSentAt.getDate()).padStart(2, "0")}`
        if (latestKey !== todayKey) return false
      }
      if (reservationEventQuickFilter === "critical_open") {
        if (reservationEventCategory(entry.event.type) !== "critical") return false
        if (entry.reservationStatus !== "pending") return false
      }

      if (!normalizedQuery) return true

      const haystack = [
        entry.reservationId,
        entry.customerName,
        entry.customerEmail,
        entry.provider === "paypal" ? "paypal" : "mercado pago",
        entry.event.type,
        entry.event.detail || "",
        entry.itemsSummary
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(normalizedQuery)
    })

    next.sort((a, b) => {
      const sortDirection = reservationEventSort === "oldest" ? 1 : -1

      if (reservationEventSortBy === "provider") {
        const providerCompare = a.provider.localeCompare(b.provider, "es")
        if (providerCompare !== 0) return providerCompare * sortDirection
      }

      if (reservationEventSortBy === "alerts") {
        const alertsA = reservationAlertStats.get(a.reservationId)?.sentCount ?? 0
        const alertsB = reservationAlertStats.get(b.reservationId)?.sentCount ?? 0
        if (alertsA !== alertsB) return (alertsA - alertsB) * sortDirection
      }

      const timeDelta = new Date(a.event.at).getTime() - new Date(b.event.at).getTime()
      return timeDelta * sortDirection
    })

    return next
  }, [
    reservationEventFromDate,
    reservationEventLog,
    reservationEventProviderFilter,
    reservationEventQuickFilter,
    reservationEventQuery,
    reservationEventStatusFilter,
    reservationEventSortBy,
    reservationEventSort,
    reservationEventToDate,
    reservationEventTypeFilter,
    reservationAlertStats
  ])
  const reservationEventsTotalPages = Math.max(1, Math.ceil(filteredReservationEventLog.length / reservationEventsPerPage))
  const safeReservationEventsPage = Math.min(reservationEventsPage, reservationEventsTotalPages)
  const paginatedReservationEventLog = useMemo(() => {
    const start = (safeReservationEventsPage - 1) * reservationEventsPerPage
    return filteredReservationEventLog.slice(start, start + reservationEventsPerPage)
  }, [filteredReservationEventLog, safeReservationEventsPage])
  const reservationEventProviderSummary = useMemo(() => {
    return filteredReservationEventLog.reduce(
      (acc, entry) => {
        const key = entry.provider
        acc[key].total += 1
        if (reservationEventCategory(entry.event.type) === "critical") acc[key].critical += 1
        return acc
      },
      {
        mercado_pago: { total: 0, critical: 0 },
        paypal: { total: 0, critical: 0 }
      }
    )
  }, [filteredReservationEventLog])
  const reservationEventStatusSummary = useMemo(() => {
    return filteredReservationEventLog.reduce(
      (acc, entry) => {
        acc[entry.reservationStatus] += 1
        return acc
      },
      {
        pending: 0,
        completed: 0,
        inventory_rejected: 0
      }
    )
  }, [filteredReservationEventLog])

  useEffect(() => {
    setReservationEventsPage(1)
  }, [
    reservationEventFromDate,
    reservationEventProviderFilter,
    reservationEventQuickFilter,
    reservationEventQuery,
    reservationEventStatusFilter,
    reservationEventSortBy,
    reservationEventSort,
    reservationEventToDate,
    reservationEventTypeFilter
  ])

  useEffect(() => {
    try {
      const storedPreset = window.sessionStorage.getItem(RESERVATION_EVENT_PRESET_STORAGE_KEY) as ReservationEventPreset | null
      if (storedPreset && storedPreset !== "all") {
        applyReservationEventPreset(storedPreset)
      }
    } catch {
    }
  }, [])

  useEffect(() => {
    try {
      window.sessionStorage.setItem(RESERVATION_EVENT_PRESET_STORAGE_KEY, reservationEventPreset)
    } catch {
    }
  }, [reservationEventPreset])

  useEffect(() => {
    if (!copiedLogToken) return
    const timer = window.setTimeout(() => {
      setCopiedLogToken("")
    }, 1800)
    return () => window.clearTimeout(timer)
  }, [copiedLogToken])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setReservationNowMs(Date.now())
    }, 1000)
    return () => {
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function silentRefreshReservations() {
      if (cancelled) return
      if (document.visibilityState !== "visible") return
      if (pendingReservationId || pendingBulkReservationAction || pendingOrderId) return

      setIsAutoRefreshingReservations(true)
      try {
        await refresh({ silent: true })
        if (!cancelled) {
          setLastReservationSyncAt(new Date().toISOString())
        }
      } catch {
      } finally {
        if (!cancelled) {
          setIsAutoRefreshingReservations(false)
        }
      }
    }

    const interval = window.setInterval(() => {
      void silentRefreshReservations()
    }, 60_000)

    const onFocus = () => {
      void silentRefreshReservations()
    }

    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onFocus)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onFocus)
    }
  }, [pendingBulkReservationAction, pendingOrderId, pendingReservationId, refresh])

  function resetFilters() {
    setQuery("")
    setProvider("all")
    setPaymentStatus("all")
    setFulfillmentStatusFilter("all")
    setFromDate("")
    setToDate("")
    setCurrentPage(1)
    setExpandedOrderIds([])
  }

  function toggleExpanded(orderId: string) {
    setExpandedOrderIds((current) =>
      current.includes(orderId) ? current.filter((entry) => entry !== orderId) : [...current, orderId]
    )
  }

  function applyLogisticsMetricFilter(nextFilter: string) {
    setFulfillmentStatusFilter((current) => (current === nextFilter ? "all" : nextFilter))
    setCurrentPage(1)
  }

  async function updateFulfillmentStatus(orderId: string, fulfillmentStatus: string) {
    setPendingOrderId(orderId)
    setUpdateError("")
    try {
      await api(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fulfillmentStatus })
      })
      await refresh()
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : "No se pudo actualizar el estado logistico.")
    } finally {
      setPendingOrderId("")
    }
  }

  async function releaseReservation(orderId: string) {
    setPendingReservationId(orderId)
    setUpdateError("")
    try {
      await api(`/api/admin/checkout-orders/${encodeURIComponent(orderId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "release_reservation" })
      })
      await refresh()
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : "No se pudo liberar la reserva.")
    } finally {
      setPendingReservationId("")
    }
  }

  async function releaseExpiredReservations() {
    setPendingBulkReservationAction("release_expired_reservations")
    setUpdateError("")
    try {
      await api("/api/admin/checkout-orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "release_expired_reservations" })
      })
      await refresh()
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : "No se pudieron liberar las reservas expiradas.")
    } finally {
      setPendingBulkReservationAction("")
    }
  }

  async function retryCriticalReservationAlert(orderId: string) {
    setPendingReservationId(orderId)
    setUpdateError("")
    try {
      await api("/api/admin/reservations/critical-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationIds: [orderId], force: true })
      })
      await refresh()
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : "No se pudo reenviar la alerta critica.")
    } finally {
      setPendingReservationId("")
    }
  }

  async function retryAllPendingCriticalReservationAlerts() {
    setPendingBulkReservationAction("retry_pending_critical_alerts")
    setUpdateError("")
    try {
      await api("/api/admin/reservations/critical-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationIds: criticalReservationsPendingAlert.map((reservation) => reservation.id),
          force: true
        })
      })
      await refresh()
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : "No se pudieron reenviar las alertas criticas pendientes.")
    } finally {
      setPendingBulkReservationAction("")
    }
  }

  function buildReservationsCsvFileName() {
    const parts = ["reservas-checkout"]
    if (reservationFilter !== "all") parts.push(reservationFilter === "active" ? "activas" : "expiradas")
    if (reservationProviderFilter !== "all") parts.push(reservationProviderFilter === "paypal" ? "paypal" : "mercado-pago")
    if (reservationQuery.trim()) parts.push("busqueda")
    parts.push(reservationSort === "expires_desc" ? "vence-despues" : "vence-primero")
    return `${parts.join("-")}.csv`
  }

  function exportReservationsCsv() {
    const header = [
      "reserva_id",
      "proveedor",
      "estado_reserva",
      "liberacion",
      "fecha_creacion",
      "fecha_vencimiento",
      "fecha_liberacion",
      "cliente",
      "correo",
      "telefono",
      "ciudad",
      "estado",
      "codigo_postal",
      "piezas",
      "productos"
    ]

    const rows = filteredReservations.map((reservation) => [
      reservation.id,
      reservation.provider === "paypal" ? "PayPal" : "Mercado Pago",
      reservation.isActive ? "Activa" : "Expirada",
      reservation.reservationReleaseReason === "manual" ? "Manual" : reservation.reservationReleaseReason === "expired_cleanup" ? "Limpieza" : "",
      reservation.createdAt,
      new Date(reservation.expiresAtMs).toISOString(),
      reservation.reservationReleasedAt || "",
      reservation.customer.fullName,
      reservation.customer.email,
      reservation.customer.phone,
      reservation.customer.city,
      reservation.customer.state,
      reservation.customer.postalCode,
      reservation.reservedUnits,
      reservation.items.map((item) => `${item.brand} ${item.name} ${item.sizeMl}ml x${item.quantity}`).join(" | ")
    ])

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => csvCell(cell)).join(","))
      .join("\n")

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = buildReservationsCsvFileName()
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.URL.revokeObjectURL(url)
  }

  function buildReservationEventsCsvFileName() {
    const parts = ["reservas-eventos"]
    if (reservationEventTypeFilter !== "all") parts.push(reservationEventTypeFilter)
    if (reservationEventProviderFilter !== "all") parts.push(reservationEventProviderFilter === "paypal" ? "paypal" : "mercado-pago")
    if (reservationEventStatusFilter !== "all") parts.push(reservationEventStatusFilter)
    if (reservationEventQuickFilter !== "all") {
      parts.push(
        reservationEventQuickFilter === "with_retries"
          ? "con-reenvios"
          : reservationEventQuickFilter === "alerted_today"
            ? "ultimo-aviso-hoy"
            : "criticos-sin-cerrar"
      )
    }
    if (reservationEventFromDate || reservationEventToDate) parts.push("rango")
    if (reservationEventQuery.trim()) parts.push("busqueda")
    parts.push(reservationEventSort === "oldest" ? "antiguos-primero" : "recientes-primero")
    return `${parts.join("-")}.csv`
  }

  function resetReservationEventFilters() {
    setReservationEventPreset("all")
    setReservationEventTypeFilter("all")
    setReservationEventProviderFilter("all")
    setReservationEventStatusFilter("all")
    setReservationEventSortBy("date")
    setReservationEventSort("newest")
    setReservationEventFromDate("")
    setReservationEventToDate("")
    setReservationEventQuery("")
    setReservationEventQuickFilter("all")
    setReservationEventsPage(1)
  }

  function exportReservationEventsCsv(scope: "filtered" | "visible") {
    const header = [
      "reserva_id",
      "fecha_evento",
      "tipo_evento",
      "categoria",
      "proveedor",
      "estado_reserva",
      "reserva_activa",
      "avisos_enviados",
      "reenvios",
      "ultimo_aviso",
      "cliente",
      "correo",
      "detalle",
      "productos"
    ]

    const source = scope === "visible" ? paginatedReservationEventLog : filteredReservationEventLog
    const rows = source.map((entry) => {
      const alertStats = reservationAlertStats.get(entry.reservationId)

      return [
      entry.reservationId,
      entry.event.at,
      entry.event.type,
      reservationEventCategory(entry.event.type),
      entry.provider === "paypal" ? "PayPal" : "Mercado Pago",
      entry.reservationStatus,
      entry.isReservationActive ? "Si" : "No",
      alertStats?.sentCount ?? 0,
      alertStats?.retryCount ?? 0,
      alertStats?.latestSentAt || "",
      entry.customerName,
      entry.customerEmail,
      entry.event.detail || "",
      entry.itemsSummary
      ]
    })

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => csvCell(cell)).join(","))
      .join("\n")

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${scope === "visible" ? "pagina-visible-" : ""}${buildReservationEventsCsvFileName()}`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.URL.revokeObjectURL(url)
  }

  async function copyLogValue(token: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedLogToken(token)
    } catch {
      setUpdateError("No se pudo copiar al portapapeles.")
    }
  }

  function scrollToElementById(elementId: string) {
    window.setTimeout(() => {
      document.getElementById(elementId)?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 140)
  }

  function focusReservationContext(entry: ReservationEventLogEntry) {
    if (entry.reservationStatus === "pending") {
      setReservationQuery(entry.reservationId)
      setReservationProviderFilter(entry.provider)
      setReservationFilter(entry.isReservationActive ? "active" : "expired")
      setReservationAlertFilter("all")
      scrollToElementById(`reservation-card-${entry.reservationId}`)
      return
    }

    if (entry.reservationStatus === "completed") {
      setQuery(entry.reservationId)
      setProvider(entry.provider)
      setPaymentStatus("all")
      setFulfillmentStatusFilter("all")
      setCurrentPage(1)
      scrollToElementById(`confirmed-order-${entry.reservationId}`)
      return
    }

    scrollToElementById(`reservation-incident-${entry.reservationId}`)
  }

  function applyReservationEventPreset(preset: Exclude<ReservationEventPreset, "all">) {
    const today = formatDateInput(new Date().toISOString())

    setReservationEventPreset(preset)
    setReservationEventProviderFilter("all")
    setReservationEventQuery("")
    setReservationEventSort("newest")
    setReservationEventSortBy("date")
    setReservationEventsPage(1)

    if (preset === "critical_watch") {
      setReservationEventTypeFilter("critical")
      setReservationEventStatusFilter("pending")
      setReservationEventQuickFilter("critical_open")
      setReservationEventFromDate("")
      setReservationEventToDate("")
      return
    }

    if (preset === "retry_followup") {
      setReservationEventTypeFilter("critical")
      setReservationEventStatusFilter("all")
      setReservationEventQuickFilter("with_retries")
      setReservationEventSortBy("alerts")
      setReservationEventFromDate("")
      setReservationEventToDate("")
      return
    }

    if (preset === "payments_today") {
      setReservationEventTypeFilter("payment_confirmed")
      setReservationEventStatusFilter("completed")
      setReservationEventQuickFilter("all")
      setReservationEventFromDate(today)
      setReservationEventToDate(today)
      return
    }

    setReservationEventTypeFilter("inventory_rejected")
    setReservationEventStatusFilter("inventory_rejected")
    setReservationEventQuickFilter("all")
    setReservationEventFromDate("")
    setReservationEventToDate("")
  }

  function toggleReservationEventTableSort(nextSortBy: "date" | "provider" | "alerts") {
    setReservationEventPreset("all")
    if (reservationEventSortBy === nextSortBy) {
      setReservationEventSort((current) => (current === "newest" ? "oldest" : "newest"))
      return
    }
    setReservationEventSortBy(nextSortBy)
    setReservationEventSort("newest")
  }

  function buildCsvFileName() {
    const parts = ["ordenes"]
    if (provider !== "all") parts.push(provider === "paypal" ? "paypal" : "mercado-pago")
    if (paymentStatus !== "all") parts.push(paymentStatus.toLowerCase().replace(/\s+/g, "-"))
    if (fulfillmentStatusFilter !== "all") {
      parts.push(fulfillmentStatusFilter === "fallback" ? "sin-estado-logistico" : fulfillmentStatusFilter)
    }
    if (fromDate && toDate && fromDate === toDate) {
      parts.push(fromDate)
    } else if (fromDate || toDate) {
      parts.push(fromDate || "inicio")
      parts.push(toDate || "hoy")
    } else if (latestDate) {
      parts.push("hasta")
      parts.push(latestDate)
    }
    return `${parts.join("-")}.csv`
  }

  function exportCsv() {
    const header = [
      "orden_id",
      "proveedor",
      "estado_pago",
      "estado_logistico",
      "referencia_pago",
      "fecha_confirmacion",
      "cliente",
      "correo",
      "telefono",
      "direccion",
      "ciudad",
      "estado",
      "codigo_postal",
      "subtotal",
      "envio",
      "total",
      "piezas",
      "productos"
    ]

    const rows = filteredOrders.map((order) => {
      const totalOrderUnits = order.items.reduce((sum, item) => sum + item.quantity, 0)
      const products = order.items.map((item) => `${item.brand} ${item.name} ${item.sizeMl}ml x${item.quantity}`).join(" | ")
      return [
        order.id,
        order.provider === "paypal" ? "PayPal" : "Mercado Pago",
        order.paymentStatus,
        order.fulfillmentStatus || "",
        order.paymentReference,
        order.completedAt,
        order.customer.fullName,
        order.customer.email,
        order.customer.phone,
        `${order.customer.addressLine1}${order.customer.addressLine2 ? `, ${order.customer.addressLine2}` : ""}`,
        order.customer.city,
        order.customer.state,
        order.customer.postalCode,
        order.subtotal,
        order.shippingAmount,
        resolveStoredOrderTotal(order),
        totalOrderUnits,
        products
      ]
    })

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => csvCell(cell)).join(","))
      .join("\n")

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = buildCsvFileName()
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.URL.revokeObjectURL(url)
  }

  return (
    <AdminPanel className="p-2 sm:p-3" innerClassName="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs tracking-section text-ink-500">ORDENES</p>
          <h2 className="font-display text-xl text-ink-950 sm:text-2xl">Pagos confirmados</h2>
          <p className="max-w-2xl text-sm leading-6 text-ink-600">
            Revisa ordenes pagadas, filtra por cliente o proveedor y exporta solo la informacion visible.
          </p>
        </div>
        <div className="min-w-[9rem] rounded-luxe-xl border border-black/8 bg-white/72 px-4 py-3 text-right shadow-[0_12px_30px_rgba(10,10,10,0.04)]">
          <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Vista actual</p>
          <p className="mt-1 font-display text-2xl text-ink-950">{filteredOrders.length}</p>
          <p className="mt-1 text-xs text-ink-500">orden(es)</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Card radius="lg" className="border-black/8 bg-white/78 p-6 shadow-[0_16px_36px_rgba(10,10,10,0.04)]">
          <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Ordenes visibles</p>
          <p className="mt-3 font-display text-2xl text-ink-950">{filteredOrders.length}</p>
          <p className="mt-2 text-xs text-ink-500">Resultado del filtro actual.</p>
        </Card>
        <Card radius="lg" className="border-black/8 bg-white/78 p-6 shadow-[0_16px_36px_rgba(10,10,10,0.04)]">
          <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Importe visible</p>
          <p className="mt-3 font-display text-2xl text-ink-950">{formatMoney(totalRevenue)}</p>
          <p className="mt-2 text-xs text-ink-500">Suma de las ordenes mostradas.</p>
        </Card>
        <Card radius="lg" className="border-transparent !bg-ink-950 p-6 shadow-[0_18px_42px_rgba(10,10,10,0.1)]">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/60">Piezas visibles</p>
          <p className="mt-3 font-display text-2xl text-antiqueGold">{totalUnits}</p>
          <p className="mt-2 text-xs text-white/65">Perfumes incluidos en esta vista.</p>
        </Card>
        <Card
          radius="lg"
          className={[
            "border-black/8 p-0 shadow-[0_16px_36px_rgba(10,10,10,0.04)] transition-all",
            fulfillmentStatusFilter === "preparing" ? "bg-ink-950 text-white shadow-[0_18px_42px_rgba(10,10,10,0.1)]" : "bg-white/78"
          ].join(" ")}
        >
          <button
            type="button"
            onClick={() => applyLogisticsMetricFilter("preparing")}
            className="block w-full p-6 text-left"
          >
            <p className={["text-[11px] uppercase tracking-[0.16em]", fulfillmentStatusFilter === "preparing" ? "text-white/60" : "text-ink-500"].join(" ")}>
              Preparando
            </p>
            <p className={["mt-3 font-display text-2xl", fulfillmentStatusFilter === "preparing" ? "text-antiqueGold" : "text-ink-950"].join(" ")}>
              {logisticsMetrics.preparing}
            </p>
            <p className={["mt-2 text-xs", fulfillmentStatusFilter === "preparing" ? "text-white/65" : "text-ink-500"].join(" ")}>
              Pedidos listos para surtido o empaque.
            </p>
          </button>
        </Card>
        <Card
          radius="lg"
          className={[
            "border-black/8 p-0 shadow-[0_16px_36px_rgba(10,10,10,0.04)] transition-all",
            fulfillmentStatusFilter === "shipped" ? "bg-ink-950 text-white shadow-[0_18px_42px_rgba(10,10,10,0.1)]" : "bg-white/78"
          ].join(" ")}
        >
          <button
            type="button"
            onClick={() => applyLogisticsMetricFilter("shipped")}
            className="block w-full p-6 text-left"
          >
            <p className={["text-[11px] uppercase tracking-[0.16em]", fulfillmentStatusFilter === "shipped" ? "text-white/60" : "text-ink-500"].join(" ")}>
              Enviado
            </p>
            <p className={["mt-3 font-display text-2xl", fulfillmentStatusFilter === "shipped" ? "text-antiqueGold" : "text-ink-950"].join(" ")}>
              {logisticsMetrics.shipped}
            </p>
            <p className={["mt-2 text-xs", fulfillmentStatusFilter === "shipped" ? "text-white/65" : "text-ink-500"].join(" ")}>
              Pedidos que ya salieron a ruta.
            </p>
          </button>
        </Card>
        <Card
          radius="lg"
          className={[
            "border-black/8 p-0 shadow-[0_16px_36px_rgba(10,10,10,0.04)] transition-all",
            fulfillmentStatusFilter === "delivered" ? "bg-ink-950 text-white shadow-[0_18px_42px_rgba(10,10,10,0.1)]" : "bg-white/78"
          ].join(" ")}
        >
          <button
            type="button"
            onClick={() => applyLogisticsMetricFilter("delivered")}
            className="block w-full p-6 text-left"
          >
            <p className={["text-[11px] uppercase tracking-[0.16em]", fulfillmentStatusFilter === "delivered" ? "text-white/60" : "text-ink-500"].join(" ")}>
              Entregado
            </p>
            <p className={["mt-3 font-display text-2xl", fulfillmentStatusFilter === "delivered" ? "text-antiqueGold" : "text-ink-950"].join(" ")}>
              {logisticsMetrics.delivered}
            </p>
            <p className={["mt-2 text-xs", fulfillmentStatusFilter === "delivered" ? "text-white/65" : "text-ink-500"].join(" ")}>
              Pedidos cerrados correctamente.
            </p>
          </button>
        </Card>
      </div>

      <div className="mt-8 space-y-4">
        {(reservationMetrics?.expiringSoon ?? 0) > 0 ? (
          <Card className="border-[rgba(140,40,20,0.18)] bg-[rgba(140,40,20,0.06)] p-5 shadow-[0_16px_36px_rgba(140,40,20,0.08)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-[rgb(140,40,20)]">Reservas Criticas</p>
                <p className="mt-1 text-sm font-medium leading-6 text-ink-950">
                  Hay {reservationMetrics?.expiringSoon ?? 0} reserva(s) activas dentro de la ventana critica de 5 minutos.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[rgb(140,40,20)] ring-1 ring-inset ring-[rgba(140,40,20,0.18)]">
                  Atencion inmediata
                </span>
                <span className="inline-flex rounded-full bg-ink-950 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white">
                  Prioriza liberar o confirmar
                </span>
              </div>
            </div>
          </Card>
        ) : null}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs tracking-section text-ink-500">RESERVAS TEMPORALES</p>
            <h3 className="font-display text-xl text-ink-950 sm:text-2xl">Checkout en espera de pago</h3>
            <p className="max-w-2xl text-sm leading-6 text-ink-600">
              Aqui ves apartados activos y vencidos que todavia viven en `checkout-orders` antes de convertirse en venta o quedar obsoletos.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[15rem]">
              <Label htmlFor="reservation-query">Buscar reserva</Label>
              <Input
                id="reservation-query"
                placeholder="Cliente, correo, telefono o perfume"
                value={reservationQuery}
                onChange={(event) => setReservationQuery(event.target.value)}
                className="mt-2"
              />
            </div>
            <div className="min-w-[12rem]">
              <Label htmlFor="reservation-filter">Ver reservas</Label>
              <Select
                id="reservation-filter"
                value={reservationFilter}
                onChange={(event) => setReservationFilter(event.target.value as "all" | "active" | "expired")}
                className="mt-2"
              >
                <option value="all">Todas</option>
                <option value="active">Solo activas</option>
                <option value="expired">Solo expiradas</option>
              </Select>
            </div>
            <div className="min-w-[12rem]">
              <Label htmlFor="reservation-provider-filter">Proveedor</Label>
              <Select
                id="reservation-provider-filter"
                value={reservationProviderFilter}
                onChange={(event) => setReservationProviderFilter(event.target.value as "all" | "mercado_pago" | "paypal")}
                className="mt-2"
              >
                <option value="all">Todos</option>
                <option value="mercado_pago">Mercado Pago</option>
                <option value="paypal">PayPal</option>
              </Select>
            </div>
            <div className="min-w-[12rem]">
              <Label htmlFor="reservation-alert-filter">Correo critico</Label>
              <Select
                id="reservation-alert-filter"
                value={reservationAlertFilter}
                onChange={(event) => setReservationAlertFilter(event.target.value as "all" | "sent" | "pending")}
                className="mt-2"
              >
                <option value="all">Todos</option>
                <option value="sent">Con correo enviado</option>
                <option value="pending">Sin correo</option>
              </Select>
            </div>
            <div className="min-w-[12rem]">
              <Label htmlFor="reservation-sort">Orden</Label>
              <Select
                id="reservation-sort"
                value={reservationSort}
                onChange={(event) => setReservationSort(event.target.value as "expires_asc" | "expires_desc")}
                className="mt-2"
              >
                <option value="expires_asc">Vence primero</option>
                <option value="expires_desc">Vence despues</option>
              </Select>
            </div>
            <div className="mt-6 flex flex-col items-end gap-2">
              <span className="inline-flex rounded-full bg-ink-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-600 ring-1 ring-inset ring-black/8">
                {isAutoRefreshingReservations
                  ? "Actualizando..."
                  : `Sync ${formatDateTimeCompact(lastReservationSyncAt)}`}
              </span>
              <p className="text-[11px] uppercase tracking-[0.14em] text-ink-500">Auto-refresh cada 60 s</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-6"
              onClick={() => void releaseExpiredReservations()}
              disabled={!releasableExpiredReservations.length || pendingBulkReservationAction === "release_expired_reservations"}
            >
              {pendingBulkReservationAction === "release_expired_reservations"
                ? "Liberando expiradas..."
                : `Liberar expiradas (${releasableExpiredReservations.length})`}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="mt-6"
              onClick={() => void retryAllPendingCriticalReservationAlerts()}
              disabled={!criticalReservationsPendingAlert.length || pendingBulkReservationAction === "retry_pending_critical_alerts"}
            >
              {pendingBulkReservationAction === "retry_pending_critical_alerts"
                ? "Enviando alertas..."
                : `Reenviar criticas pendientes (${criticalReservationsPendingAlert.length})`}
            </Button>
            <Button
              type="button"
              variant="gold"
              className="mt-6"
              onClick={exportReservationsCsv}
              disabled={!filteredReservations.length}
            >
              Exportar reservas
            </Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-black/8 bg-white/78 p-6 shadow-[0_16px_36px_rgba(10,10,10,0.04)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Activas</p>
            <p className="mt-3 font-display text-2xl text-ink-950">{reservationMetrics?.active ?? activeReservations.length}</p>
            <p className="mt-2 text-xs text-ink-500">Reservas aun vigentes para completar pago.</p>
          </Card>
          <Card className="border-black/8 bg-white/78 p-6 shadow-[0_16px_36px_rgba(10,10,10,0.04)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Expiradas</p>
            <p className="mt-3 font-display text-2xl text-ink-950">{reservationMetrics?.expiredPending ?? expiredReservations.length}</p>
            <p className="mt-2 text-xs text-ink-500">Pendientes ya vencidas que dejaron de bloquear stock vendible.</p>
          </Card>
          <Card className="border-transparent !bg-ink-950 p-6 shadow-[0_18px_42px_rgba(10,10,10,0.1)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/60">Piezas apartadas</p>
            <p className="mt-3 font-display text-2xl text-antiqueGold">{reservedUnits}</p>
            <p className="mt-2 text-xs text-white/65">Suma de unidades dentro de reservas activas.</p>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-black/8 bg-white/78 p-6 shadow-[0_16px_36px_rgba(10,10,10,0.04)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Conversion</p>
            <p className="mt-3 font-display text-2xl text-ink-950">{reservationMetrics?.conversionRate ?? 0}%</p>
            <p className="mt-2 text-xs text-ink-500">
              {reservationMetrics?.completed ?? 0} de {reservationMetrics?.total ?? checkoutOrders.length} reservas terminaron en pago.
            </p>
          </Card>
          <Card className="border-black/8 bg-white/78 p-6 shadow-[0_16px_36px_rgba(10,10,10,0.04)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Expiracion</p>
            <p className="mt-3 font-display text-2xl text-ink-950">{reservationMetrics?.expirationRate ?? 0}%</p>
            <p className="mt-2 text-xs text-ink-500">
              {reservationMetrics?.expiredPending ?? 0} reservas quedaron pendientes fuera de ventana.
            </p>
          </Card>
          <Card className="border-black/8 bg-white/78 p-6 shadow-[0_16px_36px_rgba(10,10,10,0.04)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Incidencia</p>
            <p className="mt-3 font-display text-2xl text-ink-950">{reservationMetrics?.rejectionRate ?? 0}%</p>
            <p className="mt-2 text-xs text-ink-500">
              {reservationMetrics?.inventoryRejected ?? 0} reservas pagadas cerraron en `inventory_rejected`.
            </p>
          </Card>
          <Card className="border-transparent !bg-ink-950 p-6 shadow-[0_18px_42px_rgba(10,10,10,0.1)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/60">Por vencer</p>
            <p className="mt-3 font-display text-2xl text-antiqueGold">{reservationMetrics?.expiringSoon ?? 0}</p>
            <p className="mt-2 text-xs text-white/65">
              Reservas activas con menos de 5 minutos antes de expirar.
            </p>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-black/8 bg-white/78 p-6 shadow-[0_16px_36px_rgba(10,10,10,0.04)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Alertas enviadas</p>
            <p className="mt-3 font-display text-2xl text-ink-950">{reservationMetrics?.criticalAlertSent ?? 0}</p>
            <p className="mt-2 text-xs text-ink-500">Reservas criticas con aviso interno ya registrado.</p>
          </Card>
          <Card className="border-black/8 bg-white/78 p-6 shadow-[0_16px_36px_rgba(10,10,10,0.04)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Alertas pendientes</p>
            <p className="mt-3 font-display text-2xl text-ink-950">{reservationMetrics?.criticalAlertPending ?? 0}</p>
            <p className="mt-2 text-xs text-ink-500">Reservas en zona critica que todavia no tienen correo interno.</p>
          </Card>
          <Card className="border-black/8 bg-white/78 p-6 shadow-[0_16px_36px_rgba(10,10,10,0.04)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Liberadas manualmente</p>
            <p className="mt-3 font-display text-2xl text-ink-950">{reservationMetrics?.manuallyReleased ?? 0}</p>
            <p className="mt-2 text-xs text-ink-500">Intervenciones operativas directas desde admin.</p>
          </Card>
          <Card className="border-black/8 bg-white/78 p-6 shadow-[0_16px_36px_rgba(10,10,10,0.04)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Liberadas en limpieza</p>
            <p className="mt-3 font-display text-2xl text-ink-950">{reservationMetrics?.cleanupReleased ?? 0}</p>
            <p className="mt-2 text-xs text-ink-500">Reservas expiradas marcadas por limpieza operativa.</p>
          </Card>
          <Card className="border-black/8 bg-white/78 p-6 shadow-[0_16px_36px_rgba(10,10,10,0.04)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Pagadas</p>
            <p className="mt-3 font-display text-2xl text-ink-950">{reservationMetrics?.completed ?? 0}</p>
            <p className="mt-2 text-xs text-ink-500">Reservas que si llegaron a confirmarse.</p>
          </Card>
          <Card className="border-black/8 bg-white/78 p-6 shadow-[0_16px_36px_rgba(10,10,10,0.04)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Total historico</p>
            <p className="mt-3 font-display text-2xl text-ink-950">{reservationMetrics?.total ?? checkoutOrders.length}</p>
            <p className="mt-2 text-xs text-ink-500">Base total usada para tasas de reserva y conversion.</p>
          </Card>
          <Card className="border-black/8 bg-white/78 p-6 shadow-[0_16px_36px_rgba(10,10,10,0.04)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Reenvios totales</p>
            <p className="mt-3 font-display text-2xl text-ink-950">{reservationAlertMetrics.totalRetries}</p>
            <p className="mt-2 text-xs text-ink-500">Cantidad acumulada de alertas criticas reenviadas manualmente.</p>
          </Card>
          <Card className="border-black/8 bg-white/78 p-6 shadow-[0_16px_36px_rgba(10,10,10,0.04)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Multiples avisos</p>
            <p className="mt-3 font-display text-2xl text-ink-950">{reservationAlertMetrics.reservationsWithMultipleAlerts}</p>
            <p className="mt-2 text-xs text-ink-500">Reservas que ya necesitaron mas de un aviso interno.</p>
          </Card>
        </div>
        {rejectedReservationIncidents.length ? (
          <Card className="border-[rgba(140,40,20,0.18)] bg-[rgba(140,40,20,0.04)] p-6 shadow-[0_18px_42px_rgba(10,10,10,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs tracking-section text-[rgb(140,40,20)]">BITACORA DE INCIDENCIAS</p>
                <p className="mt-1 text-sm text-ink-700">
                  Reservas que si recibieron pago pero terminaron bloqueadas por falta de stock al confirmar.
                </p>
              </div>
              <span className="inline-flex rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[rgb(140,40,20)] ring-1 ring-inset ring-[rgba(140,40,20,0.18)]">
                {rejectedReservationIncidents.length} incidencia(s)
              </span>
            </div>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {rejectedReservationIncidents.slice(0, 6).map((incident) => (
                <div id={`reservation-incident-${incident.id}`} key={incident.id} className="rounded-luxe-xl border border-[rgba(140,40,20,0.14)] bg-white/88 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-lg text-ink-950">{incident.customer.fullName}</p>
                    <span className="inline-flex rounded-full bg-[rgba(140,40,20,0.08)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[rgb(140,40,20)] ring-1 ring-inset ring-[rgba(140,40,20,0.18)]">
                      Inventory rejected
                    </span>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-ink-500">
                    Reserva {incident.id} · {formatDateTime(incident.incidentAt)}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-ink-700">{incident.incidentDetail}</p>
                  <p className="mt-3 text-sm leading-6 text-ink-600">
                    {incident.customer.email} · {incident.customer.phone}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink-600">
                    {incident.items.map((item) => `${item.brand} ${item.name} ${item.sizeMl} ml x${item.quantity}`).join(" | ")}
                  </p>
                  {incident.history.length ? (
                    <div className="mt-4 space-y-2 border-t border-black/8 pt-4">
                      {incident.history.map((event) => (
                        <div key={`${incident.id}-${event.type}-${event.at}`} className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ring-1 ring-inset ${reservationEventClasses(event.type)}`}
                            >
                              {reservationEventLabel(event.type)}
                            </span>
                            {event.detail ? <p className="mt-2 text-sm leading-6 text-ink-700">{event.detail}</p> : null}
                          </div>
                          <p className="shrink-0 text-xs text-ink-500">{formatDateTimeCompact(event.at)}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        ) : null}
        <Card className="border-black/8 bg-white/78 p-6 shadow-[0_18px_42px_rgba(10,10,10,0.04)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs tracking-section text-ink-500">LOG DE EVENTOS</p>
              <p className="mt-1 text-sm text-ink-700">
                Vista dedicada del historial operativo de reservas, alertas y confirmaciones.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[14rem]">
                <Label htmlFor="reservation-event-query">Buscar evento</Label>
                <Input
                  id="reservation-event-query"
                  placeholder="Reserva, cliente o detalle"
                  value={reservationEventQuery}
                  onChange={(event) => {
                    setReservationEventPreset("all")
                    setReservationEventQuery(event.target.value)
                  }}
                  className="mt-2"
                />
              </div>
              <div className="min-w-[12rem]">
                <Label htmlFor="reservation-event-quick-filter">Quick filter</Label>
                <Select
                  id="reservation-event-quick-filter"
                  value={reservationEventQuickFilter}
                  onChange={(event) => {
                    setReservationEventPreset("all")
                    setReservationEventQuickFilter(event.target.value as "all" | "with_retries" | "alerted_today" | "critical_open")
                  }}
                  className="mt-2"
                >
                  <option value="all">Todos</option>
                  <option value="with_retries">Solo con reenvios</option>
                  <option value="alerted_today">Ultimo aviso hoy</option>
                  <option value="critical_open">Criticos sin cerrar</option>
                </Select>
              </div>
              <div className="min-w-[12rem]">
                <Label htmlFor="reservation-event-type-filter">Tipo</Label>
                <Select
                  id="reservation-event-type-filter"
                  value={reservationEventTypeFilter}
                  onChange={(event) => {
                    setReservationEventPreset("all")
                    setReservationEventTypeFilter(
                      event.target.value as "all" | CheckoutReservationEvent["type"] | "critical" | "payment" | "operational"
                    )
                  }}
                  className="mt-2"
                >
                  <option value="all">Todos</option>
                  <option value="critical">Solo criticos</option>
                  <option value="payment">Pagos</option>
                  <option value="operational">Operativos</option>
                  <option value="reservation_created">Reserva creada</option>
                  <option value="checkout_started">Checkout listo</option>
                  <option value="critical_alert_sent">Aviso critico enviado</option>
                  <option value="payment_confirmed">Pago confirmado</option>
                  <option value="inventory_rejected">Inventory rejected</option>
                  <option value="reservation_released">Reserva liberada</option>
                  <option value="fulfillment_updated">Logistica actualizada</option>
                </Select>
              </div>
              <div className="min-w-[12rem]">
                <Label htmlFor="reservation-event-provider-filter">Proveedor</Label>
                <Select
                  id="reservation-event-provider-filter"
                  value={reservationEventProviderFilter}
                  onChange={(event) => {
                    setReservationEventPreset("all")
                    setReservationEventProviderFilter(event.target.value as "all" | "mercado_pago" | "paypal")
                    setReservationEventsPage(1)
                  }}
                  className="mt-2"
                >
                  <option value="all">Todos</option>
                  <option value="mercado_pago">Mercado Pago</option>
                  <option value="paypal">PayPal</option>
                </Select>
              </div>
              <div className="min-w-[12rem]">
                <Label htmlFor="reservation-event-status-filter">Estado reserva</Label>
                <Select
                  id="reservation-event-status-filter"
                  value={reservationEventStatusFilter}
                  onChange={(event) => {
                    setReservationEventPreset("all")
                    setReservationEventStatusFilter(
                      event.target.value as "all" | ReservationEventLogEntry["reservationStatus"]
                    )
                    setReservationEventsPage(1)
                  }}
                  className="mt-2"
                >
                  <option value="all">Todos</option>
                  <option value="pending">Pendiente</option>
                  <option value="completed">Completada</option>
                  <option value="inventory_rejected">Inventory rejected</option>
                </Select>
              </div>
              <div className="min-w-[12rem]">
                <Label htmlFor="reservation-event-sort">Orden</Label>
                <Select
                  id="reservation-event-sort"
                  value={reservationEventSort}
                  onChange={(event) => {
                    setReservationEventPreset("all")
                    setReservationEventSort(event.target.value as "newest" | "oldest")
                  }}
                  className="mt-2"
                >
                  <option value="newest">Recientes primero</option>
                  <option value="oldest">Antiguos primero</option>
                </Select>
              </div>
              <div className="min-w-[10rem]">
                <Label htmlFor="reservation-event-from-date">Desde</Label>
                <Input
                  id="reservation-event-from-date"
                  type="date"
                  value={reservationEventFromDate}
                  onChange={(event) => {
                    setReservationEventPreset("all")
                    setReservationEventFromDate(event.target.value)
                  }}
                  className="mt-2"
                />
              </div>
              <div className="min-w-[10rem]">
                <Label htmlFor="reservation-event-to-date">Hasta</Label>
                <Input
                  id="reservation-event-to-date"
                  type="date"
                  value={reservationEventToDate}
                  onChange={(event) => {
                    setReservationEventPreset("all")
                    setReservationEventToDate(event.target.value)
                  }}
                  className="mt-2"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-6"
                onClick={() => exportReservationEventsCsv("visible")}
                disabled={!paginatedReservationEventLog.length}
              >
                Exportar pagina
              </Button>
              <Button
                type="button"
                variant="outline"
                className="mt-6"
                onClick={() => exportReservationEventsCsv("filtered")}
                disabled={!filteredReservationEventLog.length}
              >
                Exportar filtro
              </Button>
              <Button type="button" variant="ghost" className="mt-6" onClick={resetReservationEventFilters}>
                Limpiar filtros
              </Button>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              onClick={() => applyReservationEventPreset("critical_watch")}
              className={[
                "rounded-luxe-lg border px-4 py-4 text-left transition-all",
                reservationEventPreset === "critical_watch"
                  ? "border-antiqueGold/35 bg-antiqueGold/12 shadow-[0_16px_36px_rgba(10,10,10,0.05)]"
                  : "border-black/8 bg-white/90 hover:border-antiqueGold/20 hover:bg-antiqueGold/6"
              ].join(" ")}
            >
              <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Criticos abiertos</p>
              <p className="mt-2 font-display text-2xl text-ink-950">{reservationEventPresetSummary.criticalOpen}</p>
              <p className="mt-2 text-xs leading-5 text-ink-600">Eventos criticos sobre reservas que siguen pendientes.</p>
            </button>
            <button
              type="button"
              onClick={() => applyReservationEventPreset("retry_followup")}
              className={[
                "rounded-luxe-lg border px-4 py-4 text-left transition-all",
                reservationEventPreset === "retry_followup"
                  ? "border-antiqueGold/35 bg-antiqueGold/12 shadow-[0_16px_36px_rgba(10,10,10,0.05)]"
                  : "border-black/8 bg-white/90 hover:border-antiqueGold/20 hover:bg-antiqueGold/6"
              ].join(" ")}
            >
              <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Reenvios a revisar</p>
              <p className="mt-2 font-display text-2xl text-ink-950">{reservationEventPresetSummary.retryFollowup}</p>
              <p className="mt-2 text-xs leading-5 text-ink-600">Reservas que ya necesitaron al menos un reenvio interno.</p>
            </button>
            <button
              type="button"
              onClick={() => applyReservationEventPreset("payments_today")}
              className={[
                "rounded-luxe-lg border px-4 py-4 text-left transition-all",
                reservationEventPreset === "payments_today"
                  ? "border-antiqueGold/35 bg-antiqueGold/12 shadow-[0_16px_36px_rgba(10,10,10,0.05)]"
                  : "border-black/8 bg-white/90 hover:border-antiqueGold/20 hover:bg-antiqueGold/6"
              ].join(" ")}
            >
              <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Pagos de hoy</p>
              <p className="mt-2 font-display text-2xl text-ink-950">{reservationEventPresetSummary.paymentsToday}</p>
              <p className="mt-2 text-xs leading-5 text-ink-600">Confirmaciones registradas hoy para seguimiento operativo.</p>
            </button>
            <button
              type="button"
              onClick={() => applyReservationEventPreset("inventory_incidents")}
              className={[
                "rounded-luxe-lg border px-4 py-4 text-left transition-all",
                reservationEventPreset === "inventory_incidents"
                  ? "border-antiqueGold/35 bg-antiqueGold/12 shadow-[0_16px_36px_rgba(10,10,10,0.05)]"
                  : "border-black/8 bg-white/90 hover:border-antiqueGold/20 hover:bg-antiqueGold/6"
              ].join(" ")}
            >
              <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Incidencias stock</p>
              <p className="mt-2 font-display text-2xl text-ink-950">{reservationEventPresetSummary.inventoryIncidents}</p>
              <p className="mt-2 text-xs leading-5 text-ink-600">Casos cerrados como `inventory_rejected` dentro del historial.</p>
            </button>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-full bg-ink-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-600 ring-1 ring-inset ring-black/8">
              {filteredReservationEventLog.length} evento(s)
            </span>
            {reservationEventPreset !== "all" ? (
              <span className="inline-flex rounded-full bg-antiqueGold/12 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-antiqueGold ring-1 ring-inset ring-antiqueGold/25">
                Preset activo {reservationEventPreset === "critical_watch"
                  ? "Criticos abiertos"
                  : reservationEventPreset === "retry_followup"
                    ? "Reenvios a revisar"
                    : reservationEventPreset === "payments_today"
                      ? "Pagos de hoy"
                      : "Incidencias stock"}
              </span>
            ) : null}
            <span className="inline-flex rounded-full bg-ink-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-600 ring-1 ring-inset ring-black/8">
              Reenvios totales {reservationAlertMetrics.totalRetries}
            </span>
            <span className="inline-flex rounded-full bg-ink-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-600 ring-1 ring-inset ring-black/8">
              Multiples avisos {reservationAlertMetrics.reservationsWithMultipleAlerts}
            </span>
            <span className="inline-flex rounded-full bg-ink-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-600 ring-1 ring-inset ring-black/8">
              Ultimo aviso hoy {reservationAlertMetrics.reservationsAlertedToday}
            </span>
            <span className="inline-flex rounded-full bg-ink-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-600 ring-1 ring-inset ring-black/8">
              Pendientes {reservationEventStatusSummary.pending}
            </span>
            <span className="inline-flex rounded-full bg-ink-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-600 ring-1 ring-inset ring-black/8">
              Completadas {reservationEventStatusSummary.completed}
            </span>
            <span className="inline-flex rounded-full bg-ink-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-600 ring-1 ring-inset ring-black/8">
              Rechazadas {reservationEventStatusSummary.inventory_rejected}
            </span>
            <span className="inline-flex rounded-full bg-ink-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-600 ring-1 ring-inset ring-black/8">
              MP {reservationEventProviderSummary.mercado_pago.total} · Criticos {reservationEventProviderSummary.mercado_pago.critical}
            </span>
            <span className="inline-flex rounded-full bg-ink-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-600 ring-1 ring-inset ring-black/8">
              PayPal {reservationEventProviderSummary.paypal.total} · Criticos {reservationEventProviderSummary.paypal.critical}
            </span>
            <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-500 ring-1 ring-inset ring-black/8">
              Endpoint dedicado `/api/admin/reservations/events`
            </span>
          </div>
          {!filteredReservationEventLog.length ? (
            <div className="mt-5 rounded-luxe-xl border border-black/8 bg-ink-50/45 p-6 text-sm text-ink-600">
              No hay eventos para los filtros actuales.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <div className="hidden lg:block overflow-hidden rounded-luxe-xl border border-black/8 bg-white/88">
                <div className="grid grid-cols-[1.1fr_1.4fr_1fr_1.1fr_0.8fr_2fr] gap-3 border-b border-black/8 bg-ink-50/70 px-4 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-500">
                  <button type="button" className="text-left" onClick={() => toggleReservationEventTableSort("date")}>
                    Fecha {reservationEventSortBy === "date" ? (reservationEventSort === "newest" ? "↓" : "↑") : ""}
                  </button>
                  <span>Reserva / Cliente</span>
                  <span>Categoria</span>
                  <button type="button" className="text-left" onClick={() => toggleReservationEventTableSort("provider")}>
                    Proveedor {reservationEventSortBy === "provider" ? (reservationEventSort === "newest" ? "↓" : "↑") : ""}
                  </button>
                  <button type="button" className="text-left" onClick={() => toggleReservationEventTableSort("alerts")}>
                    Avisos {reservationEventSortBy === "alerts" ? (reservationEventSort === "newest" ? "↓" : "↑") : ""}
                  </button>
                  <span>Detalle</span>
                </div>
                {paginatedReservationEventLog.map((entry) => (
                  <div
                    key={`${entry.reservationId}-${entry.event.type}-${entry.event.at}-table`}
                    className="grid grid-cols-[1.1fr_1.4fr_1fr_1.1fr_0.8fr_2fr] gap-3 border-b border-black/8 px-4 py-3 text-sm text-ink-700 last:border-b-0"
                  >
                    <div>
                      <p className="text-sm text-ink-950">{formatDateTimeCompact(entry.event.at)}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ink-500">{reservationEventLabel(entry.event.type)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-ink-950">{entry.customerName}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ink-500">Reserva {entry.reservationId}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex rounded-full bg-ink-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-600 ring-1 ring-inset ring-black/8">
                          {reservationStatusLabel(entry)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-auto px-0 py-0 text-[11px] uppercase tracking-[0.14em] text-ink-500"
                          onClick={() => void copyLogValue(`id:${entry.reservationId}`, entry.reservationId)}
                        >
                          {copiedLogToken === `id:${entry.reservationId}` ? "ID copiado" : "Copiar ID"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-auto px-0 py-0 text-[11px] uppercase tracking-[0.14em] text-ink-500"
                          onClick={() => void copyLogValue(`email:${entry.reservationId}`, entry.customerEmail)}
                        >
                          {copiedLogToken === `email:${entry.reservationId}` ? "Correo copiado" : "Copiar correo"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-auto px-0 py-0 text-[11px] uppercase tracking-[0.14em] text-ink-500"
                          onClick={() => focusReservationContext(entry)}
                        >
                          {reservationContextActionLabel(entry)}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ring-1 ring-inset ${reservationEventClasses(entry.event.type)}`}
                      >
                        {reservationEventCategory(entry.event.type) === "critical"
                          ? "Criticos"
                          : reservationEventCategory(entry.event.type) === "payment"
                            ? "Pagos"
                            : "Operativos"}
                      </span>
                    </div>
                    <div className="text-sm text-ink-600">{entry.provider === "paypal" ? "PayPal" : "Mercado Pago"}</div>
                    <div className="text-sm text-ink-600">
                      <p>{reservationAlertStats.get(entry.reservationId)?.sentCount ?? 0} envios</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ink-500">
                        {reservationAlertStats.get(entry.reservationId)?.retryCount ?? 0} reenvios
                      </p>
                    </div>
                    <div>
                      <p className="line-clamp-2 text-sm leading-6 text-ink-700">{entry.event.detail || entry.itemsSummary}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-3 lg:hidden">
                {paginatedReservationEventLog.map((entry) => (
                  <div key={`${entry.reservationId}-${entry.event.type}-${entry.event.at}`} className="rounded-luxe-xl border border-black/8 bg-white/88 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ring-1 ring-inset ${reservationEventClasses(entry.event.type)}`}
                        >
                          {reservationEventLabel(entry.event.type)}
                        </span>
                        <span className="text-xs uppercase tracking-[0.14em] text-ink-500">
                          Reserva {entry.reservationId} · {entry.provider === "paypal" ? "PayPal" : "Mercado Pago"}
                        </span>
                      </div>
                      <p className="text-xs text-ink-500">{formatDateTime(entry.event.at)}</p>
                    </div>
                    <p className="mt-3 text-sm font-medium text-ink-950">{entry.customerName}</p>
                    <p className="mt-1 text-sm text-ink-600">{entry.customerEmail}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-ink-500">
                      Estado · {reservationStatusLabel(entry)}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-ink-500">
                      {reservationEventCategory(entry.event.type) === "critical"
                        ? "Categoria · Criticos"
                        : reservationEventCategory(entry.event.type) === "payment"
                          ? "Categoria · Pagos"
                          : "Categoria · Operativos"}
                    </p>
                    {(reservationAlertStats.get(entry.reservationId)?.sentCount ?? 0) > 0 ? (
                      <p className="mt-2 text-xs uppercase tracking-[0.14em] text-ink-500">
                        Avisos enviados · {reservationAlertStats.get(entry.reservationId)?.sentCount ?? 0}
                        {(reservationAlertStats.get(entry.reservationId)?.retryCount ?? 0) > 0
                          ? ` · Reenvios ${reservationAlertStats.get(entry.reservationId)?.retryCount ?? 0}`
                          : ""}
                        {reservationAlertStats.get(entry.reservationId)?.latestSentAt
                          ? ` · Ultimo ${formatDateTimeCompact(reservationAlertStats.get(entry.reservationId)?.latestSentAt || "")}`
                          : ""}
                      </p>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-3 h-auto px-0 py-0 text-[11px] uppercase tracking-[0.14em] text-ink-500"
                      onClick={() => focusReservationContext(entry)}
                    >
                      {reservationContextActionLabel(entry)}
                    </Button>
                    {entry.event.detail ? <p className="mt-3 text-sm leading-6 text-ink-700">{entry.event.detail}</p> : null}
                    <p className="mt-2 text-sm leading-6 text-ink-600">{entry.itemsSummary}</p>
                  </div>
                ))}
              </div>
              {reservationEventsTotalPages > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-luxe-xl border border-black/8 bg-ink-50/45 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-ink-500">
                    Pagina {safeReservationEventsPage} de {reservationEventsTotalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="px-3 py-2 text-sm"
                      onClick={() => setReservationEventsPage((current) => Math.max(1, current - 1))}
                      disabled={safeReservationEventsPage <= 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="px-3 py-2 text-sm"
                      onClick={() => setReservationEventsPage((current) => Math.min(reservationEventsTotalPages, current + 1))}
                      disabled={safeReservationEventsPage >= reservationEventsTotalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </Card>
        {!filteredReservations.length ? (
          <Card className="border-black/8 bg-white/78 p-8 text-center shadow-[0_16px_36px_rgba(10,10,10,0.04)]">
            <p className="text-xs tracking-section text-ink-500">SIN RESERVAS</p>
            <p className="mt-2 font-display text-2xl text-ink-950">
              {reservationFilter === "all"
                ? "No hay apartados pendientes ahora mismo"
                : reservationFilter === "active"
                  ? "No hay reservas activas en este momento"
                  : "No hay reservas expiradas en esta vista"}
            </p>
            <p className="mt-2 text-sm text-ink-600">
              {reservationFilter === "all"
                ? "Cuando un cliente inicie checkout, la reserva temporal aparecera aqui."
                : "Prueba cambiando el estado, proveedor u orden para revisar otras reservas."}
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredReservations.map((reservation) => (
              <Card
                id={`reservation-card-${reservation.id}`}
                key={reservation.id}
                className="border-black/8 bg-white/78 p-6 shadow-[0_18px_42px_rgba(10,10,10,0.04)]"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">
                      Reserva {reservation.id} · creada {formatDateTime(reservation.createdAt)}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-xl text-ink-950">{reservation.customer.fullName}</p>
                      <span className="inline-flex rounded-full bg-ink-950 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white">
                        {reservation.provider === "paypal" ? "PayPal" : "Mercado Pago"}
                      </span>
                      <span
                        className={[
                          "inline-flex rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ring-1 ring-inset",
                          reservation.isActive
                            ? reservation.remainingMs <= 5 * 60_000
                              ? "bg-[rgba(140,40,20,0.08)] text-[rgb(140,40,20)] ring-[rgba(140,40,20,0.18)]"
                              : "bg-antiqueGold/14 text-antiqueGold ring-antiqueGold/25"
                            : "bg-ink-50 text-ink-700 ring-black/8"
                        ].join(" ")}
                      >
                        {reservation.isActive ? (reservation.remainingMs <= 5 * 60_000 ? "Por vencer" : "Activa") : "Expirada"}
                      </span>
                      {reservation.isActive && reservation.remainingMs <= 5 * 60_000 ? (
                        <span
                          className={[
                            "inline-flex rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ring-1 ring-inset",
                            (reservation.events ?? []).some((event) => event.type === "critical_alert_sent")
                              ? "bg-[rgba(33,88,57,0.08)] text-[rgb(33,88,57)] ring-[rgba(33,88,57,0.18)]"
                              : "bg-ink-50 text-ink-700 ring-black/8"
                          ].join(" ")}
                        >
                          {(reservation.events ?? []).some((event) => event.type === "critical_alert_sent")
                            ? "Correo critico enviado"
                            : "Correo critico pendiente"}
                        </span>
                      ) : null}
                      {reservation.reservationReleasedAt ? (
                        <span
                          className={[
                            "inline-flex rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ring-1 ring-inset",
                            reservation.reservationReleaseReason === "manual"
                              ? "bg-ink-950 text-white ring-ink-950/10"
                              : "bg-ink-50 text-ink-700 ring-black/8"
                          ].join(" ")}
                        >
                          {reservation.reservationReleaseReason === "manual" ? "Liberada manualmente" : "Liberada en limpieza"}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm leading-6 text-ink-600">
                      {reservation.customer.email} · {reservation.customer.phone}
                    </p>
                    <p className="text-sm leading-6 text-ink-600">
                      {reservation.items.map((item) => `${item.brand} ${item.name} ${item.sizeMl} ml x${item.quantity}`).join(" | ")}
                    </p>
                    {reservation.reservationReleasedAt ? (
                      <p className="text-xs uppercase tracking-[0.14em] text-ink-500">Registro de liberacion · {formatDateTime(reservation.reservationReleasedAt)}</p>
                    ) : null}
                    {reservation.events?.length ? (
                      <div className="space-y-2 border-t border-black/8 pt-4">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Historial de reserva</p>
                        {sortReservationEvents(reservation.events).find((event) => event.type === "critical_alert_sent") ? (
                          <p className="text-xs uppercase tracking-[0.14em] text-ink-500">
                            Ultimo aviso · {
                              formatDateTime(
                                sortReservationEvents(reservation.events).find((event) => event.type === "critical_alert_sent")?.at || ""
                              )
                            }
                          </p>
                        ) : null}
                        {(reservationAlertStats.get(reservation.id)?.retryCount ?? 0) > 0 ? (
                          <p className="text-xs uppercase tracking-[0.14em] text-ink-500">
                            Reenvios registrados · {reservationAlertStats.get(reservation.id)?.retryCount ?? 0}
                          </p>
                        ) : null}
                        {sortReservationEvents(reservation.events)
                          .slice(0, 4)
                          .map((event) => (
                            <div key={`${reservation.id}-${event.type}-${event.at}`} className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ring-1 ring-inset ${reservationEventClasses(event.type)}`}
                                >
                                  {reservationEventLabel(event.type)}
                                </span>
                                {event.detail ? <p className="mt-2 text-sm leading-6 text-ink-700">{event.detail}</p> : null}
                              </div>
                              <p className="shrink-0 text-xs text-ink-500">{formatDateTimeCompact(event.at)}</p>
                            </div>
                          ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="min-w-[12rem] rounded-luxe-xl border border-black/8 bg-ink-50/45 px-5 py-5 text-right">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Vencimiento</p>
                    <p className="mt-2 text-sm font-medium text-ink-950">{formatDateTime(new Date(reservation.expiresAtMs).toISOString())}</p>
                    <p className="mt-2 text-xs text-ink-500">
                      {reservation.isActive
                        ? `Quedan ${formatReservationRemaining(reservation.remainingMs)}`
                        : "Ya no bloquea stock vendible"}
                    </p>
                    {reservation.isActive ? (
                      <div
                        className={[
                          "mt-3 rounded-luxe border px-3 py-3",
                          reservation.remainingMs <= 5 * 60_000
                            ? "border-[rgba(140,40,20,0.18)] bg-[rgba(140,40,20,0.06)]"
                            : "border-antiqueGold/25 bg-antiqueGold/10"
                        ].join(" ")}
                      >
                        <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Cuenta regresiva</p>
                        <p className="mt-1 font-display text-2xl text-ink-950">{formatReservationCountdown(reservation.remainingMs)}</p>
                      </div>
                    ) : null}
                    <p className="mt-4 font-display text-2xl text-ink-950">{reservation.reservedUnits}</p>
                    <p className="mt-1 text-xs text-ink-500">pieza(s) apartada(s)</p>
                    {reservation.isActive ? (
                      <div className="mt-4 space-y-2">
                        {reservation.remainingMs <= 5 * 60_000 ? (
                          <Button
                            type="button"
                            variant="gold"
                            className="w-full text-sm"
                            onClick={() => void retryCriticalReservationAlert(reservation.id)}
                            disabled={pendingReservationId === reservation.id}
                          >
                            {pendingReservationId === reservation.id ? "Enviando alerta..." : "Reenviar alerta"}
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full text-sm"
                          onClick={() => void releaseReservation(reservation.id)}
                          disabled={pendingReservationId === reservation.id}
                        >
                          {pendingReservationId === reservation.id ? "Liberando..." : "Liberar reserva"}
                        </Button>
                      </div>
                    ) : (
                      <p className="mt-4 text-xs text-ink-500">
                        {reservation.reservationReleasedAt
                          ? "Reserva ya registrada como liberada."
                          : "Reserva vencida. Ya no bloquea stock."}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)]">
        <Card className="border-black/8 bg-white/78 p-6 shadow-[0_18px_42px_rgba(10,10,10,0.04)]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs tracking-section text-ink-500">FILTROS</p>
              <p className="mt-1 text-sm text-ink-700">Afina la lista para encontrar pedidos rapidamente.</p>
            </div>
            <span className="inline-flex rounded-full bg-ink-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-600 ring-1 ring-inset ring-black/8">
              Busqueda precisa
            </span>
          </div>
          {updateError ? (
            <div className="mb-5 rounded-luxe border border-black/8 bg-white px-4 py-3 text-sm text-ink-700">
              {updateError}
            </div>
          ) : null}

          <div className="grid gap-x-4 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
            <div className="grid gap-2 md:col-span-2 xl:col-span-3">
              <Label htmlFor="orders-query">Buscar</Label>
              <Input
                id="orders-query"
                placeholder="Cliente, correo o referencia"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="orders-provider">Proveedor</Label>
              <Select
                id="orders-provider"
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value as typeof provider)
                  setCurrentPage(1)
                }}
              >
                <option value="all">Todos</option>
                <option value="mercado_pago">Mercado Pago</option>
                <option value="paypal">PayPal</option>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="orders-status">Estado de pago</Label>
              <Select
                id="orders-status"
                value={paymentStatus}
                onChange={(e) => {
                  setPaymentStatus(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="all">Todos</option>
                {paymentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="orders-fulfillment-status">Estado logistico</Label>
              <Select
                id="orders-fulfillment-status"
                value={fulfillmentStatusFilter}
                onChange={(e) => {
                  setFulfillmentStatusFilter(e.target.value)
                  setCurrentPage(1)
                }}
              >
                {fulfillmentStatusFilters.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="orders-from-date">Desde</Label>
              <Input
                id="orders-from-date"
                type="date"
                min={earliestDate || undefined}
                max={toDate || latestDate || undefined}
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="orders-to-date">Hasta</Label>
              <Input
                id="orders-to-date"
                type="date"
                min={fromDate || earliestDate || undefined}
                max={latestDate || undefined}
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
          </div>
        </Card>

        <Card className="border-black/8 bg-gradient-to-br from-white to-ink-50/70 p-6 shadow-[0_18px_42px_rgba(10,10,10,0.04)]">
          <p className="text-xs tracking-section text-ink-500">RESUMEN</p>
          <p className="mt-2 text-sm leading-6 text-ink-700">
            Busca por cliente, correo, referencia de pago o nombre del perfume. Tambien puedes filtrar por proveedor, pago, logistica y fecha.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-luxe-lg border border-black/8 bg-white/80 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-ink-500">Vista actual</p>
              <p className="mt-2 text-sm font-medium leading-6 text-ink-950">
                {filteredOrders.length} orden(es) y {totalUnits} pieza(s)
              </p>
            </div>
            <div className="rounded-luxe-lg border border-black/8 bg-white/80 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-ink-500">Rango</p>
              <p className="mt-2 text-sm font-medium leading-6 text-ink-950">
                {fromDate || toDate ? `${fromDate || "Inicio"} - ${toDate || "Hoy"}` : "Sin filtro de fecha"}
              </p>
            </div>
            <div className="rounded-luxe-lg border border-black/8 bg-white/80 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-ink-500">Logistica</p>
              <p className="mt-2 text-sm font-medium leading-6 text-ink-950">
                {fulfillmentStatusFilter === "all"
                  ? "Todos los estados"
                  : fulfillmentStatusFilter === "fallback"
                    ? "Sin estado logistico"
                    : fulfillmentStatusFilters.find((status) => status.value === fulfillmentStatusFilter)?.label || "Filtrado"}
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={resetFilters}>
              Limpiar filtros
            </Button>
            <Button type="button" variant="gold" className="w-full sm:w-auto" onClick={exportCsv} disabled={!filteredOrders.length}>
              Exportar CSV
            </Button>
          </div>
        </Card>
      </div>

      {!filteredOrders.length ? (
        <Card className="mt-8 border-black/8 bg-white/78 p-10 text-center shadow-[0_16px_36px_rgba(10,10,10,0.04)]">
          <p className="text-xs tracking-section text-ink-500">SIN RESULTADOS</p>
          <p className="mt-2 font-display text-2xl text-ink-950">No hay ordenes para esta combinacion</p>
          <p className="mt-2 text-sm text-ink-600">Prueba con menos filtros o limpia la busqueda para volver a ver todas las compras.</p>
        </Card>
      ) : (
        <div className="mt-8 space-y-5">
          <div className="flex flex-col gap-4 rounded-luxe-xl border border-black/8 bg-white/72 px-5 py-5 shadow-[0_14px_32px_rgba(10,10,10,0.04)] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-600">
              Mostrando {visibleRangeStart}-{visibleRangeEnd} de {filteredOrders.length} ordenes.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="px-4 py-2.5 text-sm"
                onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
                disabled={safeCurrentPage <= 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-ink-600">
                Pagina {safeCurrentPage} de {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                className="px-4 py-2.5 text-sm"
                onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
                disabled={safeCurrentPage >= totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {paginatedOrders.map((order) => {
              const totalOrderUnits = order.items.reduce((sum, item) => sum + item.quantity, 0)
              const isExpanded = expandedOrderIds.includes(order.id)
              const previewItems = order.items.slice(0, 2)
              return (
                <Card
                  id={`confirmed-order-${order.id}`}
                  key={order.id}
                  radius="lg"
                  className="border-black/8 bg-white/78 p-6 shadow-[0_18px_42px_rgba(10,10,10,0.04)] transition hover:shadow-[0_22px_50px_rgba(10,10,10,0.06)]"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">
                        Orden {order.id} · {formatDateTime(order.completedAt)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-xl text-ink-950">{order.customer.fullName}</p>
                        <span className="inline-flex rounded-full bg-ink-950 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white shadow-[0_8px_18px_rgba(10,10,10,0.12)]">
                          {order.provider === "paypal" ? "PayPal" : "Mercado Pago"}
                        </span>
                        <span className="inline-flex rounded-full bg-antiqueGold/14 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-antiqueGold ring-1 ring-inset ring-antiqueGold/25">
                          {orderStatusCustomerLabel(order)}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-ink-600">
                        {order.customer.email} · {order.customer.phone}
                      </p>
                      <p className="text-sm leading-6 text-ink-600">
                        {order.customer.addressLine1}
                        {order.customer.addressLine2 ? `, ${order.customer.addressLine2}` : ""} · {order.customer.city},{" "}
                        {order.customer.state} · CP {order.customer.postalCode}
                      </p>
                      <p className="text-xs text-ink-500">
                        Pago {order.paymentReference}
                      </p>
                      {order.customer.notes ? <p className="text-xs text-ink-500">Notas: {order.customer.notes}</p> : null}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-start gap-3 rounded-luxe-xl border border-black/8 bg-ink-50/45 px-5 py-5 lg:min-w-[13rem] lg:flex-col lg:items-end">
                      <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-700 ring-1 ring-inset ring-black/8">
                        {totalOrderUnits} pieza(s)
                      </span>
                      <p className="font-display text-2xl text-ink-950">{formatMoney(resolveStoredOrderTotal(order))}</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full text-sm lg:w-auto"
                        onClick={() => toggleExpanded(order.id)}
                      >
                        {isExpanded ? "Ocultar detalle" : "Ver detalle"}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3">
                    {(isExpanded ? order.items : previewItems).map((item) => (
                      <div
                        key={`${order.id}-${item.perfumeId}-${item.sizeMl}`}
                        className="flex items-center justify-between gap-4 rounded-luxe-lg border border-black/8 bg-ink-50/45 px-4 py-4"
                      >
                        <div className="min-w-0">
                          <p className="text-xs tracking-ui text-ink-500">{item.brand}</p>
                          <p className="truncate text-sm font-medium text-ink-950">
                            {item.name} · {item.sizeMl} ml
                          </p>
                        </div>
                        <div className="text-right text-xs text-ink-600">
                          <p>x{item.quantity}</p>
                          <p>{formatMoney(item.unitPrice)}</p>
                        </div>
                      </div>
                    ))}
                    {!isExpanded && order.items.length > previewItems.length ? (
                      <p className="text-xs text-ink-500">
                        +{order.items.length - previewItems.length} producto(s) mas. Abre el detalle para ver todo.
                      </p>
                    ) : null}
                  </div>

                  {isExpanded ? (
                    <div className="mt-5 rounded-luxe-xl border border-black/8 bg-white/70 px-5 py-5 text-sm text-ink-700">
                      <p className="text-xs tracking-section text-ink-500">DETALLE AMPLIADO</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-luxe-lg border border-black/8 bg-ink-50/35 px-4 py-4">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-ink-500">Creada</p>
                          <p className="mt-1 text-sm font-medium text-ink-950">{formatDateTime(order.createdAt)}</p>
                        </div>
                        <div className="rounded-luxe-lg border border-black/8 bg-ink-50/35 px-4 py-4">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-ink-500">Confirmada</p>
                          <p className="mt-1 text-sm font-medium text-ink-950">{formatDateTime(order.completedAt)}</p>
                        </div>
                        <div className="rounded-luxe-lg border border-black/8 bg-ink-50/35 px-4 py-4">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-ink-500">Referencia</p>
                          <p className="mt-1 text-sm font-medium text-ink-950">{order.paymentReference}</p>
                        </div>
                        <div className="rounded-luxe-lg border border-black/8 bg-ink-50/35 px-4 py-4">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-ink-500">Estado</p>
                          <p className="mt-1 text-sm font-medium text-ink-950">{orderStatusCustomerLabel(order)}</p>
                        </div>
                        <div className="rounded-luxe-lg border border-black/8 bg-ink-50/35 px-4 py-4">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-ink-500">Subtotal</p>
                          <p className="mt-1 text-sm font-medium text-ink-950">{formatMoney(order.subtotal)}</p>
                        </div>
                        <div className="rounded-luxe-lg border border-black/8 bg-ink-50/35 px-4 py-4">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-ink-500">Envio</p>
                          <p className="mt-1 text-sm font-medium text-ink-950">
                            {order.shippingAmount > 0 ? formatMoney(order.shippingAmount) : "Gratis"}
                          </p>
                        </div>
                        <div className="rounded-luxe-lg border border-black/8 bg-ink-50/35 px-4 py-4">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-ink-500">Total</p>
                          <p className="mt-1 text-sm font-medium text-ink-950">{formatMoney(resolveStoredOrderTotal(order))}</p>
                        </div>
                        <div className="rounded-luxe-lg border border-black/8 bg-ink-50/35 px-4 py-4 sm:col-span-2">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="min-w-0 flex-1">
                              <Label htmlFor={`fulfillment-${order.id}`}>Estado logistico</Label>
                              <Select
                                id={`fulfillment-${order.id}`}
                                className="mt-2"
                                value={order.fulfillmentStatus || ""}
                                onChange={(e) => void updateFulfillmentStatus(order.id, e.target.value)}
                                disabled={pendingOrderId === order.id}
                              >
                                {fulfillmentStatuses.map((statusOption) => (
                                  <option key={statusOption.value || "default"} value={statusOption.value}>
                                    {statusOption.label}
                                  </option>
                                ))}
                              </Select>
                            </div>
                            <p className="text-xs leading-5 text-ink-500">
                              Cuando exista estado logistico, el badge del cliente cambia de forma automatica.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </AdminPanel>
  )
}
