import { Container } from "@/components/ui/Container"
import { ButtonLink } from "@/components/ui/Button"
import Image from "next/image"
import Link from "next/link"
import { readPerfumes, readReviews } from "@/lib/perfumeStore"
import { formatPrice } from "@/lib/whatsapp"
import { ReviewCarousel } from "@/components/reviews/ReviewCarousel"
import { ReviewWriteModal } from "@/components/reviews/ReviewWriteModal"
import { ZoomableImage } from "@/components/reviews/ZoomableImage"
import { LazyReveal } from "@/components/ui/LazyReveal"
import { Surface } from "@/components/ui/Surface"
import { formatCustomerDisplayName, getInitials } from "@/lib/text"
import type { Perfume } from "@/types/perfume"
import type { CSSProperties } from "react"

export const revalidate = 60

function formatReviewSnippet(text: string) {
  const trimmed = text.trim()
  const lettersOnly = trimmed.toLowerCase().replace(/[^a-záéíóúüñ]+/g, "")
  const uniqueLetters = new Set(lettersOnly.split(""))
  const looksLikeNoise = lettersOnly.length >= 10 && uniqueLetters.size > 0 && uniqueLetters.size <= 2
  const base = looksLikeNoise ? "" : trimmed
  if (!base) return ""
  return base.length > 220 ? `${base.slice(0, 220).trimEnd()}…` : base
}

type Review = Awaited<ReturnType<typeof readReviews>>[number]

function HeroSection() {
  const noiseStyle = {
    ["--noise-size" as never]: "280px 280px",
    ["--noise-opacity" as never]: "0.045"
  } satisfies CSSProperties

  return (
    <section className="relative h-home-hero overflow-hidden border-b border-black/6 bg-white sm:h-home-hero-sm lg:h-home-hero-lg">
      <Image
        src="/images/MaloParfumsHome.jpg"
        alt="MALO Parfums"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="pointer-events-none absolute inset-0 bg-home-hero-overlay-1" />
      <div className="pointer-events-none absolute inset-0 bg-home-hero-overlay-2 opacity-45 mix-blend-soft-light" />
      <div className="pointer-events-none absolute inset-0 bg-home-hero-overlay-3 opacity-50 mix-blend-overlay" />
      <div className="pointer-events-none absolute inset-0 bg-home-hero-overlay-4 opacity-32 mix-blend-soft-light" />
      <div className="pointer-events-none absolute inset-0 bg-home-hero-overlay-5" />
      <div className="pointer-events-none absolute inset-0 noise-overlay mix-blend-overlay" style={noiseStyle} />
    </section>
  )
}

function FeaturedSection({ featured }: { featured: Perfume[] }) {
  return (
    <section className="relative bg-white">
      <Container className="pt-14 pb-16 sm:pt-16 sm:pb-20">
        <div className="max-w-home-hero">
          <p className="text-xs tracking-brand text-ink-500">AGREGADOS RECIENTEMENTE</p>
          <h2 className="mt-4 font-display text-2xl leading-[0.95] text-ink-950">Nuevas incorporaciones</h2>

          <div className="mt-8 grid grid-cols-1 gap-4">
            {featured.map((p, idx) => (
              <LazyReveal key={p.id} className="w-full" delayMs={idx * 120}>
                <Link
                  href={`/catalog/${p.slug}`}
                  className="group relative block w-full max-w-featured-card [transform:translateZ(0)] overflow-hidden rounded-2xl bg-white p-3 no-underline ring-1 ring-inset ring-black/8 transition-luxe duration-luxe ease-luxe hover:ring-black/10 hover:shadow-home-featured-hover motion-safe:hover:-translate-y-0.5 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-antiqueGold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  <div className="pointer-events-none absolute inset-0 bg-home-featured-hover-glow opacity-0 transition-opacity duration-luxe-slow ease-luxe group-hover:opacity-100" />
                  <div className="relative aspect-[5/6] overflow-hidden rounded-xl bg-ink-50 ring-1 ring-inset ring-black/8">
                    <div className="pointer-events-none absolute inset-0 bg-home-featured-media-glow opacity-80" />
                    <Image
                      src={p.imageSrc}
                      alt={`${p.name} de ${p.brand}`}
                      fill
                      className="object-cover transition-luxe-media duration-luxe ease-luxe group-hover:scale-[1.02]"
                      sizes="(max-width: 768px) 80vw, 360px"
                      priority={false}
                    />
                  </div>
                  <p className="relative mt-4 text-xs tracking-ui text-ink-500">{p.brand}</p>
                  <p className="relative mt-1 font-display text-base text-ink-950">{p.name}</p>
                  <div className="relative mt-3 flex items-center justify-between gap-3">
                    <span className="text-sm text-ink-700">{p.sizeMl} ml</span>
                    <span className="text-sm font-medium text-ink-950">{formatPrice(p.price)}</span>
                  </div>
                </Link>
              </LazyReveal>
            ))}
          </div>

          <div className="mt-8 flex justify-start">
            <ButtonLink
              href="/catalog"
              variant="soft"
              className="bg-ink-50/80 text-ink-950 ring-black/10 shadow-sm hover:bg-white hover:shadow-home-soft-hover"
            >
              Ver todo
            </ButtonLink>
          </div>
        </div>
      </Container>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-home-section-bottom-fade" />
    </section>
  )
}

function ServiceSection() {
  const steps = [
    {
      number: "01",
      kicker: "EXPERIENCIA",
      title: "Compra asistida",
      body: "Recomendaciones, equivalencias y disponibilidad real antes de confirmar.",
      className: "group border-t border-black/6 pt-6"
    },
    {
      number: "02",
      kicker: "CONFIANZA",
      title: "Transparencia",
      body: "Tamaño, precio y estatus con lenguaje claro. Sin promesas vacías.",
      className: "group border-t border-black/6 pt-6 sm:pl-6 lg:translate-y-2"
    },
    {
      number: "03",
      kicker: "CATÁLOGO",
      title: "Pedidos especiales",
      body: "Si no está listado, lo buscamos: disponibilidad, opción y cotización.",
      className: "group border-t border-black/6 pt-6 sm:pl-10 lg:translate-y-4"
    }
  ] as const

  return (
    <section className="bg-transparent">
      <Container className="pt-12 pb-16">
        <div className="grid gap-y-8 gap-x-12 lg:grid-cols-12 lg:items-start">
          <LazyReveal delayMs={0} className="lg:col-span-5">
            <div className="max-w-home-intro">
              <p className="text-xs tracking-brand text-ink-500">SERVICIO</p>
              <h2 className="mt-4 font-display text-3xl leading-[0.95] text-ink-950 sm:text-4xl">
                Menos catálogo infinito. Más curaduría.
              </h2>
              <p className="mt-7 text-sm leading-[1.85] text-ink-700">
                Un proceso breve, claro y personal: elegimos contigo, confirmamos stock real y cuidamos el detalle antes
                de cerrar por WhatsApp.
              </p>
            </div>
          </LazyReveal>

          <div className="grid gap-8 lg:col-span-7 lg:gap-10">
            {steps.map((step, idx) => (
              <LazyReveal key={step.number} delayMs={120 + idx * 80}>
                <div className={step.className}>
                  <div className="grid gap-4 sm:grid-cols-[92px_1fr] sm:gap-7">
                    <p className="font-display text-4xl font-light leading-none text-black/35">{step.number}</p>
                    <div className="space-y-2">
                      <p className="text-xs tracking-section text-ink-500">{step.kicker}</p>
                      <h3 className="font-display text-2xl leading-[0.95] text-ink-950">{step.title}</h3>
                      <p className="text-sm leading-[1.85] text-ink-700">{step.body}</p>
                    </div>
                  </div>
                </div>
              </LazyReveal>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}

function ReviewsSection({
  reviews,
  carouselItems,
  ratingCount,
  avgRatingLabel,
  roundedStars
}: {
  reviews: Review[]
  carouselItems: Array<{ src: string; alt: string; customerName: string; rating?: number; text: string }>
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
            <h2 className="mt-3 font-display text-2xl leading-[0.95] text-ink-950">Lo que dicen nuestros clientes</h2>
            {ratingCount ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 text-base leading-none text-goldSoft">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i}>{i < roundedStars ? "★" : "☆"}</span>
                  ))}
                </div>
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
                <ReviewCarousel items={carouselItems} />
              </div>
            </Surface>
          ) : null}
          <div className="mt-10 mb-12 flex justify-start">
            <ReviewWriteModal />
          </div>

          <div className="mt-2 grid gap-4">
            {reviews.map((r, idx) => {
              const starsValue = Math.max(0, Math.min(5, r.rating ?? 0))
              const displayName = formatCustomerDisplayName(r.customerName)
              const text = formatReviewSnippet(r.text)
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
              const dateLabel = new Date(r.at).toLocaleDateString("es-MX")
              const metaLabel = `${displayName} • ${dateLabel} • Entrega confirmada`

              return (
                <LazyReveal key={r.id} delayMs={Math.min(idx, 8) * 55} className="w-full">
                  <div className="group w-full rounded-3xl border border-black/8 bg-white px-6 py-6 transition-transform transition-shadow hover:-translate-y-0.5 hover:shadow-review-hover sm:px-7 sm:py-7">
                    <div className="grid gap-4 md:grid-cols-[240px_1fr] md:gap-8">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-antiqueGoldMuted/55 font-display text-ui-md font-medium tracking-wide text-ink-950 ring-1 ring-inset ring-black/8">
                            {getInitials(r.customerName)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-display text-lg font-semibold text-ink-950">{displayName}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                              <span>{dateLabel}</span>
                              {r.rating ? (
                                <span className="flex items-center gap-1 text-ui-md leading-none text-goldSoft">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <span key={i}>{i < starsValue ? "★" : "☆"}</span>
                                  ))}
                                </span>
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
                                  <p className="text-ui-xs tracking-kicker text-neutral-400/90">ENTREGA CONFIRMADA</p>
                                </div>
                              ) : (
                                <p className="text-ui-xs tracking-kicker text-neutral-400/90">ENTREGA CONFIRMADA</p>
                              )}
                              {r.deliveryNotes ? (
                                <p className="text-xs text-ink-700">
                                  <span className="text-neutral-400">Detalles:</span> {r.deliveryNotes}
                                </p>
                              ) : null}
                              {deliveryImages.length ? (
                                <div className="pt-2">
                                  <div className="scrollbar-none flex max-w-full snap-x snap-mandatory gap-3 overflow-x-auto pb-1 pr-6">
                                    {deliveryImages.map((src, imageIdx) => {
                                      const itemClass =
                                        deliveryImages.length === 1
                                          ? "w-full max-w-delivery-single"
                                          : "w-[160px] sm:w-[172px]"
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
                                            "group relative shrink-0 snap-start overflow-hidden rounded-2xl border border-black/8 bg-white flex-shrink-0 transition-shadow duration-700 ease-out hover:shadow-thumb-hover " +
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
                  </div>
                </LazyReveal>
              )
            })}
          </div>
        </div>
      </Container>
    </section>
  )
}

export default async function HomePage() {
  const perfumes = (await readPerfumes()).filter((p) => (p.stock ?? 0) > 0)
  const featured = perfumes.slice(0, 3)
  const reviews = await readReviews()
  const carouselItems = reviews
    .filter((r) => Boolean(r.imageSrc))
    .slice(0, 12)
    .map((r) => ({
      src: r.imageSrc!,
      alt: `Reseña de ${r.customerName}`,
      customerName: r.customerName,
      rating: r.rating,
      text:
        r.text.length > 180
          ? `${r.text.slice(0, 180).trimEnd()}…`
          : r.text
    }))
  const ratedReviews = reviews.filter((r) => typeof r.rating === "number" && r.rating > 0)
  const ratingCount = ratedReviews.length
  const avgRating = ratingCount
    ? ratedReviews.reduce((acc, r) => acc + (r.rating ?? 0), 0) / ratingCount
    : 0
  const avgRatingLabel = avgRating ? avgRating.toFixed(1) : ""
  const roundedStars = Math.max(0, Math.min(5, Math.round(avgRating)))

  return (
    <div>
      <HeroSection />
      <FeaturedSection featured={featured} />
      <ServiceSection />
      <ReviewsSection
        reviews={reviews}
        carouselItems={carouselItems}
        ratingCount={ratingCount}
        avgRatingLabel={avgRatingLabel}
        roundedStars={roundedStars}
      />
    </div>
  )
}
