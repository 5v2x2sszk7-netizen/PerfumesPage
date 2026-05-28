import type { Metadata } from "next"
import { Container } from "@/components/ui/Container"
import { CatalogClient } from "@/app/catalog/CatalogClient"
import { readPerfumes } from "@/lib/perfumeStore"

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
        <h1 className="font-display text-3xl leading-[0.95] text-ink-950 sm:text-4xl">
          Perfumes disponibles
        </h1>
        <p className="max-w-2xl text-sm leading-[1.85] text-ink-700">
          Selección curada con información clara. Para confirmar disponibilidad final y envíos,
          pide por WhatsApp.
        </p>
      </div>
      <CatalogClient perfumes={perfumes} />
    </Container>
  )
}
