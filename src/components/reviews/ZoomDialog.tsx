"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import { ModalShell } from "@/components/ui/ModalShell"
import { clamp } from "@/lib/math"

export type GalleryItem = {
  src: string
  alt: string
  meta?: string
}

export type ZoomDialogProps = {
  open: boolean
  closing: boolean
  dialogId: string
  titleId: string
  items: GalleryItem[]
  activeIndex: number
  setActiveIndex: (next: number | ((prev: number) => number)) => void
  activeItem: GalleryItem
  glowRgb: [number, number, number] | null
  onClose: () => void
  dialogImageClassName?: string
}

export function ZoomDialog({
  open,
  closing,
  dialogId,
  titleId,
  items,
  activeIndex,
  setActiveIndex,
  activeItem,
  glowRgb,
  onClose,
  dialogImageClassName
}: ZoomDialogProps) {
  const total = items.length
  const touchStartX = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const pendingRef = useRef<{ x: number; y: number } | null>(null)
  const [parallax, setParallax] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && total > 1) {
        setActiveIndex((prevIdx) => (prevIdx - 1 + total) % total)
      }
      if (e.key === "ArrowRight" && total > 1) {
        setActiveIndex((prevIdx) => (prevIdx + 1) % total)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open, setActiveIndex, total])

  useEffect(() => {
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
    }
  }, [])

  if (!open) return null

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      placement="top"
      overlayTone="none"
      zIndex="z-zoom"
      id={dialogId}
      ariaLabelledby={titleId}
      overlayClassName={
        "bg-transparent p-1 pt-8 pb-4 sm:p-4 sm:pt-10 sm:pb-6 " + (closing ? "modal-overlay-out" : "modal-overlay-in")
      }
      contentClassName={"relative w-full max-w-6xl " + (closing ? "modal-pop-out" : "modal-pop")}
    >
      <div
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null
        }}
        onTouchEnd={(e) => {
          const startX = touchStartX.current
          const endX = e.changedTouches[0]?.clientX ?? null
          touchStartX.current = null
          if (startX === null || endX === null) return
          const delta = endX - startX
          if (Math.abs(delta) < 45) return
          if (total <= 1) return
          if (delta > 0) setActiveIndex((prevIdx) => (prevIdx - 1 + total) % total)
          else setActiveIndex((prevIdx) => (prevIdx + 1) % total)
        }}
        onMouseMove={(e) => {
          if (prefersReducedMotion) return
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
          const nx = (e.clientX - rect.left) / rect.width - 0.5
          const ny = (e.clientY - rect.top) / rect.height - 0.5
          const next = { x: clamp(nx * 8, -5, 5), y: clamp(ny * 8, -5, 5) }
          pendingRef.current = next
          if (rafRef.current) return
          rafRef.current = window.requestAnimationFrame(() => {
            rafRef.current = null
            if (pendingRef.current) setParallax(pendingRef.current)
          })
        }}
        onMouseLeave={() => {
          pendingRef.current = null
          setParallax({ x: 0, y: 0 })
        }}
      >
        <div
          className="group relative h-zoom-dialog overflow-hidden rounded-luxe-dialog border border-whiteA-4 bg-inkModal shadow-zoom-modal sm:h-zoom-dialog-sm"
          style={
            glowRgb
              ? ({ "--glow-rgb": `${glowRgb[0]} ${glowRgb[1]} ${glowRgb[2]}` } as CSSProperties)
              : undefined
          }
        >
          <p id={titleId} className="sr-only">
            {activeItem.alt}
          </p>

          <div className="pointer-events-none absolute inset-0 bg-zoom-overlay" />
          <div className="pointer-events-none absolute left-1/2 top-zoom-glow-1 h-zoom-glow-1 w-zoom-glow-1 -translate-x-1/2 rounded-full bg-zoom-glow-1 opacity-32 blur-zoom-1 sm:h-zoom-glow-1-sm sm:w-zoom-glow-1-sm" />
          <div className="pointer-events-none absolute left-1/2 top-zoom-glow-2 h-zoom-glow-2 w-zoom-glow-2 -translate-x-1/2 rounded-full bg-zoom-glow-2 opacity-24 blur-zoom-2 sm:h-zoom-glow-2-sm sm:w-zoom-glow-2-sm" />
          {glowRgb ? (
            <div className="pointer-events-none absolute inset-0 bg-zoom-dynamic-glow opacity-65 transition-opacity duration-luxe-fast ease-luxe" />
          ) : null}

          <div
            className="absolute inset-x-4 top-12 bottom-20 flex items-center justify-center sm:inset-x-8 sm:top-14 sm:bottom-24"
            style={{
              transform: prefersReducedMotion
                ? "translate3d(0px, 0px, 0)"
                : `translate3d(${parallax.x}px, ${parallax.y}px, 0)`,
              transition: prefersReducedMotion ? "none" : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)"
            }}
          >
            <div className={"flex h-full w-full items-center justify-center " + (closing ? "modal-image-out" : "modal-image")}>
              {/* Native img preserves the review photo's natural ratio inside the lightbox. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={activeItem.src}
                src={activeItem.src}
                alt={activeItem.alt}
                className={dialogImageClassName ?? "mx-auto h-auto max-h-[65vh] w-auto max-w-full rounded-lg object-contain"}
              />
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 bg-zoom-vignette-1" />
          <div className="pointer-events-none absolute inset-0 shadow-zoom-inset" />
          <div className="pointer-events-none absolute inset-0 bg-zoom-vignette-2" />
          <div
            className="pointer-events-none absolute inset-0 noise-overlay mix-blend-overlay"
            style={
              { "--noise-size": "260px 260px", "--noise-opacity": "0.06" } as CSSProperties
            }
          />

          {total > 1 ? (
            <div className="pointer-events-none absolute left-6 top-6 rounded-full bg-black/0 px-3 py-1 text-ui-xs font-medium tracking-counter text-white/66 ring-1 ring-white/3">
              {String(activeIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </div>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            className="absolute right-6 top-6 inline-flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-white/65 opacity-70 transition duration-200 hover:bg-white/8 hover:text-white/82 hover:opacity-100"
            aria-label="Cerrar"
          >
            ✕
          </button>

          {total > 1 ? (
            <>
              <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-28 bg-zoom-nav-left opacity-55 md:block" />
              <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-28 bg-zoom-nav-right opacity-55 md:block" />

              <button
                type="button"
                onClick={() => setActiveIndex((prevIdx) => (prevIdx - 1 + total) % total)}
                aria-label="Anterior"
                className="absolute left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/8 text-2xl font-thin text-white/90 ring-1 ring-white/14 backdrop-blur-md opacity-30 transition duration-300 ease-luxe hover:bg-white/12 hover:opacity-58 hover:shadow-zoom-nav-hover hover:scale-[1.015] active:scale-[0.99] md:inline-flex md:opacity-30 md:group-hover:opacity-44 md:group-hover:hover:opacity-58"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setActiveIndex((prevIdx) => (prevIdx + 1) % total)}
                aria-label="Siguiente"
                className="absolute right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/8 text-2xl font-thin text-white/90 ring-1 ring-white/14 backdrop-blur-md opacity-30 transition duration-300 ease-luxe hover:bg-white/12 hover:opacity-58 hover:shadow-zoom-nav-hover hover:scale-[1.015] active:scale-[0.99] md:inline-flex md:opacity-30 md:group-hover:opacity-44 md:group-hover:hover:opacity-58"
              >
                ›
              </button>
            </>
          ) : null}

          {activeItem.meta ? (
            <>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-zoom-meta-fade" />
              <div className="absolute inset-x-0 bottom-0 px-4 py-3 text-xs sm:px-5 sm:py-4">
                {activeItem.meta.split(" • ").map((part, idx) => {
                  const lineClass =
                    idx === 0
                      ? "text-white/72"
                      : idx === 1
                        ? "text-white/62"
                        : "text-ui-lg text-white/66 tracking-meta"
                  return (
                    <div key={`${idx}-${part}`} className={"leading-[1.30] " + lineClass}>
                      {part}
                    </div>
                  )
                })}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </ModalShell>
  )
}
