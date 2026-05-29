import type { Perfume } from "@/types/perfume"
import { ConfirmModal } from "@/components/ui/ModalShell"

type Props = {
  deleteTarget: Perfume | null
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeleteProductModal({ deleteTarget, busy, onClose, onConfirm }: Props) {
  if (!deleteTarget) return null

  return (
    <ConfirmModal
      open={true}
      onClose={onClose}
      onConfirm={onConfirm}
      busy={busy}
      title="Eliminar producto"
      confirmLabel="Eliminar"
      description={
        <>
          ¿Seguro que quieres eliminar “{deleteTarget.name}” ({deleteTarget.brand})?
        </>
      }
    />
  )
}
