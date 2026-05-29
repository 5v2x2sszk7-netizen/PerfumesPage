import type { Review } from "@/lib/admin/types"
import { ConfirmModal } from "@/components/ui/ModalShell"

type Props = {
  deleteReviewTarget: Review | null
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeleteReviewModal({ deleteReviewTarget, busy, onClose, onConfirm }: Props) {
  if (!deleteReviewTarget) return null

  return (
    <ConfirmModal
      open={true}
      onClose={onClose}
      onConfirm={onConfirm}
      busy={busy}
      title="Eliminar reseña"
      confirmLabel="Eliminar"
      description={<>¿Seguro que quieres eliminar la reseña de “{deleteReviewTarget.customerName}”?</>}
    />
  )
}
