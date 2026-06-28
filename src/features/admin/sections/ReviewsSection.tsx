import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Surface"
import type { Review } from "@/lib/admin/types"
import { AdminPanel } from "@/features/admin/components/AdminPanel"

const adminReviewDateFormatter = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City" })

type Props = {
  reviews: Review[]
  busy: boolean
  onDeleteReview: (review: Review) => void
}

export function ReviewsSection({
  reviews,
  busy,
  onDeleteReview
}: Props) {
  return (
    <AdminPanel className="p-2 sm:p-3" innerClassName="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs tracking-section text-ink-500">RESEÑAS</p>
          <h2 className="font-display text-xl text-ink-950 sm:text-2xl">Clientes</h2>
        </div>
        <p className="text-sm text-ink-600">
          {reviews.length} {reviews.length === 1 ? "reseña" : "reseñas"}
        </p>
      </div>

      <div className="mt-4 grid gap-4">
        <Card className="border-black/8 bg-ink-50/45 p-5">
          <p className="text-xs tracking-section text-ink-500">POLÍTICA</p>
          <h3 className="mt-2 font-display text-xl text-ink-950">Creación restringida</h3>
          <p className="mt-2 text-sm leading-6 text-ink-700">
            Las reseñas solo pueden publicarse desde una cuenta con compra verificada. Desde el panel admin puedes revisar y eliminar registros
            existentes, pero ya no crear reseñas manuales.
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-xl text-ink-950">Listado</h3>
            <p className="text-sm text-ink-600">
              {reviews.length ? `${reviews.length} registro(s)` : "Sin reseñas todavía"}
            </p>
          </div>
          <div className="mt-4 grid gap-3">
            {reviews.map((r) => (
              <Card
                key={r.id}
                radius="lg"
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5"
              >
                <div className="min-w-0">
                  <p className="text-xs tracking-ui text-ink-500">CLIENTE</p>
                  <p className="truncate font-display text-lg text-ink-950">{r.customerName}</p>
                  <p className="mt-1 text-xs text-ink-500">{adminReviewDateFormatter.format(new Date(r.at))}</p>
                  {r.rating ? <p className="mt-2 text-xs text-ink-700">{"★".repeat(r.rating)}</p> : null}
                  <p className="mt-2 text-sm leading-6 text-ink-700">{r.text}</p>
                  {r.imageSrc ? <p className="mt-2 text-xs break-all text-ink-500">{r.imageSrc}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="danger"
                    radius="xl"
                    className="px-4 py-2.5 text-sm"
                    onClick={() => onDeleteReview(r)}
                    disabled={busy}
                  >
                    Eliminar
                  </Button>
                </div>
              </Card>
            ))}
            {!reviews.length ? <p className="text-sm text-ink-600">Aún no hay reseñas.</p> : null}
          </div>
        </Card>
      </div>
    </AdminPanel>
  )
}
