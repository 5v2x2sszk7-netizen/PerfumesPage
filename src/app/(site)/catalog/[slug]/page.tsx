import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Container } from "@/components/ui/Container"
import { ButtonExternal } from "@/components/ui/Button"
import { PurchaseActions } from "@/components/cart/PurchaseActions"
import { availabilityLabel, buildWhatsAppLink, formatPerfumeWhatsAppMessage, formatPrice } from "@/lib/whatsapp"
import { readSellablePerfumes } from "@/lib/checkout/reservations"
import { readPerfumes, readPerfumesCached } from "@/lib/perfumeStore"
import { LazyReveal } from "@/components/ui/LazyReveal"
import { guessOlfactoryFamily, splitSentences } from "@/lib/editorialLogic"
import { Badge, availabilityBadgeTone } from "@/components/ui/Badge"
import type { Perfume } from "@/types/perfume"
import { PerfumeImageGallery } from "@/components/perfume/PerfumeImageGallery"

export const revalidate = 60

function resolvePerfume(perfumes: Perfume[], rawSlug: string) {
  const slug = decodeURIComponent(rawSlug).trim()
  return (
    perfumes.find((p) => p.slug === slug) ??
    perfumes.find((p) => p.id === slug) ??
    perfumes.find((p) => p.id.startsWith(`${slug}-`))
  )
}

export async function generateStaticParams() {
  const perfumes = await readPerfumes()
  return perfumes.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug: rawSlug } = await params
  const perfumes = await readPerfumesCached()
  const perfume = resolvePerfume(perfumes, rawSlug)
  if (!perfume) return {}

  const title = `${perfume.name} · ${perfume.brand}`
  const description = `${perfume.brand} · ${perfume.name} · ${perfume.sizeMl} ml. ${perfume.description}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: (perfume.imageGallery?.length ? perfume.imageGallery : [perfume.imageSrc]).map((url) => ({ url }))
    }
  }
}

function AvailabilityPanel({
  perfume,
  concentration,
  availabilityEditorial,
  stockLabel
}: {
  perfume: Perfume
  concentration: string
  availabilityEditorial: string
  stockLabel: string
}) {
  return (
    <div className="w-full max-w-full overflow-hidden rounded-luxe border border-black/8 bg-white px-4 py-4 shadow-panel sm:px-5 sm:py-5">
      <p className="text-ui-xs font-medium tracking-section text-ink-500">DISPONIBILIDAD</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-[1.6rem] leading-[1.02] text-ink-950 sm:text-[1.9rem] sm:leading-[1.02]">
            {availabilityEditorial}
          </p>
          <p className="mt-1 text-[13px] tracking-wide text-ink-700 sm:text-[13px]">
            {perfume.sizeMl} ml <span className="text-ink-400">·</span> {concentration}
          </p>
        </div>
        <Badge
          size="sm"
          className="shrink-0 px-3 py-1.5 text-[11px] tracking-[0.04em] text-ink-950 sm:px-3.5 sm:py-1.5 sm:text-[11px]"
        >
          {stockLabel}
        </Badge>
      </div>

      <div className="mt-4 border-t border-black/6 pt-3">
        <p className="text-[10px] font-medium tracking-section text-ink-500">PRECIO</p>
        <p className="mt-1 font-display text-[1.9rem] leading-[1.02] text-ink-950 sm:text-[2.15rem] sm:leading-[1.02]">
          {formatPrice(perfume.price)}
        </p>
      </div>
    </div>
  )
}

function DetailsSection({
  perfume,
  concentration,
  family
}: {
  perfume: Perfume
  concentration: string
  family: string
}) {
  return (
    <section>
      <Container className="py-10 sm:py-14">
        <div className="grid min-w-0 gap-6 lg:grid-cols-3">
          <LazyReveal delayMs={0} className="min-w-0 lg:col-span-1">
            <div className="w-full max-w-full overflow-hidden rounded-luxe border border-black/8 bg-white p-6 shadow-panel">
              <p className="text-xs tracking-section text-ink-500">DETALLES</p>
              <div className="mt-5 grid gap-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs tracking-ui text-ink-500">TAMAÑO</p>
                  <p className="text-sm font-medium text-ink-950">{perfume.sizeMl} ml</p>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs tracking-ui text-ink-500">CONCENTRACIÓN</p>
                  <p className="text-sm font-medium text-ink-950">{concentration}</p>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs tracking-ui text-ink-500">FAMILIA</p>
                  <p className="text-sm font-medium text-ink-950">{family}</p>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs tracking-ui text-ink-500">ESTATUS</p>
                  <p className="text-sm font-medium text-ink-950">{availabilityLabel[perfume.availability]}</p>
                </div>
              </div>
            </div>
          </LazyReveal>

          <LazyReveal delayMs={120} className="min-w-0 lg:col-span-2">
            <div className="w-full max-w-full overflow-hidden rounded-luxe border border-black/8 bg-white p-7 shadow-panel">
              <p className="text-xs tracking-section text-ink-500">NOTAS OLFATIVAS</p>
              <div className="mt-6 grid max-w-3xl gap-y-6 sm:grid-cols-3 sm:gap-x-8">
                <div className="space-y-3">
                  <p className="text-xs tracking-ui text-ink-500">SALIDA</p>
                  <p className="text-sm text-ink-800">{perfume.notes?.top?.join(" · ") || "—"}</p>
                </div>
                <div className="space-y-3">
                  <p className="text-xs tracking-ui text-ink-500">CORAZÓN</p>
                  <p className="text-sm text-ink-800">{perfume.notes?.heart?.join(" · ") || "—"}</p>
                </div>
                <div className="space-y-3">
                  <p className="text-xs tracking-ui text-ink-500">FONDO</p>
                  <p className="text-sm text-ink-800">{perfume.notes?.base?.join(" · ") || "—"}</p>
                </div>
              </div>
            </div>
          </LazyReveal>
        </div>
      </Container>
    </section>
  )
}

export default async function PerfumeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params
  const perfumes = await readSellablePerfumes()
  const perfume = resolvePerfume(perfumes, rawSlug)
  if (!perfume) notFound()

  const message = formatPerfumeWhatsAppMessage(perfume)
  const waHref = buildWhatsAppLink(message)
  const concentration = perfume.concentration?.trim() || "Eau de Parfum"
  const family = guessOlfactoryFamily({ description: perfume.description, notes: perfume.notes })
  const { headline, rest } = splitSentences(perfume.description)
  const availabilityEditorial =
    perfume.availability === "low_stock"
      ? "Disponibilidad limitada"
      : perfume.availability === "out_of_stock"
        ? "Actualmente agotado"
        : "Disponible"
  const stockLabel =
    perfume.stock <= 0 ? "Agotado" : perfume.stock === 1 ? "Queda 1 pieza" : `Quedan ${perfume.stock} piezas`
  const galleryImages = perfume.imageGallery?.length ? perfume.imageGallery : [perfume.imageSrc]

  return (
    <div className="w-full max-w-full overflow-x-clip">
      <section className="border-b border-black/6 bg-white/70">
        <Container className="py-5 pb-10 sm:py-14">
          <LazyReveal>
            <div className="flex items-center gap-3">
              <Link href="/catalog" className="text-sm text-ink-600 transition hover:text-ink-950">
                Volver al catálogo
              </Link>
            </div>
          </LazyReveal>

          <div className="mt-5 grid min-w-0 gap-7 lg:mt-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-start lg:gap-10">
            <LazyReveal delayMs={0} className="min-w-0 max-w-full">
              <PerfumeImageGallery images={galleryImages} alt={`${perfume.name} de ${perfume.brand}`} />
            </LazyReveal>

            <LazyReveal delayMs={120} className="min-w-0 max-w-full">
              <div className="min-w-0 max-w-full overflow-hidden space-y-5 sm:space-y-8">
                <div>
                  <p className="text-xs tracking-section text-ink-500">{perfume.brand}</p>
                  <h1 className="mt-2 max-w-full break-words font-display text-[2.45rem] leading-[0.95] text-ink-950 [overflow-wrap:anywhere] sm:text-5xl">
                    {perfume.name}
                  </h1>

                  <div className="mt-4 flex max-w-full flex-wrap gap-2 sm:mt-5 sm:gap-x-2 sm:gap-y-2">
                    <Badge className="max-w-full whitespace-normal px-3 py-1 text-center text-[10px] leading-tight tracking-[0.12em] sm:px-4 sm:py-1.5 sm:text-ui-2xs sm:tracking-kicker">{concentration}</Badge>
                    <Badge className="max-w-full whitespace-normal px-3 py-1 text-center text-[10px] leading-tight tracking-[0.12em] sm:px-4 sm:py-1.5 sm:text-ui-2xs sm:tracking-kicker">{family}</Badge>
                    <Badge className="max-w-full whitespace-normal px-3 py-1 text-center text-[10px] leading-tight tracking-[0.12em] sm:px-4 sm:py-1.5 sm:text-ui-2xs sm:tracking-kicker">{perfume.sizeMl} ml</Badge>
                    <Badge tone={availabilityBadgeTone(perfume.availability)} className="max-w-full whitespace-normal px-3 py-1 text-center text-[10px] leading-tight tracking-[0.12em] sm:px-4 sm:py-1.5 sm:text-ui-2xs sm:tracking-kicker">{availabilityLabel[perfume.availability]}</Badge>
                  </div>
                </div>

                <AvailabilityPanel
                  perfume={perfume}
                  concentration={concentration}
                  availabilityEditorial={availabilityEditorial}
                  stockLabel={stockLabel}
                />

                <div className="space-y-3">
                  <PurchaseActions perfume={perfume} />

                  <div className="flex flex-wrap gap-3">
                    <ButtonExternal
                      href={waHref}
                      target="_blank"
                      rel="noreferrer"
                      variant="soft"
                      className="group w-full justify-between border border-black/8 bg-ink-50/65 text-ink-800 transition-luxe duration-luxe ease-luxe hover:-translate-y-0.5 hover:bg-white sm:w-auto"
                    >
                      <span className="inline-flex items-center gap-2">
                        <span>Solicitar por WhatsApp</span>
                        <span className="text-ink-600 transition-transform duration-luxe ease-luxe group-hover:translate-x-0.5">
                          →
                        </span>
                      </span>
                    </ButtonExternal>
                  </div>
                </div>

                <div>
                  {headline ? (
                    <p className="max-w-xl break-words font-display text-[1.7rem] leading-[1.05] text-ink-950 [overflow-wrap:anywhere] sm:text-2xl sm:leading-display">
                      {headline}
                    </p>
                  ) : null}
                  {rest ? <p className="mt-3 max-w-xl break-words text-[14px] leading-7 text-ink-700 [overflow-wrap:anywhere] sm:text-sm sm:leading-body">{rest}</p> : null}
                </div>
              </div>
            </LazyReveal>
          </div>
        </Container>
      </section>

      <DetailsSection perfume={perfume} concentration={concentration} family={family} />
    </div>
  )
}
