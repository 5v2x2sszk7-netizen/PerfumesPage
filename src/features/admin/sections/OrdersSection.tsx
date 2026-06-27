"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Surface"
import { Input, Label, Select } from "@/components/ui/Field"
import { api } from "@/lib/admin/api"
import { formatMoney } from "@/lib/admin/utils"
import type { ConfirmedOrderRecord } from "@/lib/admin/types"
import { fulfillmentStatusCustomerLabel, orderStatusCustomerLabel } from "@/lib/orderPresentation"
import { resolveStoredOrderTotal } from "@/lib/shipping"
import { AdminPanel } from "@/features/admin/components/AdminPanel"

type Props = {
  orders: ConfirmedOrderRecord[]
  refresh: () => Promise<void>
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short"
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

export function OrdersSection({ orders, refresh }: Props) {
  const itemsPerPage = 6
  const [query, setQuery] = useState("")
  const [provider, setProvider] = useState<"all" | "mercado_pago" | "paypal">("all")
  const [paymentStatus, setPaymentStatus] = useState("all")
  const [fulfillmentStatusFilter, setFulfillmentStatusFilter] = useState("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedOrderIds, setExpandedOrderIds] = useState<string[]>([])
  const [pendingOrderId, setPendingOrderId] = useState("")
  const [updateError, setUpdateError] = useState("")
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
