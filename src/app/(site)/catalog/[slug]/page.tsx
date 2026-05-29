import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Container } from "@/components/ui/Container"
import { ButtonExternal } from "@/components/ui/Button"
import { availabilityLabel, buildWhatsAppLink, formatPerfumeWhatsAppMessage, formatPrice } from "@/lib/whatsapp"
import { readPerfumesCached } from "@/lib/perfumeStore"
import { LazyReveal } from "@/components/ui/LazyReveal"
import { guessOlfactoryFamily, renderDescription, splitSentences } from "@/lib/editorial"
import { Badge, availabilityBadgeTone } from "@/components/ui/Badge"
import type { Perfume } from "@/types/perfume"

export const revalidate = 60

function resolvePerfume(perfumes: Perfume[], rawSlug: string) {
  const slug = decodeURIComponent(rawSlug).trim()
  return (
    perfumes.find((p) => p.slug === slug) ??
    perfumes.find((p) => p.id === slug) ??
    perfumes.find((p) => p.id.startsWith(`${slug}-`))
  )
}

export async function generateMetadata({
  params
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const { slug: rawSlug } = params
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
      images: [{ url: perfume.imageSrc }]
    }
  }
}

export default async function PerfumeDetailPage({ params }: { params: { slug: string } }) {
  const { slug: rawSlug } = params
  const perfumes = await readPerfumesCached()
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
    (perfume.stock ?? 0) <= 0 ? "Agotado" : (perfume.stock ?? 0) === 1 ? "Queda 1 pieza" : `Quedan ${perfume.stock} piezas`

  return (
    <div>
      <section className="border-b border-black/6 bg-white/70">
        <Container className="py-10 sm:py-14">
          <LazyReveal>
            <div className="flex items-center gap-3">
              <Link href="/catalog" className="text-sm text-ink-600 transition hover:text-ink-950">
                Volver al catálogo
              </Link>
            </div>
          </LazyReveal>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
            <LazyReveal delayMs={0}>
              <div className="relative overflow-visible rounded-luxe-xl border border-black/8 bg-ink-50 p-4 shadow-media-xl sm:p-5 lg:justify-self-start">
                <div className="pointer-events-none absolute inset-0 bg-perfume-detail-card-glow" />
                <div className="relative overflow-visible rounded-luxe bg-white ring-1 ring-inset ring-black/8">
                  <div className="pointer-events-none absolute left-1/2 bottom-6 h-10 w-perfume-shadow -translate-x-1/2 rounded-full bg-black/30 opacity-[0.14] blur-2xl" />
                  <div className="relative -mt-4 overflow-hidden rounded-luxe sm:-mt-6">
                    <div className="relative aspect-[4/5]">
                      <Image
                        src={perfume.imageSrc}
                        alt={`${perfume.name} de ${perfume.brand}`}
                        fill
                        className="object-cover transform-gpu -translate-y-1.5 sm:-translate-y-2.5"
                        sizes="(max-width: 1024px) 92vw, 720px"
                        priority
                      />
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-perfume-detail-card-shine opacity-60" />
                  <div className="pointer-events-none absolute inset-0 shadow-inset-xl" />
                </div>
              </div>
            </LazyReveal>

            <LazyReveal delayMs={120}>
              <div className="space-y-8">
                <div>
                  <p className="text-xs tracking-section text-ink-500">{perfume.brand}</p>
                  <h1 className="mt-2 font-display text-4xl leading-display text-ink-950 sm:text-5xl">{perfume.name}</h1>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Badge>{concentration}</Badge>
                    <Badge>{family}</Badge>
                    <Badge>{perfume.sizeMl} ml</Badge>
                    <Badge tone={availabilityBadgeTone(perfume.availability)}>{availabilityLabel[perfume.availability]}</Badge>
                  </div>

                  {headline ? (
                    <p className="mt-6 max-w-xl font-display text-2xl leading-display text-ink-950">
                      {headline}
                    </p>
                  ) : null}
                  {rest ? <p className="mt-3 max-w-xl text-sm leading-body text-ink-700">{rest}</p> : null}
                </div>

                <div className="flex flex-wrap gap-3">
                  <ButtonExternal
                    href={waHref}
                    target="_blank"
                    rel="noreferrer"
                    variant="gold"
                    className="group transition-luxe duration-luxe ease-luxe hover:-translate-y-0.5 hover:shadow-cta-soft"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span>Solicitar por WhatsApp</span>
                      <span className="text-ink-800/70 transition-transform duration-luxe ease-luxe group-hover:translate-x-0.5">
                        →
                      </span>
                    </span>
                  </ButtonExternal>
                </div>

                <div className="rounded-luxe border border-black/8 bg-white px-7 py-7 shadow-panel">
                  <p className="text-ui-xs font-medium tracking-section text-ink-500">DISPONIBILIDAD</p>
                  <p className="mt-3 font-display text-2xl leading-display text-ink-950">{availabilityEditorial}</p>
                  <p className="mt-2 text-sm tracking-wide text-ink-700">
                    {perfume.sizeMl} ml <span className="text-ink-400">·</span> {concentration}
                  </p>

                  <div className="mt-7">
                    <p className="text-ui-xs font-medium tracking-section text-ink-500">PRECIO</p>
                    <p className="mt-2 font-display text-3xl leading-display text-ink-950">{formatPrice(perfume.price)}</p>
                  </div>

                  <div className="mt-7">
                    <Badge size="md" className="text-ink-950">
                      {stockLabel}
                    </Badge>
                  </div>
                </div>
              </div>
            </LazyReveal>
          </div>
        </Container>
      </section>

      <section>
        <Container className="py-10 sm:py-14">
          <div className="grid gap-6 lg:grid-cols-3">
            <LazyReveal delayMs={0} className="lg:col-span-1">
              <div className="rounded-luxe border border-black/8 bg-white p-6 shadow-panel">
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
                    <p className="text-sm font-medium text-ink-950">
                      {availabilityLabel[perfume.availability]}
                    </p>
                  </div>
                </div>
              </div>
            </LazyReveal>

            <LazyReveal delayMs={120} className="lg:col-span-2">
              <div className="rounded-luxe border border-black/8 bg-white p-7 shadow-panel">
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

            <LazyReveal delayMs={240} className="lg:col-span-3">
              <div className="rounded-luxe-xl border border-black/8 bg-white px-7 py-12 shadow-panel-lg sm:px-9 sm:py-12">
                <p className="text-xs tracking-section text-ink-500">HISTORIA</p>
                {renderDescription(perfume.description)}
              </div>
            </LazyReveal>
          </div>
        </Container>
      </section>
    </div>
  )
}
