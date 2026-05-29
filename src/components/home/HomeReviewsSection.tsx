import type { Review } from "@/lib/perfumeStore"
import { Container } from "@/components/ui/Container"
import { LazyReveal } from "@/components/ui/LazyReveal"
import { Card, Surface } from "@/components/ui/Surface"
import { ZoomableImage } from "@/components/reviews/ZoomableImage"
import { ReviewCarouselLazy } from "@/components/reviews/ReviewCarouselLazy"
import { ReviewWriteEntry } from "@/components/reviews/ReviewWriteEntry"
import { formatCustomerDisplayName, getInitials } from "@/lib/text"
import { formatReviewSnippet, type ReviewCarouselItem } from "@/lib/reviews"
import { StarRating } from "@/components/ui/StarRating"

const reviewDateFormatter = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City" })

export function HomeReviewsSection({
  reviews,
  carouselItems,
  ratingCount,
  avgRatingLabel,
  roundedStars
}: {
  reviews: Review[]
  carouselItems: ReviewCarouselItem[]
  ratingCount: number
  avgRatingLabel: string
  roundedStars: number
}) {
  return (
    <section className="border-t border-black/6 bg-white">
      <Container className="py-16 pt-24">
        <div className="space-y-8">
          <div className="mb-6">
            <p className="text-xs tracking-section text-ink-500">RESEÑAS</p>
            <h2 className="mt-3 font-display text-2xl leading-display text-ink-950">Lo que dicen nuestros clientes</h2>
            {ratingCount ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StarRating value={roundedStars} className="text-base leading-none text-goldSoft" ariaLabel={`${avgRatingLabel} de 5`} />
                <p className="text-xs text-ink-600">
                  {avgRatingLabel} <span className="text-ink-400">·</span> {ratingCount}{" "}
                  {ratingCount === 1 ? "experiencia compartida" : "experiencias compartidas"}
                </p>
              </div>
            ) : null}
            <p className="mt-3 text-sm text-ink-700">Cuéntanos qué tan satisfech@ estás con tu compra en M A L O parfums</p>
          </div>

          {carouselItems.length ? (
            <Surface variant="solid" radius="luxe-xl" className="relative overflow-hidden shadow-sheet">
              <div className="pointer-events-none absolute inset-0 bg-home-reviews-surface" />
              <div className="relative">
                <ReviewCarouselLazy items={carouselItems} />
              </div>
            </Surface>
          ) : null}
          <div className="mt-10 mb-12 flex justify-start">
            <ReviewWriteEntry />
          </div>

          <div className="mt-2 grid gap-4">
            {reviews.map((r, idx) => {
              const starsValue = Math.max(0, Math.min(5, r.rating ?? 0))
              const displayName = formatCustomerDisplayName(r.customerName)
              const text = formatReviewSnippet(r.text, 220)
              const deliveryStatus =
                r.deliveryCondition === "perfect"
                  ? "Llegó perfecto"
                  : r.deliveryCondition === "box_damaged"
                    ? "Caja dañada"
                    : r.deliveryCondition === "leak"
                      ? "Derrame / fuga"
                      : r.deliveryCondition === "other"
                        ? "Entrega con detalle"
                        : ""
              const deliveryImages = (
                r.deliveryImageSrcs?.length ? r.deliveryImageSrcs : r.deliveryImageSrc ? [r.deliveryImageSrc] : []
              ).slice(0, 5)
              const dateLabel = reviewDateFormatter.format(new Date(r.at))
              const metaLabel = `${displayName} • ${dateLabel} • Entrega confirmada`

              return (
                <LazyReveal key={r.id} delayMs={Math.min(idx, 8) * 55} className="w-full">
                  <Card className="group w-full px-6 py-6 transition-transform transition-shadow hover:-translate-y-0.5 hover:shadow-review-hover sm:px-7 sm:py-7">
                    <div className="grid gap-4 md:grid-cols-[240px_1fr] md:gap-8">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-antiqueGoldMuted/55 font-display text-ui-md font-medium tracking-wide text-ink-950 ring-1 ring-inset ring-black/8">
                            {getInitials(r.customerName)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-display text-lg font-semibold text-ink-950">{displayName}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-400">
                              <span>{dateLabel}</span>
                              {r.rating ? (
                                <StarRating value={starsValue} className="text-ui-md leading-none text-goldSoft" ariaLabel={`${starsValue} de 5`} />
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0 pt-1">
                        <div className="space-y-2">
                          {text ? <p className="whitespace-pre-wrap text-base text-ink-800">{text}</p> : null}

                          {r.deliveryCondition || r.deliveryNotes || deliveryImages.length ? (
                            <div className="space-y-2">
                              {deliveryStatus ? (
                                <div className="space-y-1">
                                  <p className="text-sm font-medium text-ink-950">{deliveryStatus}</p>
                                  <p className="text-ui-xs tracking-kicker text-ink-400/90">ENTREGA CONFIRMADA</p>
                                </div>
                              ) : (
                                <p className="text-ui-xs tracking-kicker text-ink-400/90">ENTREGA CONFIRMADA</p>
                              )}
                              {r.deliveryNotes ? (
                                <p className="text-xs text-ink-700">
                                  <span className="text-ink-400">Detalles:</span> {r.deliveryNotes}
                                </p>
                              ) : null}
                              {deliveryImages.length ? (
                                <div className="pt-2">
                                  <div className="scrollbar-none flex max-w-full snap-x snap-mandatory gap-3 overflow-x-auto pb-1 pr-6">
                                    {deliveryImages.map((src, imageIdx) => {
                                      const itemClass =
                                        deliveryImages.length === 1 ? "w-full max-w-delivery-single" : "w-thumb sm:w-thumb-sm"
                                      return (
                                        <ZoomableImage
                                          key={src}
                                          src={src}
                                          alt="Foto de cómo llegó el producto"
                                          sizes={
                                            deliveryImages.length === 1
                                              ? "(max-width: 768px) 90vw, 520px"
                                              : "(max-width: 768px) 55vw, 184px"
                                          }
                                          meta={metaLabel}
                                          gallery={{
                                            items: deliveryImages.map((s) => ({
                                              src: s,
                                              alt: "Foto de cómo llegó el producto",
                                              meta: metaLabel
                                            })),
                                            index: imageIdx
                                          }}
                                          wrapperClassName={
                                            "group relative shrink-0 snap-start overflow-hidden rounded-ui border border-black/8 bg-white flex-shrink-0 transition-shadow duration-700 ease-out hover:shadow-thumb-hover " +
                                            itemClass
                                          }
                                          frameClassName="relative aspect-[16/9] w-full bg-ink-50"
                                          imageClassName="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                                          dialogImageClassName="object-contain"
                                        />
                                      )
                                    })}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </Card>
                </LazyReveal>
              )
            })}
          </div>
        </div>
      </Container>
    </section>
  )
}
