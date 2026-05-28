import { ButtonGhost } from "@/components/ui/Button"
import type { Review } from "@/lib/admin/types"
import { ModalShell } from "@/components/ui/ModalShell"
import { Surface } from "@/components/ui/Surface"

type Props = {
  deleteReviewTarget: Review | null
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeleteReviewModal({ deleteReviewTarget, busy, onClose, onConfirm }: Props) {
  if (!deleteReviewTarget) return null

  return (
    <ModalShell open={true} onClose={onClose} contentClassName="w-full max-w-md">
      <Surface variant="modal" radius="xl" className="w-full p-6">
        <p className="text-xs tracking-section text-ink-500">CONFIRMAR</p>
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
      </Surface>
    </ModalShell>
  )
}
