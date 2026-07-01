import type { Perfume } from "@/types/perfume"
import { Container } from "@/components/ui/Container"
import { ButtonLink } from "@/components/ui/Button"
import { LazyReveal } from "@/components/ui/LazyReveal"
import { PerfumeCard } from "@/components/perfume/PerfumeCard"
import { SectionHeader } from "@/components/ui/SectionHeader"

export function HomeFeaturedSection({ featured }: { featured: Perfume[] }) {
  const showMobileArrows = featured.length > 1

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

        {showMobileArrows ? (
          <div className="mt-5 flex items-center justify-end gap-2 md:hidden">
            <span className="text-[11px] uppercase tracking-[0.18em] text-ink-400">Desliza</span>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/8 bg-white text-ink-700 shadow-sm">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
                <path d="M11.5 5.5L7 10l4.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/8 bg-white text-ink-950 shadow-sm">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
                <path d="M8.5 5.5L13 10l-4.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        ) : null}

        <div className="mt-8">
          <div className="scrollbar-none flex max-w-full snap-x snap-mandatory gap-4 overflow-x-auto pb-1 pr-6 md:grid md:snap-none md:grid-cols-2 md:overflow-visible md:pr-0 lg:grid-cols-3 xl:grid-cols-4">
            {featured.map((p, idx) => (
              <LazyReveal
                key={p.id}
                className="w-[min(328px,86vw)] shrink-0 snap-start sm:w-[360px] md:w-full md:shrink md:snap-none"
                delayMs={idx * 120}
              >
                <PerfumeCard perfume={p} variant="featured" className="w-full" />
              </LazyReveal>
            ))}
          </div>
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
