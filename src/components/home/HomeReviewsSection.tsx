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
import { SectionHeader } from "@/components/ui/SectionHeader"

const reviewDateFormatter = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City" })

function deliveryStatusLabel(condition: Review["deliveryCondition"] | undefined) {
  if (condition === "perfect") return "Llegó perfecto"
  if (condition === "box_damaged") return "Caja dañada"
  if (condition === "leak") return "Derrame / fuga"
  if (condition === "other") return "Entrega con detalle"
  return ""
}

function DeliveryGallery({ images, metaLabel }: { images: string[]; metaLabel: string }) {
  if (!images.length) return null
  return (
    <div className="pt-2">
      <div className="scrollbar-none flex max-w-full snap-x snap-mandatory gap-3 overflow-x-auto pb-1 pr-6">
        {images.map((src, imageIdx) => {
          const itemClass = images.length === 1 ? "w-full max-w-delivery-single" : "w-thumb sm:w-thumb-sm"
          return (
            <ZoomableImage
              key={src}
              src={src}
              alt="Foto de cómo llegó el producto"
              sizes={images.length === 1 ? "(max-width: 768px) 90vw, 520px" : "(max-width: 768px) 55vw, 184px"}
              meta={metaLabel}
              gallery={{
                items: images.map((s) => ({
                  src: s,
                  alt: "Foto de cómo llegó el producto",
                  meta: metaLabel
                })),
                index: imageIdx
              }}
              wrapperClassName={
                "group relative shrink-0 snap-start overflow-hidden rounded-ui border border-black/8 bg-white flex-shrink-0 transition-shadow duration-luxe-fast ease-out hover:shadow-thumb-hover " +
                itemClass
              }
              frameClassName="relative aspect-[16/9] w-full bg-ink-50"
              imageClassName="object-cover transition-transform duration-luxe-fast ease-out group-hover:scale-[1.03]"
              dialogImageClassName="object-contain"
            />
          )
        })}
      </div>
    </div>
  )
}

function ReviewCardItem({ review, delayMs, animate }: { review: Review; delayMs: number; animate: boolean }) {
  const starsValue = Math.max(0, Math.min(5, review.rating ?? 0))
  const displayName = formatCustomerDisplayName(review.customerName)
  const text = formatReviewSnippet(review.text, 220)
  const status = deliveryStatusLabel(review.deliveryCondition)
  const deliveryImages = (
    review.deliveryImageSrcs?.length ? review.deliveryImageSrcs : review.deliveryImageSrc ? [review.deliveryImageSrc] : []
  ).slice(0, 5)
  const dateLabel = reviewDateFormatter.format(new Date(review.at))
  const metaLabel = review.verifiedPurchase
    ? `${displayName} • ${dateLabel} • Compra verificada`
    : `${displayName} • ${dateLabel} • Entrega confirmada`

  const body = (
    <Card className="group w-full px-6 py-6 transition-transform transition-shadow hover:-translate-y-0.5 hover:shadow-review-hover sm:px-7 sm:py-7">
      <div className="grid gap-4 md:grid-cols-[240px_1fr] md:gap-8">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-antiqueGoldMuted/55 font-display text-ui-md font-medium tracking-wide text-ink-950 ring-1 ring-inset ring-black/8">
              {getInitials(review.customerName)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold text-ink-950">{displayName}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-400">
                <span>{dateLabel}</span>
                {review.verifiedPurchase ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-antiqueGold/22 bg-antiqueGold/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-700">
                    <span className="text-[9px]">✓</span>
                    Compra verificada
                  </span>
                ) : null}
                {review.rating ? (
                  <StarRating value={starsValue} className="text-ui-md leading-none text-goldSoft" ariaLabel={`${starsValue} de 5`} />
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 pt-1">
          <div className="space-y-2">
            {text ? <p className="whitespace-pre-wrap text-base text-ink-800">{text}</p> : null}

            {review.deliveryCondition || review.deliveryNotes || deliveryImages.length ? (
              <div className="space-y-2">
                {status ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-ink-950">{status}</p>
                    <p className="text-ui-xs tracking-kicker text-ink-400/90">ENTREGA CONFIRMADA</p>
                  </div>
                ) : (
                  <p className="text-ui-xs tracking-kicker text-ink-400/90">ENTREGA CONFIRMADA</p>
                )}
                {review.deliveryNotes ? (
                  <p className="text-xs text-ink-700">
                    <span className="text-ink-400">Detalles:</span> {review.deliveryNotes}
                  </p>
                ) : null}
                <DeliveryGallery images={deliveryImages} metaLabel={metaLabel} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  )

  if (!animate) return <div className="w-full">{body}</div>

  return (
    <LazyReveal delayMs={delayMs} className="w-full">
      {body}
    </LazyReveal>
  )
}

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
            <SectionHeader
              kicker="RESEÑAS"
              title={<h2>Lo que dicen nuestros clientes</h2>}
              className="gap-0"
              titleClassName="mt-3 text-2xl"
            />
            {ratingCount ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StarRating value={roundedStars} className="text-base leading-none text-goldSoft" ariaLabel={`${avgRatingLabel} de 5`} />
                <p className="text-xs text-ink-600">
                  {avgRatingLabel} <span className="text-ink-400">·</span> {ratingCount}{" "}
                  {ratingCount === 1 ? "experiencia compartida" : "experiencias compartidas"}
                </p>
              </div>
            ) : null}
            <p className="mt-3 text-sm text-ink-700">Cuéntanos qué tan satisfech@ estás con tu compra en M A L O Fragances</p>
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
            {reviews.map((review, idx) => {
              const animate = idx < 10
              return <ReviewCardItem key={review.id} review={review} delayMs={idx * 55} animate={animate} />
            })}
          </div>
        </div>
      </Container>
    </section>
  )
}
