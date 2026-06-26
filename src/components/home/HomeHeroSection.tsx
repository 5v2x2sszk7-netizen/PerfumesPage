import Image from "next/image"
import type { CSSProperties } from "react"

export function HomeHeroSection() {
  const noiseStyle = { "--noise-size": "280px 280px", "--noise-opacity": "0.045" } as CSSProperties

  return (
    <section className="relative h-home-hero overflow-hidden border-b border-black/6 bg-white sm:h-home-hero-sm lg:h-home-hero-lg">
      <Image
        src="/images/MaloFragancesHome.jpg"
        alt="MALO Fragances"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="pointer-events-none absolute inset-0 bg-home-hero-overlay-1" />
      <div className="pointer-events-none absolute inset-0 bg-home-hero-overlay-2 opacity-45 mix-blend-soft-light" />
      <div className="pointer-events-none absolute inset-0 bg-home-hero-overlay-3 opacity-50 mix-blend-overlay" />
      <div className="pointer-events-none absolute inset-0 bg-home-hero-overlay-4 opacity-32 mix-blend-soft-light" />
      <div className="pointer-events-none absolute inset-0 bg-home-hero-overlay-5" />
      <div className="pointer-events-none absolute inset-0 noise-overlay mix-blend-overlay" style={noiseStyle} />
    </section>
  )
}
