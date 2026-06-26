import { Button } from "@/components/ui/Button"
import { Input, Label, Textarea } from "@/components/ui/Field"
import { Card } from "@/components/ui/Surface"
import type { Dispatch, RefObject, SetStateAction } from "react"
import type { Review, ReviewDraft } from "@/lib/admin/types"
import { AdminImagePicker } from "@/features/admin/components/AdminImagePicker"
import { AdminPanel } from "@/features/admin/components/AdminPanel"

const adminReviewDateFormatter = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City" })

type Props = {
  reviews: Review[]
  reviewDraft: ReviewDraft
  setReviewDraft: Dispatch<SetStateAction<ReviewDraft>>
  busy: boolean
  reviewUploading: boolean
  reviewUploadedPath: string | null
  reviewSelectedFileName: string | null
  reviewLocalPreviewUrl: string | null
  reviewFileInputRef: RefObject<HTMLInputElement | null>
  onUploadReview: (file: File) => void
  onCreateReview: () => void
  onDeleteReview: (review: Review) => void
}

export function ReviewsSection({
  reviews,
  reviewDraft,
  setReviewDraft,
  busy,
  reviewUploading,
  reviewUploadedPath,
  reviewSelectedFileName,
  reviewLocalPreviewUrl,
  reviewFileInputRef,
  onUploadReview,
  onCreateReview,
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

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-display text-xl text-ink-950">Añadir reseña</h3>
          <div className="mt-4 grid gap-4">
            <div className="grid gap-2">
              <Label>Nombre del cliente *</Label>
              <Input
                value={reviewDraft.customerName}
                onChange={(e) => setReviewDraft((d) => ({ ...d, customerName: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Calificación (1–5)</Label>
              <Input
                inputMode="numeric"
                placeholder="Ej. 5"
                value={reviewDraft.rating}
                onChange={(e) => setReviewDraft((d) => ({ ...d, rating: e.target.value.replace(/[^\d]/g, "") }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Reseña *</Label>
              <Textarea value={reviewDraft.text} onChange={(e) => setReviewDraft((d) => ({ ...d, text: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <AdminImagePicker
                label="Imagen (captura)"
                value={reviewDraft.imageSrc}
                onChange={(next) => setReviewDraft((d) => ({ ...d, imageSrc: next }))}
                placeholder="/uploads/tu-reseña.jpg"
                busy={busy}
                uploading={reviewUploading}
                uploadedPath={reviewUploadedPath}
                selectedFileName={reviewSelectedFileName}
                localPreviewUrl={reviewLocalPreviewUrl}
                inputRef={reviewFileInputRef}
                accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
                helpEmpty="Sube una captura para el carrusel del Home."
                onUpload={onUploadReview}
              />
            </div>

            <Button
              type="button"
              onClick={onCreateReview}
              disabled={busy || !reviewDraft.customerName.trim() || !reviewDraft.text.trim()}
              variant="gold"
              className="w-full hover:shadow-cta-hover sm:w-auto"
            >
              Guardar reseña
            </Button>
          </div>
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
