import type { Perfume } from "@/types/perfume"
import { Button } from "@/components/ui/Button"
import { formatMoney } from "@/lib/admin/utils"

type Props = {
  perfumes: Perfume[]
  busy: boolean
  onEdit: (perfume: Perfume) => void
  onSell: (perfume: Perfume) => void
  onDelete: (perfume: Perfume) => void
}

export function ProductsSection({ perfumes, busy, onEdit, onSell, onDelete }: Props) {
  return (
    <section className="rounded-luxe-xl bg-ink-50/60 p-3 ring-1 ring-inset ring-black/8 sm:p-5">
      <div className="rounded-3xl border border-black/8 bg-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-2xl text-ink-950">Productos</h2>
          <p className="text-sm text-ink-600">{perfumes.length} perfumes</p>
        </div>

        <div className="mt-6 grid gap-3">
          {perfumes.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-3 rounded-2xl border border-black/8 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-xs tracking-ui text-ink-500">{p.brand}</p>
                <p className="truncate font-display text-lg text-ink-950">{p.name}</p>
                <p className="mt-1 text-xs text-ink-500">
                  {p.category === "niche" ? "Nicho" : "Diseñador"} · {p.sizeMl} ml · {p.stock} en stock · {p.availability} · Venta{" "}
                  {formatMoney(p.price)} · Costo {formatMoney(p.cost)} · Ganancia {formatMoney(p.price - p.cost)}
                </p>
                <p className="mt-1 text-xs text-ink-500">
                  Vendidas: {Math.max(0, Math.floor(p.sold ?? 0))} · Ganancia realizada:{" "}
                  {formatMoney((p.price - p.cost) * Math.max(0, Math.floor(p.sold ?? 0)))}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-xl border border-black/8 px-4 py-2.5 text-sm hover:bg-ink-50"
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
                  variant="ghost"
                  className="rounded-xl border border-red-200 px-4 py-2.5 text-sm text-red-700 hover:bg-red-50"
                  onClick={() => onDelete(p)}
                  disabled={busy}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
