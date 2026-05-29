import type { Perfume } from "@/types/perfume"
import type { SaleRecord } from "@/lib/admin/types"
import { formatMoney } from "@/lib/admin/utils"
import { AdminPanel } from "@/features/admin/components/AdminPanel"
import { buildAdminReport, buildSalesByPerfume } from "@/lib/admin/finance"
import { Card } from "@/components/ui/Surface"

type Props = {
  perfumes: Perfume[]
  sales: SaleRecord[]
}

export function ReportSection({ perfumes, sales }: Props) {
  const report = buildAdminReport(perfumes, sales)
  const salesByPerfume = buildSalesByPerfume(perfumes, sales)

  const topPerfume = salesByPerfume[0] ?? null

  return (
    <AdminPanel>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs tracking-section text-ink-500">INFORME</p>
          <h2 className="font-display text-2xl text-ink-950">Ganancias</h2>
        </div>
        <p className="text-sm text-ink-600">{perfumes.length} productos</p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card radius="lg" className="bg-ink-50/40 p-4">
          <p className="text-xs text-ink-600">Piezas vendidas</p>
          <p className="mt-1 font-display text-2xl text-ink-950">{report.soldUnits}</p>
        </Card>
        <Card radius="lg" className="bg-ink-50/40 p-4">
          <p className="text-xs text-ink-600">Ingresos (vendido)</p>
          <p className="mt-1 font-display text-2xl text-ink-950">{formatMoney(report.revenue)}</p>
        </Card>
        <Card radius="lg" className="bg-ink-50/40 p-4">
          <p className="text-xs text-ink-600">Costo (vendido)</p>
          <p className="mt-1 font-display text-2xl text-ink-950">{formatMoney(report.cost)}</p>
        </Card>
        <Card radius="lg" className="bg-ink-50/40 p-4">
          <p className="text-xs text-ink-600">Ganancia (vendido)</p>
          <p className="mt-1 font-display text-2xl text-antiqueGold">{formatMoney(report.profit)}</p>
          <p className="mt-1 text-xs text-ink-600">{report.revenue > 0 ? `${Math.round(report.margin * 100)}% margen` : ""}</p>
        </Card>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Card radius="lg" className="p-4">
          <p className="text-xs text-ink-600">Inventario (piezas)</p>
          <p className="mt-1 font-display text-xl text-ink-950">{report.inventoryUnits}</p>
        </Card>
        <Card radius="lg" className="p-4">
          <p className="text-xs text-ink-600">Inventario (costo)</p>
          <p className="mt-1 font-display text-xl text-ink-950">{formatMoney(report.inventoryValue)}</p>
        </Card>
        <Card radius="lg" className="p-4">
          <p className="text-xs text-ink-600">Ganancia potencial</p>
          <p className="mt-1 font-display text-xl text-antiqueGold">{formatMoney(report.potentialProfit)}</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-3">
        <Card className="p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs tracking-section text-ink-500">RESUMEN</p>
              <h3 className="font-display text-xl text-ink-950">Perfume más vendido</h3>
            </div>
            <p className="text-sm text-ink-600">{topPerfume ? `${topPerfume.soldUnits} pzas` : "Aún no hay ventas registradas"}</p>
          </div>
          {topPerfume ? (
            <Card radius="lg" className="mt-4 p-4">
              <p className="text-xs tracking-ui text-ink-500">PERFUME</p>
              <p className="mt-1 font-display text-xl text-ink-950">
                {topPerfume.name} · {topPerfume.sizeMl} ml
              </p>
              <p className="mt-1 text-sm text-ink-600">{topPerfume.brand}</p>
              <p className="mt-3 text-xs text-ink-500">
                Vendidas: {topPerfume.soldUnits} · Ingresos {formatMoney(topPerfume.revenue)} · Costo {formatMoney(topPerfume.cost)} · Ganancia{" "}
                {formatMoney(topPerfume.profit)}
              </p>
            </Card>
          ) : null}
        </Card>

        <Card className="p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs tracking-section text-ink-500">DETALLE</p>
              <h3 className="font-display text-xl text-ink-950">Ventas por perfume</h3>
            </div>
            <p className="text-sm text-ink-600">
              {salesByPerfume.length ? `${salesByPerfume.length} perfumes con ventas` : "Aún no hay ventas registradas"}
            </p>
          </div>
          <div className="mt-4 grid gap-3">
            {salesByPerfume.map((row, idx) => (
              <Card
                key={row.id}
                radius="lg"
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-xs tracking-ui text-ink-500">{idx + 1}. Perfume</p>
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
              </Card>
            ))}
          </div>
        </Card>
      </div>
    </AdminPanel>
  )
}
