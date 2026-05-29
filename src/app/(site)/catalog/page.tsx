import type { Metadata } from "next"
import { Suspense } from "react"
import { Container } from "@/components/ui/Container"
import { CatalogClient } from "@/components/catalog/CatalogClient"
import { readPerfumes } from "@/lib/perfumeStore"
import type { PerfumeCardModel } from "@/components/perfume/PerfumeCard"
import { Card } from "@/components/ui/Surface"
import { SectionHeader } from "@/components/ui/SectionHeader"

export const revalidate = 60

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Explora perfumes disponibles, detalles, tamaños y precios. Pide por WhatsApp."
}

export default async function CatalogPage() {
  const perfumes: PerfumeCardModel[] = (await readPerfumes()).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    category: p.category,
    concentration: p.concentration,
    sizeMl: p.sizeMl,
    price: p.price,
    availability: p.availability,
    imageSrc: p.imageSrc
  }))

  return (
    <Container className="py-10 sm:py-14">
      <SectionHeader
        kicker="CATÁLOGO"
        title={<h1>Perfumes disponibles</h1>}
        description={
          <p>
            Selección curada con información clara. Para confirmar disponibilidad final y envíos, pide por WhatsApp.
          </p>
        }
      />
      <Suspense fallback={<Card className="shimmer mt-8 h-[520px] w-full p-6" aria-hidden="true" />}>
        <CatalogClient perfumes={perfumes} />
      </Suspense>
    </Container>
  )
}
