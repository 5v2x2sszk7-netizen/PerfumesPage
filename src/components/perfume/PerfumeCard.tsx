"use client"

import type { Perfume } from "@/types/perfume"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/cn"
import { formatPrice, availabilityLabel } from "@/lib/whatsapp"
import { useState } from "react"
import { Badge, availabilityBadgeTone } from "@/components/ui/Badge"

export function PerfumeCard({ perfume }: { perfume: Perfume }) {
  const isOut = perfume.availability === "out_of_stock"
  const concentration = perfume.concentration?.trim() || "Eau de Parfum"
  const showConsult = perfume.price <= 0
  const [imageLoaded, setImageLoaded] = useState(false)

  return (
    <Link
      href={`/catalog/${perfume.slug}`}
      prefetch={false}
      className="group relative block [transform:translateZ(0)] overflow-hidden rounded-luxe-lg bg-white no-underline shadow-card ring-1 ring-inset ring-black/8 transition-luxe duration-luxe ease-luxe hover:-translate-y-1 hover:ring-black/10 hover:shadow-perfume-hover focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-antiqueGold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f5f1]"
    >
      <div className="pointer-events-none absolute inset-0 bg-perfume-hover-gold opacity-0 transition-opacity duration-luxe-slow ease-luxe group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-0 bg-perfume-hover-white opacity-0 transition-opacity duration-luxe-fast ease-luxe group-hover:opacity-100" />

      <div className="relative p-4 sm:p-5">
        <div className="relative overflow-hidden rounded-luxe-md bg-ink-50 ring-1 ring-inset ring-black/8">
          <div className="pointer-events-none absolute inset-0 bg-perfume-media-glow opacity-25 transition-opacity duration-luxe ease-luxe group-hover:opacity-70" />
          <div className="relative aspect-[4/5]">
            <Image
              src={perfume.imageSrc}
              alt={`${perfume.name} de ${perfume.brand}`}
              fill
              className={cn(
                "object-cover transition-luxe-media duration-luxe-fast ease-luxe",
                imageLoaded ? "opacity-100" : "opacity-0",
                isOut ? "opacity-85" : "group-hover:scale-[1.02] group-hover:translate-y-[-1px]"
              )}
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 40vw, 360px"
              priority={false}
              onLoadingComplete={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
            />
          </div>

          <div className="pointer-events-none absolute inset-0 shadow-inset-soft opacity-70 transition-opacity duration-luxe ease-luxe group-hover:opacity-100" />
          <div className="pointer-events-none absolute inset-0 bg-perfume-media-highlight opacity-0 transition-opacity duration-luxe-fast ease-luxe group-hover:opacity-100" />

          <div className="absolute left-4 top-4 flex items-center gap-2">
            <Badge size="xs">{concentration}</Badge>
          </div>

          <div className="absolute right-4 top-4">
            <Badge size="xs" tone={availabilityBadgeTone(perfume.availability)}>
              {availabilityLabel[perfume.availability]}
            </Badge>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <p className="text-[11px] tracking-[0.22em] text-ink-500">{perfume.brand}</p>
          <h3 className={cn("font-display text-xl leading-tight text-ink-950", isOut ? "text-ink-700" : "")}>
            {perfume.name}
          </h3>

          <div className="pt-2">
            <div className="flex items-baseline justify-between gap-4">
              <p className={cn("text-sm text-ink-700", isOut ? "text-ink-600" : "")}>
                {perfume.sizeMl} ml
              </p>
              {showConsult ? (
                <p className="text-sm font-medium text-ink-700">
                  <span className="inline-flex items-center gap-2">
                    <span className="tracking-[0.06em] text-ink-700">
                      Consultar disponibilidad
                    </span>
                    <span className="text-ink-500 transition-transform duration-luxe ease-luxe group-hover:translate-x-0.5">
                      →
                    </span>
                  </span>
                  <span className="mt-1 block h-px w-full bg-perfume-consult-underline opacity-0 transition-opacity duration-luxe ease-luxe group-hover:opacity-100" />
                </p>
              ) : (
                <p className={cn("text-sm font-semibold", isOut ? "text-ink-600" : "text-antiqueGold")}>
                  {formatPrice(perfume.price)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
