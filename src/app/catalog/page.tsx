import type { Metadata } from "next"
import { Container } from "@/components/ui/Container"
import { CatalogClient } from "@/app/catalog/CatalogClient"
import { readPerfumes } from "@/lib/perfumeStore"
import { Suspense } from "react"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Explora perfumes disponibles, detalles, tamaños y precios. Pide por WhatsApp."
}

function CatalogSkeleton() {
  return (
    <div className="mt-8">
      <div className="rounded-luxe-lg border border-black/8 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-2">
            <div className="h-3 w-28 rounded-full shimmer" />
            <div className="h-12 w-[320px] max-w-full rounded-full shimmer" />
          </div>
          <div className="h-11 w-44 rounded-full shimmer" />
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="overflow-hidden rounded-luxe-lg border border-black/8 bg-white"
          >
            <div className="p-4 sm:p-5">
              <div className="overflow-hidden rounded-luxe-md bg-ink-50">
                <div className="aspect-[4/5] shimmer" />
              </div>
              <div className="mt-5 space-y-3">
                <div className="h-3 w-28 rounded-full shimmer" />
                <div className="h-5 w-44 rounded-full shimmer" />
                <div className="h-4 w-full max-w-skeleton rounded-full shimmer" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function CatalogPage() {
  const perfumes = await readPerfumes()

  return (
    <Container className="py-10 sm:py-14">
      <div className="flex flex-col gap-3">
        <p className="text-xs tracking-[0.25em] text-ink-500">CATÁLOGO</p>
        <h1 className="font-display text-3xl leading-[0.95] text-ink-950 sm:text-4xl">
          Perfumes disponibles
        </h1>
        <p className="max-w-2xl text-sm leading-[1.85] text-ink-700">
          Selección curada con información clara. Para confirmar disponibilidad final y envíos,
          pide por WhatsApp.
        </p>
      </div>
      <Suspense fallback={<CatalogSkeleton />}>
        <CatalogClient perfumes={perfumes} />
      </Suspense>
    </Container>
  )
}
