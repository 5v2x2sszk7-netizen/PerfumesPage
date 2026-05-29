"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ZoomableImage } from "./ZoomableImage"
import { getInitials } from "@/lib/text"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/cn"
import type { ReviewCarouselItem } from "@/lib/reviews"
import { StarRating } from "@/components/ui/StarRating"

export function ReviewCarousel({ items }: { items: ReviewCarouselItem[] }) {
  const safeItems = useMemo(() => items.filter((i) => Boolean(i.src)), [items])
  const galleryItems = useMemo(() => {
    return safeItems.map((v) => ({
      src: v.src,
      alt: v.alt,
      meta: `${v.customerName} • Compra verificada`
    }))
  }, [safeItems])
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Array<HTMLDivElement | null>>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const activeIndexRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const pendingActiveIndexRef = useRef<number | null>(null)

  const activeIndexClamped = safeItems.length ? Math.min(activeIndex, safeItems.length - 1) : 0
  const canNavigate = safeItems.length > 1

  function scrollToIndex(nextIndex: number) {
    if (!safeItems.length) return
    const normalized = ((nextIndex % safeItems.length) + safeItems.length) % safeItems.length
    const el = itemRefs.current[normalized]
    if (el) {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
      setActiveIndex(normalized)
    }
  }

  function goPrev() {
    if (!canNavigate) return
    scrollToIndex(activeIndexClamped - 1)
  }

  function goNext() {
    if (!canNavigate) return
    scrollToIndex(activeIndexClamped + 1)
  }

  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, safeItems.length)
  }, [safeItems.length])

  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return

    const els = itemRefs.current.filter(Boolean) as HTMLDivElement[]
    if (!els.length) return

    const indexByEl = new Map<Element, number>()
    for (const [idx, el] of els.entries()) indexByEl.set(el, idx)

    els[0]?.classList.add("is-visible")

    const observer = new IntersectionObserver(
      (entries) => {
        let bestIdx = -1
        let bestRatio = 0
        for (const entry of entries) {
          const idx = indexByEl.get(entry.target)
          if (idx == null) continue

          if (entry.isIntersecting) (entry.target as HTMLElement).classList.add("is-visible")

          const ratio = entry.intersectionRatio
          if (ratio > bestRatio) {
            bestRatio = ratio
            bestIdx = idx
          }
        }

        if (bestIdx < 0 || bestIdx === activeIndexRef.current) return
        pendingActiveIndexRef.current = bestIdx
        if (rafRef.current) return
        rafRef.current = window.requestAnimationFrame(() => {
          rafRef.current = null
          const nextIdx = pendingActiveIndexRef.current
          pendingActiveIndexRef.current = null
          if (nextIdx == null || nextIdx === activeIndexRef.current) return
          setActiveIndex(nextIdx)
        })
      },
      { root: scroller, threshold: [0.25, 0.35, 0.5, 0.6, 0.75] }
    )

    for (const el of els) observer.observe(el)
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      pendingActiveIndexRef.current = null
      observer.disconnect()
    }
  }, [safeItems])
  if (!safeItems.length) return null


  return (
    <div className="group relative mx-auto w-full max-w-6xl">
      <div
        ref={scrollRef}
        className="scrollbar-none flex snap-x snap-mandatory gap-10 overflow-x-auto px-6 py-10 pr-10 scroll-smooth sm:px-10 sm:py-14 sm:pr-14"
      >
        {safeItems.map((item, i) => (
          <div
            key={`${item.id}:${item.src}`}
            ref={(el) => {
              itemRefs.current[i] = el
            }}
            className={cn(
              "min-w-full snap-center",
              "reveal",
              i === 0 ? "is-visible" : ""
            )}
          >
            <div className="group grid gap-6 rounded-ui bg-paper-50 p-8 transition-shadow duration-300 hover:shadow-review-hover md:grid-cols-[1.2fr_0.8fr] md:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge
                    size="sm"
                    blur={false}
                    className="gap-2 border border-black/8 px-4 py-1.5 text-xs font-medium tracking-wide text-ink-950 ring-0"
                  >
                    ✓ Compra verificada
                  </Badge>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-white text-sm font-semibold text-ink-950">
                    {getInitials(item.customerName)}
                  </div>
                  <p className="font-display text-3xl leading-none text-ink-950">{item.customerName}</p>
                </div>
                {typeof item.rating === "number" && item.rating > 0 ? (
                  <StarRating
                    value={item.rating}
                    className="mt-3 text-ui-rating leading-none text-goldSoft transition-transform duration-300 group-hover:scale-[1.02]"
                    ariaLabel={`${item.rating} de 5`}
                  />
                ) : null}
                <p className="mt-3 max-w-review-copy whitespace-pre-wrap text-base font-medium leading-relaxed text-ink-900/90 sm:text-lg">
                  {item.text}
                </p>
              </div>

              <div className="w-full">
                <div className="group relative mx-auto w-full max-w-review-media overflow-hidden rounded-ui bg-sage-50 shadow-review-media ring-1 ring-black/8 transition-shadow duration-luxe-fast ease-out hover:shadow-review-media-hover md:max-w-review-media">
                  <div className="pointer-events-none absolute inset-0 bg-review-media-shine" />
                  <div className="p-4">
                    <div className="relative aspect-[4/3] w-full max-h-review-media overflow-hidden rounded-ui bg-white/35 sm:max-h-review-media-sm">
                      <ZoomableImage
                        src={item.src}
                        alt={item.alt}
                        sizes="(max-width: 768px) 92vw, 520px"
                        meta={`${item.customerName} • Compra verificada`}
                        gallery={{
                          items: galleryItems,
                          index: i
                        }}
                        wrapperClassName="absolute inset-0"
                        frameClassName="relative h-full w-full"
                        imageClassName={
                          "object-contain transition-transform duration-luxe-fast ease-out group-hover:scale-[1.03] " +
                          (i === activeIndexClamped ? "ken-burns-soft" : "")
                        }
                        dialogImageClassName="object-contain"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {canNavigate ? (
        <>
          <button
            type="button"
            aria-label="Anterior"
            onClick={goPrev}
            className="absolute left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-black/8 bg-white/90 text-2xl font-thin text-ink-950 shadow-sm ring-1 ring-black/8 backdrop-blur transition hover:bg-white md:flex md:opacity-0 md:group-hover:opacity-100"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Siguiente"
            onClick={goNext}
            className="absolute right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-black/8 bg-white/90 text-2xl font-thin text-ink-950 shadow-sm ring-1 ring-black/8 backdrop-blur transition hover:bg-white md:flex md:opacity-0 md:group-hover:opacity-100"
          >
            ›
          </button>
        </>
      ) : null}

      {canNavigate ? (
        <div className="-mt-4 flex items-center justify-center gap-2 px-6 pb-8 sm:px-10">
          {safeItems.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir a la imagen ${i + 1}`}
              onClick={() => scrollToIndex(i)}
              className={cn(
                "h-2 w-2 rounded-full transition",
                i === activeIndexClamped ? "bg-goldSoft" : "bg-ink-200 hover:bg-ink-300"
              )}
            />
          ))}
        </div>
      ) : null}

    </div>
  )
}
