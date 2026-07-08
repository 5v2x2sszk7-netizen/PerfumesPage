import type { Perfume } from "@/types/perfume"
import Image from "next/image"
import Link from "next/link"
import { cn, focusRing } from "@/lib/cn"
import { formatPrice, availabilityLabel } from "@/lib/whatsapp"
import { Badge, availabilityBadgeTone } from "@/components/ui/Badge"

type PerfumeCardVariant = "grid" | "featured"

export type PerfumeCardModel = Pick<
  Perfume,
  "id" | "slug" | "name" | "brand" | "category" | "concentration" | "sizeMl" | "price" | "availability" | "imageSrc"
>

export function PerfumeCard({
  perfume,
  variant = "grid",
  className
}: {
  perfume: PerfumeCardModel
  variant?: PerfumeCardVariant
  className?: string
}) {
  const isOut = perfume.availability === "out_of_stock"
  const concentration = perfume.concentration?.trim() || "Eau de Parfum"
  const showConsult = perfume.price <= 0
  const isUploadImage = perfume.imageSrc.startsWith("/uploads/")

  if (variant === "featured") {
    return (
      <Link
        href={`/catalog/${perfume.slug}`}
        className={cn(
          "group relative block w-full max-w-featured-card [transform:translateZ(0)] overflow-hidden rounded-ui bg-white p-3 no-underline ring-1 ring-inset ring-black/8 transition-luxe duration-luxe ease-luxe hover:ring-black/10 hover:shadow-home-featured-hover motion-safe:hover:-translate-y-0.5",
          focusRing,
          className
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-home-featured-hover-glow opacity-0 transition-opacity duration-luxe-slow ease-luxe group-hover:opacity-100" />
        <div className="relative aspect-[5/6] overflow-hidden rounded-control bg-ink-50 ring-1 ring-inset ring-black/8">
          <div className="pointer-events-none absolute inset-0 bg-home-featured-media-glow opacity-80" />
          {isUploadImage ? (
            <img
              src={perfume.imageSrc}
              alt={`${perfume.name} de ${perfume.brand}`}
              className="h-full w-full object-cover transition-luxe-media duration-luxe ease-luxe group-hover:scale-[1.02]"
            />
          ) : (
            <Image
              src={perfume.imageSrc}
              alt={`${perfume.name} de ${perfume.brand}`}
              fill
              className="object-cover transition-luxe-media duration-luxe ease-luxe group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 80vw, 360px"
            />
          )}
        </div>
        <p className="relative mt-4 text-xs tracking-ui text-ink-500">{perfume.brand}</p>
        <p className="relative mt-1 font-display text-base text-ink-950">{perfume.name}</p>
        <div className="relative mt-3 flex items-center justify-between gap-3">
          <span className="text-sm text-ink-700">{perfume.sizeMl} ml</span>
          <span className="text-sm font-medium text-ink-950">{formatPrice(perfume.price)}</span>
        </div>
      </Link>
    )
  }

  return (
    <Link
      href={`/catalog/${perfume.slug}`}
      className={cn(
        "group relative flex h-full [transform:translateZ(0)] overflow-hidden rounded-luxe-lg bg-white no-underline shadow-card ring-1 ring-inset ring-black/8 transition-luxe duration-luxe ease-luxe hover:-translate-y-1 hover:ring-black/10 hover:shadow-perfume-hover",
        focusRing,
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-perfume-hover-gold opacity-0 transition-opacity duration-luxe-slow ease-luxe group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-0 bg-perfume-hover-white opacity-0 transition-opacity duration-luxe-fast ease-luxe group-hover:opacity-100" />

      <div className="relative flex h-full w-full flex-col p-4 sm:p-5">
        <div className="relative overflow-hidden rounded-luxe-md bg-ink-50 ring-1 ring-inset ring-black/8">
          <div className="pointer-events-none absolute inset-0 bg-perfume-media-glow opacity-25 transition-opacity duration-luxe ease-luxe group-hover:opacity-70" />
          <div className="relative aspect-[4/5]">
            {isUploadImage ? (
              <img
                src={perfume.imageSrc}
                alt={`${perfume.name} de ${perfume.brand}`}
                className={cn(
                  "h-full w-full object-cover transition-luxe-media duration-luxe-fast ease-luxe",
                  isOut ? "opacity-85" : "group-hover:scale-[1.02] group-hover:translate-y-[-1px]"
                )}
              />
            ) : (
              <Image
                src={perfume.imageSrc}
                alt={`${perfume.name} de ${perfume.brand}`}
                fill
                className={cn(
                  "object-cover transition-luxe-media duration-luxe-fast ease-luxe",
                  isOut ? "opacity-85" : "group-hover:scale-[1.02] group-hover:translate-y-[-1px]"
                )}
                sizes="(max-width: 640px) 90vw, (max-width: 1024px) 40vw, 360px"
              />
            )}
          </div>

          <div className="pointer-events-none absolute inset-0 shadow-inset-soft opacity-70 transition-opacity duration-luxe ease-luxe group-hover:opacity-100" />
          <div className="pointer-events-none absolute inset-0 bg-perfume-media-highlight opacity-0 transition-opacity duration-luxe-fast ease-luxe group-hover:opacity-100" />

          <div className="absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2 sm:inset-x-4 sm:top-4">
            <Badge size="xs" className="max-w-[65%]">
              {concentration}
            </Badge>
            <Badge size="xs" tone={availabilityBadgeTone(perfume.availability)} className="shrink-0">
              {availabilityLabel[perfume.availability]}
            </Badge>
          </div>
        </div>

        <div className="mt-5 flex flex-1 flex-col space-y-2">
          <p className="text-ui-xs tracking-kicker text-ink-500">{perfume.brand}</p>
          <h3
            className={cn(
              "min-h-[3.5rem] text-balance font-display text-lg leading-tight text-ink-950 sm:min-h-[4rem] sm:text-xl",
              isOut ? "text-ink-700" : ""
            )}
          >
            {perfume.name}
          </h3>

          <div className="mt-auto pt-2">
            <div className="flex items-baseline justify-between gap-4">
              <p className={cn("text-sm text-ink-700", isOut ? "text-ink-600" : "")}>
                {perfume.sizeMl} ml
              </p>
              {showConsult ? (
                <p className="text-sm font-medium text-ink-700">
                  <span className="inline-flex items-center gap-2">
                    <span className="tracking-product text-ink-700">
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
