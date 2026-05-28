import type { Metadata } from "next"
import { Container } from "@/components/ui/Container"
import { CatalogClient } from "@/components/catalog/CatalogClient"
import { readPerfumes } from "@/lib/perfumeStore"
import { Suspense } from "react"

export const revalidate = 60

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Explora perfumes disponibles, detalles, tamaños y precios. Pide por WhatsApp."
}

export default async function CatalogPage() {
  const perfumes = await readPerfumes()

  return (
    <Container className="py-10 sm:py-14">
      <div className="flex flex-col gap-3">
        <p className="text-xs tracking-section text-ink-500">CATÁLOGO</p>
        <h1 className="font-display text-3xl leading-display text-ink-950 sm:text-4xl">
          Perfumes disponibles
        </h1>
        <p className="max-w-2xl text-sm leading-body text-ink-700">
          Selección curada con información clara. Para confirmar disponibilidad final y envíos,
          pide por WhatsApp.
        </p>
      </div>
      <Suspense>
        <CatalogClient perfumes={perfumes} />
      </Suspense>
    </Container>
  )
}
