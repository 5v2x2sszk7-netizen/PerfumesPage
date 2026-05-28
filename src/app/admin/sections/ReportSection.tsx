import type { Perfume } from "@/types/perfume"
import type { SaleRecord } from "@/lib/admin/types"
import { formatMoney } from "@/lib/admin/utils"

type Props = {
  perfumes: Perfume[]
  sales: SaleRecord[]
}

function buildReport(perfumes: Perfume[], sales: SaleRecord[]) {
  const salesTotals = sales.reduce(
    (acc, s) => {
      const qty = Math.max(0, Math.floor(s.qty ?? 0))
      if (qty <= 0) return acc
      const price = Number.isFinite(s.unitPrice) ? Math.max(0, s.unitPrice) : 0
      const cost = Number.isFinite(s.unitCost) ? Math.max(0, s.unitCost) : 0
      acc.soldUnits += qty
      acc.revenue += price * qty
      acc.cost += cost * qty
      acc.profit += (price - cost) * qty
      return acc
    },
    {
      soldUnits: 0,
      revenue: 0,
      cost: 0,
      profit: 0
    }
  )

  const inventoryTotals = perfumes.reduce(
    (acc, p) => {
      const stock = Math.max(0, Math.floor(p.stock ?? 0))
      const profitPer = p.price - p.cost
      acc.inventoryUnits += stock
      acc.inventoryValue += stock * p.cost
      acc.potentialProfit += stock * profitPer
      return acc
    },
    {
      inventoryUnits: 0,
      inventoryValue: 0,
      potentialProfit: 0
    }
  )

  const margin = salesTotals.revenue > 0 ? salesTotals.profit / salesTotals.revenue : 0
  return { ...salesTotals, ...inventoryTotals, margin }
}

function buildSalesByPerfume(perfumes: Perfume[], sales: SaleRecord[]) {
  const perfumeById = new Map(perfumes.map((p) => [p.id, p] as const))
  const collator = new Intl.Collator("es", { sensitivity: "base" })
  const map = new Map<
    string,
    {
      id: string
      brand: string
      name: string
      sizeMl: number
      soldUnits: number
      revenue: number
      cost: number
      profit: number
    }
  >()

  for (const s of sales) {
    const qty = Math.max(0, Math.floor(s.qty ?? 0))
    if (qty <= 0) continue
    const key = s.perfumeId
    if (!key) continue

    const price = Number.isFinite(s.unitPrice) ? Math.max(0, s.unitPrice) : 0
    const cost = Number.isFinite(s.unitCost) ? Math.max(0, s.unitCost) : 0
    const existing = map.get(key)
    if (!existing) {
      const current = perfumeById.get(key)
      map.set(key, {
        id: key,
        brand: current?.brand ?? s.brand,
        name: current?.name ?? s.name,
        sizeMl: current?.sizeMl ?? s.sizeMl,
        soldUnits: qty,
        revenue: price * qty,
        cost: cost * qty,
        profit: (price - cost) * qty
      })
    } else {
      existing.soldUnits += qty
      existing.revenue += price * qty
      existing.cost += cost * qty
      existing.profit += (price - cost) * qty
      const current = perfumeById.get(key)
      if (current) {
        existing.brand = current.brand
        existing.name = current.name
        existing.sizeMl = current.sizeMl
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.soldUnits !== a.soldUnits) return b.soldUnits - a.soldUnits
    if (b.revenue !== a.revenue) return b.revenue - a.revenue
    const brandCmp = collator.compare(a.brand, b.brand)
    if (brandCmp !== 0) return brandCmp
    return collator.compare(a.name, b.name)
  })
}

export function ReportSection({ perfumes, sales }: Props) {
  const report = buildReport(perfumes, sales)
  const salesByPerfume = buildSalesByPerfume(perfumes, sales)

  const topPerfume = salesByPerfume[0] ?? null

  return (
    <section className="rounded-luxe-xl bg-ink-50/60 p-3 ring-1 ring-inset ring-black/8 sm:p-5">
      <div className="rounded-3xl border border-black/8 bg-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs tracking-[0.25em] text-ink-500">INFORME</p>
            <h2 className="font-display text-2xl text-ink-950">Ganancias</h2>
          </div>
          <p className="text-sm text-ink-600">{perfumes.length} productos</p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-black/8 bg-ink-50/40 p-4">
            <p className="text-xs text-ink-600">Piezas vendidas</p>
            <p className="mt-1 font-display text-2xl text-ink-950">{report.soldUnits}</p>
          </div>
          <div className="rounded-2xl border border-black/8 bg-ink-50/40 p-4">
            <p className="text-xs text-ink-600">Ingresos (vendido)</p>
            <p className="mt-1 font-display text-2xl text-ink-950">{formatMoney(report.revenue)}</p>
          </div>
          <div className="rounded-2xl border border-black/8 bg-ink-50/40 p-4">
            <p className="text-xs text-ink-600">Costo (vendido)</p>
            <p className="mt-1 font-display text-2xl text-ink-950">{formatMoney(report.cost)}</p>
          </div>
          <div className="rounded-2xl border border-black/8 bg-ink-50/40 p-4">
            <p className="text-xs text-ink-600">Ganancia (vendido)</p>
            <p className="mt-1 font-display text-2xl text-antiqueGold">{formatMoney(report.profit)}</p>
            <p className="mt-1 text-xs text-ink-600">{report.revenue > 0 ? `${Math.round(report.margin * 100)}% margen` : ""}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-black/8 bg-white p-4">
            <p className="text-xs text-ink-600">Inventario (piezas)</p>
            <p className="mt-1 font-display text-xl text-ink-950">{report.inventoryUnits}</p>
          </div>
          <div className="rounded-2xl border border-black/8 bg-white p-4">
            <p className="text-xs text-ink-600">Inventario (costo)</p>
            <p className="mt-1 font-display text-xl text-ink-950">{formatMoney(report.inventoryValue)}</p>
          </div>
          <div className="rounded-2xl border border-black/8 bg-white p-4">
            <p className="text-xs text-ink-600">Ganancia potencial</p>
            <p className="mt-1 font-display text-xl text-antiqueGold">{formatMoney(report.potentialProfit)}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          <div className="rounded-3xl border border-black/8 bg-white p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs tracking-[0.25em] text-ink-500">RESUMEN</p>
                <h3 className="font-display text-xl text-ink-950">Perfume más vendido</h3>
              </div>
              <p className="text-sm text-ink-600">{topPerfume ? `${topPerfume.soldUnits} pzas` : "Aún no hay ventas registradas"}</p>
            </div>
            {topPerfume ? (
              <div className="mt-4 rounded-2xl border border-black/8 bg-white p-4">
                <p className="text-xs tracking-[0.18em] text-ink-500">PERFUME</p>
                <p className="mt-1 font-display text-xl text-ink-950">
                  {topPerfume.name} · {topPerfume.sizeMl} ml
                </p>
                <p className="mt-1 text-sm text-ink-600">{topPerfume.brand}</p>
                <p className="mt-3 text-xs text-ink-500">
                  Vendidas: {topPerfume.soldUnits} · Ingresos {formatMoney(topPerfume.revenue)} · Costo {formatMoney(topPerfume.cost)} ·
                  Ganancia {formatMoney(topPerfume.profit)}
                </p>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-black/8 bg-white p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs tracking-[0.25em] text-ink-500">DETALLE</p>
                <h3 className="font-display text-xl text-ink-950">Ventas por perfume</h3>
              </div>
              <p className="text-sm text-ink-600">
                {salesByPerfume.length ? `${salesByPerfume.length} perfumes con ventas` : "Aún no hay ventas registradas"}
              </p>
            </div>
            <div className="mt-4 grid gap-3">
              {salesByPerfume.map((row, idx) => (
                <div
                  key={row.id}
                  className="flex flex-col gap-2 rounded-2xl border border-black/8 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-xs tracking-[0.18em] text-ink-500">{idx + 1}. Perfume</p>
                    <p className="truncate font-display text-lg text-ink-950">
                      {row.name} · {row.sizeMl} ml
                    </p>
                    <p className="mt-1 text-xs text-ink-600">{row.brand}</p>
                    <p className="mt-1 text-xs text-ink-500">
                      Vendidas: {row.soldUnits} · Ingresos {formatMoney(row.revenue)} · Costo {formatMoney(row.cost)} · Ganancia{" "}
                      {formatMoney(row.profit)}
                    </p>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 sm:flex-col sm:items-end sm:justify-center">
                    <p className="text-sm font-medium text-ink-950">{row.soldUnits} pzas</p>
                    <p className="text-xs text-antiqueGold">{formatMoney(row.profit)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
