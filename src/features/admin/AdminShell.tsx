import { Button } from "@/components/ui/Button"
import { Pill } from "@/components/ui/Pill"
import { AdminPanel } from "@/features/admin/components/AdminPanel"
import type { AdminSection } from "@/lib/admin/types"

type Props = {
  busy: boolean
  error: string | null
  section: AdminSection
  expiringReservationsCount?: number
  onRefresh: () => void
  onLogout: () => void
  onSelectSection: (section: AdminSection) => void
  onStartForm: () => void
}

export function AdminShell({ busy, error, section, expiringReservationsCount = 0, onRefresh, onLogout, onSelectSection, onStartForm }: Props) {
  return (
    <AdminPanel className="p-2 sm:p-3" innerClassName="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs tracking-section text-ink-500">ADMIN</p>
          <h1 className="font-display text-2xl text-ink-950 sm:text-3xl">Panel</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            radius="xl"
            className="px-4 py-2 text-sm"
            onClick={onRefresh}
            disabled={busy}
          >
            Recargar
          </Button>
          <Button
            type="button"
            variant="outline"
            radius="xl"
            className="px-4 py-2 text-sm"
            onClick={onLogout}
            disabled={busy}
          >
            Salir
          </Button>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {expiringReservationsCount > 0 ? (
        <div className="mt-4 rounded-luxe-xl border border-[rgba(140,40,20,0.18)] bg-[rgba(140,40,20,0.06)] px-4 py-4 shadow-[0_12px_28px_rgba(140,40,20,0.08)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[rgb(140,40,20)]">Alerta Operativa</p>
              <p className="mt-1 text-sm font-medium leading-6 text-ink-950">
                Hay {expiringReservationsCount} reserva(s) con menos de 5 minutos antes de expirar.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              radius="xl"
              className="border-[rgba(140,40,20,0.18)] bg-white/80 px-4 py-2 text-sm text-ink-950"
              onClick={() => onSelectSection("orders")}
            >
              Revisar ahora
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Pill type="button" onClick={() => onSelectSection("products")} active={section === "products"} variant="admin">
          Productos
        </Pill>
        <Pill type="button" onClick={onStartForm} active={section === "form"} variant="admin">
          Nuevo / Editar
        </Pill>
        <Pill type="button" onClick={() => onSelectSection("report")} active={section === "report"} variant="admin">
          Informe
        </Pill>
        <Pill type="button" onClick={() => onSelectSection("orders")} active={section === "orders"} variant="admin">
          <span>Ordenes</span>
          {expiringReservationsCount > 0 ? (
            <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-[rgb(140,40,20)] px-2 py-0.5 text-[11px] font-semibold text-white">
              {expiringReservationsCount}
            </span>
          ) : null}
        </Pill>
        <Pill type="button" onClick={() => onSelectSection("reviews")} active={section === "reviews"} variant="admin">
          Reseñas
        </Pill>
      </div>
    </AdminPanel>
  )
}
