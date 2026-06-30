import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import type { ReactNode } from "react"
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

function renderInlineBold(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-ink-950">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={idx}>{part}</span>
  })
}

function PerfumeDescription({ value }: { value: string }) {
  const raw = value?.trim()
  if (!raw) return null

  const blocks = raw
    .split(/\n\s*\n/g)
    .map((b) => b.trim())
    .filter(Boolean)

  const isSingleDenseBlock = blocks.length === 1 && raw.includes("\n") && !raw.includes("\n\n")

  return (
    <div className="mt-4 max-w-prose space-y-4 text-ui-body leading-body text-ink-700">
      {(isSingleDenseBlock ? blocks[0].split("\n").map((l) => l.trim()).filter(Boolean) : blocks).map(
        (block, idx) => {
          const lines = block
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)

          const items = isSingleDenseBlock ? [block] : lines
          const isBullets = items.every((l) => l.startsWith("- ") || l.startsWith("• "))
          if (isBullets) {
            return (
              <ul key={idx} className="list-inside list-disc space-y-1 pl-1 marker:text-ink-400">
                {items.map((l, li) => (
                  <li key={li}>{renderInlineBold(l.replace(/^(-|•)\s+/, ""))}</li>
                ))}
              </ul>
            )
          }

          const single = items.join(" ")
          if (isSingleDenseBlock && idx === 0 && !single.includes(":")) {
            return (
              <p key={idx} className="font-display text-xl leading-display text-ink-950">
                {renderInlineBold(single)}
              </p>
            )
          }

          if (single.endsWith(":")) {
            return (
              <p key={idx} className="font-semibold text-ink-950">
                {single.slice(0, -1)}
              </p>
            )
          }

          const colonAt = single.indexOf(":")
          const canLabel = colonAt > 0 && colonAt <= 24

          if (canLabel) {
            const label = single.slice(0, colonAt).trim()
            const rest = single.slice(colonAt + 1).trim()
            return (
              <p key={idx}>
                <strong className="font-semibold text-ink-950">{label}:</strong>{" "}
                {renderInlineBold(rest)}
              </p>
            )
          }

          return <p key={idx}>{renderInlineBold(single)}</p>
        }
      )}
    </div>
  )
}

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
                  <p className="text-sm font-medium text-ink-950">{availabilityLabel[perfume.availability]}</p>
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
              <PerfumeDescription value={perfume.description} />
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
              <PerfumeImageGallery images={galleryImages} alt={`${perfume.name} de ${perfume.brand}`} />
            </LazyReveal>

            <LazyReveal delayMs={120}>
              <div className="space-y-8">
                <div>
                  <p className="text-xs tracking-section text-ink-500">{perfume.brand}</p>
                  <h1 className="mt-2 font-display text-4xl leading-display text-ink-950 sm:text-5xl">{perfume.name}</h1>

                  <div className="mt-5 flex flex-wrap gap-x-2 gap-y-2">
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

                <AvailabilityPanel
                  perfume={perfume}
                  concentration={concentration}
                  availabilityEditorial={availabilityEditorial}
                  stockLabel={stockLabel}
                />
              </div>
            </LazyReveal>
          </div>
        </Container>
      </section>

      <DetailsSection perfume={perfume} concentration={concentration} family={family} />
    </div>
  )
}
