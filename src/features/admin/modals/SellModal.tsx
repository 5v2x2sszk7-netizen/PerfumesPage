import type { Perfume } from "@/types/perfume"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Field"
import { formatMoney } from "@/lib/admin/utils"
import { ModalCard } from "@/components/ui/ModalShell"
import { profitForQty, profitPerUnit } from "@/lib/admin/finance"

type Props = {
  sellTarget: Perfume | null
  busy: boolean
  sellQty: number
  setSellQty: (qty: number) => void
  onClose: () => void
  onConfirm: () => void
}

export function SellModal({ sellTarget, busy, sellQty, setSellQty, onClose, onConfirm }: Props) {
  if (!sellTarget) return null

  const qty = Math.max(1, Math.floor(sellQty))
  const currentStock = Math.max(0, Math.floor(sellTarget.stock ?? 0))
  const clampedQty = Math.min(qty, currentStock)
  const nextStock = Math.max(0, currentStock - qty)
  const perUnit = profitPerUnit(sellTarget.price, sellTarget.cost)
  const totalProfit = profitForQty(sellTarget.price, sellTarget.cost, clampedQty)

  return (
    <ModalCard
      open={true}
      onClose={onClose}
      kicker="CONFIRMAR"
      title="Confirmar venta"
      description={
        <>
          Esto descontará piezas del stock de “{sellTarget.name}” ({sellTarget.brand}).
        </>
      }
    >
      <div className="mt-4 grid gap-3 rounded-2xl border border-black/8 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink-700">Stock actual</p>
          <p className="text-sm font-medium text-ink-950">{sellTarget.stock}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink-700">Cantidad</p>
          <Input
            inputMode="numeric"
            value={String(sellQty)}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^\d]/g, "")
              const num = raw ? Number(raw) : 1
              setSellQty(Number.isFinite(num) ? num : 1)
            }}
            className="h-11 w-[120px] text-right"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink-700">Stock después</p>
          <p className="text-sm font-medium text-ink-950">
            {nextStock}
          </p>
        </div>
        <div className="h-px bg-black/6" />
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink-700">Venta (1 pza)</p>
          <p className="text-sm font-medium text-ink-950">{formatMoney(sellTarget.price)}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink-700">Costo (1 pza)</p>
          <p className="text-sm font-medium text-ink-950">{formatMoney(sellTarget.cost)}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink-700">Ganancia (1 pza)</p>
          <p className="text-sm font-medium text-ink-950">{formatMoney(perUnit)}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink-700">Ganancia (cantidad)</p>
          <p className="text-sm font-medium text-ink-950">{formatMoney(totalProfit)}</p>
        </div>
        {nextStock <= 0 ? (
          <p className="text-xs text-ink-600">Al confirmar, el producto se eliminará del catálogo.</p>
        ) : null}
      </div>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          className="w-full rounded-xl border border-black/8 px-4 py-2.5 text-sm hover:bg-ink-50 sm:w-auto"
          onClick={onClose}
          disabled={busy}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={busy || qty < 1 || qty > currentStock}
          variant="gold"
          className="w-full hover:shadow-cta-hover sm:w-auto"
        >
          Confirmar pago
        </Button>
      </div>
    </ModalCard>
  )
}
