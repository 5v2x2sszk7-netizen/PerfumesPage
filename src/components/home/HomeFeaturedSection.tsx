import type { Perfume } from "@/types/perfume"
import { Container } from "@/components/ui/Container"
import { ButtonLink } from "@/components/ui/Button"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { HomeFeaturedCarousel } from "@/components/home/HomeFeaturedCarousel"

export function HomeFeaturedSection({ featured }: { featured: Perfume[] }) {
  return (
    <section className="relative bg-white">
      <Container className="pt-14 pb-16 sm:pt-16 sm:pb-20">
        <div className="max-w-home-hero">
          <SectionHeader
            kicker="AGREGADOS RECIENTEMENTE"
            title={<h2>Nuevas incorporaciones</h2>}
            className="gap-0"
            kickerClassName="tracking-brand"
            titleClassName="mt-4 text-2xl"
          />
        </div>

        <div className="mt-8">
          <HomeFeaturedCarousel featured={featured} />
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
      </Container>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-home-section-bottom-fade" />
    </section>
  )
}
