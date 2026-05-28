import type { Perfume } from "@/types/perfume"
import { Container } from "@/components/ui/Container"
import { ButtonLink } from "@/components/ui/Button"
import { LazyReveal } from "@/components/ui/LazyReveal"
import { formatPrice } from "@/lib/whatsapp"
import { cn, focusRing } from "@/lib/cn"
import Image from "next/image"
import Link from "next/link"

export function HomeFeaturedSection({ featured }: { featured: Perfume[] }) {
  return (
    <section className="relative bg-white">
      <Container className="pt-14 pb-16 sm:pt-16 sm:pb-20">
        <div className="max-w-home-hero">
          <p className="text-xs tracking-brand text-ink-500">AGREGADOS RECIENTEMENTE</p>
          <h2 className="mt-4 font-display text-2xl leading-display text-ink-950">Nuevas incorporaciones</h2>

          <div className="mt-8 grid grid-cols-1 gap-4">
            {featured.map((p, idx) => (
              <LazyReveal key={p.id} className="w-full" delayMs={idx * 120}>
                <Link
                  href={`/catalog/${p.slug}`}
                  className={cn(
                    "group relative block w-full max-w-featured-card [transform:translateZ(0)] overflow-hidden rounded-2xl bg-white p-3 no-underline ring-1 ring-inset ring-black/8 transition-luxe duration-luxe ease-luxe hover:ring-black/10 hover:shadow-home-featured-hover motion-safe:hover:-translate-y-0.5",
                    focusRing
                  )}
                >
                  <div className="pointer-events-none absolute inset-0 bg-home-featured-hover-glow opacity-0 transition-opacity duration-luxe-slow ease-luxe group-hover:opacity-100" />
                  <div className="relative aspect-[5/6] overflow-hidden rounded-xl bg-ink-50 ring-1 ring-inset ring-black/8">
                    <div className="pointer-events-none absolute inset-0 bg-home-featured-media-glow opacity-80" />
                    <Image
                      src={p.imageSrc}
                      alt={`${p.name} de ${p.brand}`}
                      fill
                      className="object-cover transition-luxe-media duration-luxe ease-luxe group-hover:scale-[1.02]"
                      sizes="(max-width: 768px) 80vw, 360px"
                      priority={false}
                    />
                  </div>
                  <p className="relative mt-4 text-xs tracking-ui text-ink-500">{p.brand}</p>
                  <p className="relative mt-1 font-display text-base text-ink-950">{p.name}</p>
                  <div className="relative mt-3 flex items-center justify-between gap-3">
                    <span className="text-sm text-ink-700">{p.sizeMl} ml</span>
                    <span className="text-sm font-medium text-ink-950">{formatPrice(p.price)}</span>
                  </div>
                </Link>
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
