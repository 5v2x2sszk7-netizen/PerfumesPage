import type { Perfume } from "@/types/perfume"
import { Button, ButtonGhost } from "@/components/ui/Button"
import { Input } from "@/components/ui/Field"
import { formatMoney } from "@/lib/admin/utils"
import { ModalShell } from "@/components/ui/ModalShell"
import { Surface } from "@/components/ui/Surface"

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

  return (
    <ModalShell open={true} onClose={onClose} contentClassName="w-full max-w-md">
      <Surface variant="modal" radius="xl" className="w-full p-6">
        <p className="text-xs tracking-section text-ink-500">CONFIRMAR</p>
        <h2 className="mt-2 font-display text-2xl text-ink-950">Confirmar venta</h2>
        <p className="mt-3 text-sm text-ink-700">
          Esto descontará piezas del stock de “{sellTarget.name}” ({sellTarget.brand}).
        </p>
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
              {Math.max(0, Math.floor(sellTarget.stock ?? 0) - Math.max(1, Math.floor(sellQty)))}
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
            <p className="text-sm font-medium text-ink-950">{formatMoney(sellTarget.price - sellTarget.cost)}</p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-ink-700">Ganancia (cantidad)</p>
            <p className="text-sm font-medium text-ink-950">
              {formatMoney(
                (sellTarget.price - sellTarget.cost) *
                  Math.min(Math.max(1, Math.floor(sellQty)), Math.max(0, Math.floor(sellTarget.stock ?? 0)))
              )}
            </p>
          </div>
          {Math.max(0, Math.floor(sellTarget.stock ?? 0) - Math.max(1, Math.floor(sellQty))) <= 0 ? (
            <p className="text-xs text-ink-600">Al confirmar, el producto se eliminará del catálogo.</p>
          ) : null}
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <ButtonGhost
            type="button"
            className="w-full rounded-xl border border-black/8 px-4 py-2.5 text-sm hover:bg-ink-50 sm:w-auto"
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </ButtonGhost>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={busy || Math.floor(sellQty) < 1 || Math.floor(sellQty) > Math.floor(sellTarget.stock ?? 0)}
            variant="gold"
            className="w-full hover:shadow-cta-hover sm:w-auto"
          >
            Confirmar pago
          </Button>
        </div>
      </Surface>
    </ModalShell>
  )
}
