import type { Perfume } from "@/types/perfume"
import { Button } from "@/components/ui/Button"
import { formatMoney } from "@/lib/admin/utils"
import { AdminPanel } from "@/features/admin/components/AdminPanel"
import { perfumeSoldUnits, profitForQty, profitPerUnit } from "@/lib/admin/finance"
import { Card } from "@/components/ui/Surface"

type Props = {
  perfumes: Perfume[]
  busy: boolean
  onEdit: (perfume: Perfume) => void
  onSell: (perfume: Perfume) => void
  onDelete: (perfume: Perfume) => void
}

export function ProductsSection({ perfumes, busy, onEdit, onSell, onDelete }: Props) {
  return (
    <AdminPanel className="p-2 sm:p-3" innerClassName="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs tracking-section text-ink-500">PRODUCTOS</p>
          <h2 className="font-display text-xl text-ink-950 sm:text-2xl">Productos</h2>
        </div>
        <p className="text-sm text-ink-600">
          {perfumes.length} {perfumes.length === 1 ? "producto" : "productos"}
        </p>
      </div>

      <div className="mt-4 grid gap-3">
        {perfumes.map((p) => {
          const soldUnits = perfumeSoldUnits(p)
          const perUnit = profitPerUnit(p.price, p.cost)
          const realized = profitForQty(p.price, p.cost, soldUnits)
          return (
            <Card
              key={p.id}
              radius="lg"
              className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
            >
              <div className="min-w-0">
                <p className="text-xs tracking-ui text-ink-500">{p.brand}</p>
                <p className="truncate font-display text-lg text-ink-950">{p.name}</p>
                <p className="mt-1 text-xs leading-5 text-ink-500">
                  {p.category === "niche" ? "Nicho" : "Diseñador"} · {p.sizeMl} ml · {p.stock} en stock · {p.availability} ·
                  Venta {formatMoney(p.price)} · Costo {formatMoney(p.cost)} · Ganancia {formatMoney(perUnit)}
                </p>
                <p className="mt-1 text-xs leading-5 text-ink-500">
                  Vendidas: {soldUnits} · Ganancia realizada: {formatMoney(realized)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  radius="xl"
                  className="px-4 py-2.5 text-sm"
                  onClick={() => onEdit(p)}
                  disabled={busy}
                >
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="gold"
                  className="hover:shadow-cta-hover"
                  onClick={() => onSell(p)}
                  disabled={busy || p.stock <= 0}
                >
                  Confirmar pago
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  radius="xl"
                  className="px-4 py-2.5 text-sm"
                  onClick={() => onDelete(p)}
                  disabled={busy}
                >
                  Eliminar
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    </AdminPanel>
  )
}
