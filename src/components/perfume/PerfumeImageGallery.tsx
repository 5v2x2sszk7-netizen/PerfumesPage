"use client"

import { useMemo, useState } from "react"
import Image from "next/image"

export function PerfumeImageGallery({
  images,
  alt
}: {
  images: string[]
  alt: string
}) {
  const gallery = useMemo(() => images.filter(Boolean).slice(0, 6), [images])
  const [activeIndex, setActiveIndex] = useState(0)
  const activeImage = gallery[activeIndex] || gallery[0] || ""
  const isUploadImage = activeImage.startsWith("/uploads/")

  if (!activeImage) return null

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-luxe-xl border border-black/8 bg-ink-50 p-4 shadow-media-xl sm:p-5 lg:justify-self-start">
        <div className="pointer-events-none absolute inset-0 bg-perfume-detail-card-glow" />
        <div className="relative overflow-hidden rounded-luxe bg-white ring-1 ring-inset ring-black/8">
          <div className="pointer-events-none absolute left-1/2 bottom-6 h-10 w-perfume-shadow -translate-x-1/2 rounded-full bg-black/30 opacity-ink-14 blur-2xl" />
          <div className="relative -mt-4 overflow-hidden rounded-luxe sm:-mt-6">
            <div className="relative aspect-[4/5]">
              {isUploadImage ? (
                <img src={activeImage} alt={alt} className="h-full w-full object-cover transform-gpu -translate-y-1.5 sm:-translate-y-2.5" />
              ) : (
                <Image
                  src={activeImage}
                  alt={alt}
                  fill
                  className="object-cover transform-gpu -translate-y-1.5 sm:-translate-y-2.5"
                  sizes="(max-width: 1024px) 92vw, 720px"
                  priority
                />
              )}
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 bg-perfume-detail-card-shine opacity-60" />
          <div className="pointer-events-none absolute inset-0 shadow-inset-xl" />
        </div>
      </div>

      {gallery.length > 1 ? (
        <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-1">
          {gallery.map((image, index) => {
            const isActive = index === activeIndex
            const isUploadThumb = image.startsWith("/uploads/")
            return (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={[
                  "relative h-20 w-20 shrink-0 overflow-hidden rounded-luxe border bg-white transition-luxe duration-luxe ease-luxe",
                  isActive
                    ? "border-antiqueGold shadow-[0_0_0_3px_rgba(188,149,79,0.12)]"
                    : "border-black/8 hover:border-antiqueGold/40"
                ].join(" ")}
                aria-label={`Ver foto ${index + 1} de ${gallery.length}`}
                aria-pressed={isActive}
              >
                {isUploadThumb ? (
                  <img src={image} alt={`${alt} miniatura ${index + 1}`} className="h-full w-full object-cover" />
                ) : (
                  <Image
                    src={image}
                    alt={`${alt} miniatura ${index + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                )}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
