import { Button, ButtonGhost } from "@/components/ui/Button"
import { Input, Label, Textarea } from "@/components/ui/Field"
import { UploadButton } from "@/components/ui/UploadButton"
import type { Dispatch, RefObject, SetStateAction } from "react"
import type { Review, ReviewDraft } from "@/lib/admin/types"
import Image from "next/image"

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
    <section className="rounded-luxe-xl bg-ink-50/60 p-3 ring-1 ring-inset ring-black/8 sm:p-5">
      <div className="rounded-3xl border border-black/8 bg-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs tracking-section text-ink-500">RESEÑAS</p>
            <h2 className="font-display text-2xl text-ink-950">Clientes</h2>
          </div>
          <p className="text-sm text-ink-600">{reviews.length} reseñas</p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-black/8 bg-white p-5">
            <h3 className="font-display text-xl text-ink-950">Añadir reseña</h3>
            <div className="mt-4 grid gap-4">
              <div className="grid gap-2">
                <Label>Nombre del cliente *</Label>
                <Input value={reviewDraft.customerName} onChange={(e) => setReviewDraft((d) => ({ ...d, customerName: e.target.value }))} />
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
                <Label>Imagen (captura)</Label>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <Input
                    placeholder="/uploads/tu-reseña.jpg"
                    value={reviewDraft.imageSrc}
                    onChange={(e) => setReviewDraft((d) => ({ ...d, imageSrc: e.target.value }))}
                  />
                  <UploadButton
                    inputRef={reviewFileInputRef}
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
                    disabled={busy}
                    onSelect={(files) => {
                      const f = files[0]
                      if (f) onUploadReview(f)
                    }}
                  >
                    {reviewUploading ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                        Subiendo...
                      </span>
                    ) : reviewUploadedPath || reviewSelectedFileName ? (
                      "Cambiar imagen"
                    ) : (
                      "Elegir imagen"
                    )}
                  </UploadButton>
                </div>
                <div className="grid gap-2 sm:grid-cols-[120px_1fr] sm:items-center">
                  <div className="h-24 w-24 overflow-hidden rounded-2xl border border-black/8 bg-ink-50">
                    {reviewLocalPreviewUrl || reviewDraft.imageSrc ? (
                      <Image
                        src={reviewLocalPreviewUrl ?? reviewDraft.imageSrc}
                        alt="Preview"
                        width={96}
                        height={96}
                        sizes="96px"
                        className="h-full w-full object-cover"
                        unoptimized={
                          Boolean(reviewLocalPreviewUrl) ||
                          (reviewDraft.imageSrc?.startsWith("data:") ?? false) ||
                          (reviewDraft.imageSrc?.startsWith("blob:") ?? false)
                        }
                      />
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    {reviewSelectedFileName ? <p className="text-xs text-ink-600">{reviewSelectedFileName}</p> : null}
                    {reviewUploadedPath ? <p className="text-xs text-ink-500">Subida: {reviewUploadedPath}</p> : null}
                    {!reviewSelectedFileName && !reviewUploadedPath ? (
                      <p className="text-xs text-ink-500">Sube una captura para el carrusel del Home.</p>
                    ) : null}
                  </div>
                </div>
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
          </div>

          <div className="rounded-3xl border border-black/8 bg-white p-5">
            <h3 className="font-display text-xl text-ink-950">Listado</h3>
            <div className="mt-4 grid gap-3">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col gap-3 rounded-2xl border border-black/8 bg-white p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-xs tracking-ui text-ink-500">CLIENTE</p>
                    <p className="truncate font-display text-lg text-ink-950">{r.customerName}</p>
                    <p className="mt-1 text-xs text-ink-500">{new Date(r.at).toLocaleDateString("es-MX")}</p>
                    {r.rating ? <p className="mt-2 text-xs text-ink-700">{"★".repeat(r.rating)}</p> : null}
                    <p className="mt-2 text-sm text-ink-700">{r.text}</p>
                    {r.imageSrc ? <p className="mt-2 text-xs text-ink-500">{r.imageSrc}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ButtonGhost
                      type="button"
                      className="rounded-xl border border-red-200 px-4 py-2.5 text-sm text-red-700 hover:bg-red-50"
                      onClick={() => onDeleteReview(r)}
                      disabled={busy}
                    >
                      Eliminar
                    </ButtonGhost>
                  </div>
                </div>
              ))}
              {!reviews.length ? <p className="text-sm text-ink-600">Aún no hay reseñas.</p> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
