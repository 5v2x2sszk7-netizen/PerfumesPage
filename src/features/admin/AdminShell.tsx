import { Button } from "@/components/ui/Button"
import { Pill } from "@/components/ui/Pill"
import { AdminPanel } from "@/features/admin/components/AdminPanel"
import type { AdminSection } from "@/lib/admin/types"

type Props = {
  busy: boolean
  error: string | null
  section: AdminSection
  onRefresh: () => void
  onLogout: () => void
  onSelectSection: (section: AdminSection) => void
  onStartForm: () => void
}

export function AdminShell({ busy, error, section, onRefresh, onLogout, onSelectSection, onStartForm }: Props) {
  return (
    <AdminPanel>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs tracking-section text-ink-500">ADMIN</p>
          <h1 className="font-display text-3xl text-ink-950">Panel</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            radius="xl"
            className="border border-black/8 px-4 py-2.5 text-sm hover:bg-ink-50"
            onClick={onRefresh}
            disabled={busy}
          >
            Recargar
          </Button>
          <Button
            type="button"
            variant="ghost"
            radius="xl"
            className="border border-black/8 px-4 py-2.5 text-sm hover:bg-ink-50"
            onClick={onLogout}
            disabled={busy}
          >
            Salir
          </Button>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <Pill type="button" onClick={() => onSelectSection("products")} active={section === "products"} variant="admin">
          Productos
        </Pill>
        <Pill type="button" onClick={onStartForm} active={section === "form"} variant="admin">
          Nuevo / Editar
        </Pill>
        <Pill type="button" onClick={() => onSelectSection("report")} active={section === "report"} variant="admin">
          Informe
        </Pill>
        <Pill type="button" onClick={() => onSelectSection("reviews")} active={section === "reviews"} variant="admin">
          Reseñas
        </Pill>
      </div>
    </AdminPanel>
  )
}
