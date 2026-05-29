import type { Perfume } from "@/types/perfume"
import { Container } from "@/components/ui/Container"
import { ButtonLink } from "@/components/ui/Button"
import { LazyReveal } from "@/components/ui/LazyReveal"
import { PerfumeCard } from "@/components/perfume/PerfumeCard"
import { SectionHeader } from "@/components/ui/SectionHeader"

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

          <div className="mt-8 grid grid-cols-1 gap-4">
            {featured.map((p, idx) => (
              <LazyReveal key={p.id} className="w-full" delayMs={idx * 120}>
                <PerfumeCard perfume={p} variant="featured" />
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
