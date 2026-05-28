import { ButtonGhost } from "@/components/ui/Button"
import type { Review } from "@/lib/admin/types"

type Props = {
  deleteReviewTarget: Review | null
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeleteReviewModal({ deleteReviewTarget, busy, onClose, onConfirm }: Props) {
  if (!deleteReviewTarget) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_30px_90px_rgba(0,0,0,0.30)] ring-1 ring-inset ring-black/8">
        <p className="text-xs tracking-[0.25em] text-ink-500">CONFIRMAR</p>
        <h2 className="mt-2 font-display text-2xl text-ink-950">Eliminar reseña</h2>
        <p className="mt-3 text-sm text-ink-700">¿Seguro que quieres eliminar la reseña de “{deleteReviewTarget.customerName}”?</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <ButtonGhost
            type="button"
            className="w-full rounded-xl border border-black/8 px-4 py-2.5 text-sm hover:bg-ink-50 sm:w-auto"
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </ButtonGhost>
          <ButtonGhost
            type="button"
            className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 hover:bg-red-100 sm:w-auto"
            onClick={onConfirm}
            disabled={busy}
          >
            Eliminar
          </ButtonGhost>
        </div>
      </div>
    </div>
  )
}
