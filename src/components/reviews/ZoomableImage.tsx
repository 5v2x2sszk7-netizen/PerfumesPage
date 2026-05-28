"use client"

import Image from "next/image"
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react"
import { createPortal } from "react-dom"

type GalleryItem = {
  src: string
  alt: string
  meta?: string
}

type ZoomableImageProps = {
  src: string
  alt: string
  sizes: string
  meta?: string
  gallery?: { items: GalleryItem[]; index: number }
  wrapperClassName?: string
  frameClassName?: string
  imageClassName?: string
  dialogImageClassName?: string
}

export function ZoomableImage({
  src,
  alt,
  sizes,
  meta,
  gallery,
  wrapperClassName,
  frameClassName,
  imageClassName,
  dialogImageClassName
}: ZoomableImageProps) {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [glowRgb, setGlowRgb] = useState<[number, number, number] | null>(null)
  const [parallax, setParallax] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const dialogId = useId()
  const titleId = useId()
  const touchStartX = useRef<number | null>(null)
  const closeTimeout = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const pendingRef = useRef<{ x: number; y: number } | null>(null)

  const items = useMemo<GalleryItem[]>(() => {
    if (gallery?.items?.length) return gallery.items
    return [{ src, alt, meta }]
  }, [alt, gallery?.items, meta, src])

  const total = items.length
  const activeItem = items[Math.min(Math.max(activeIndex, 0), total - 1)] ?? items[0]!

  function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value))
  }

  function rgbToHsl(r: number, g: number, b: number) {
    const rn = r / 255
    const gn = g / 255
    const bn = b / 255
    const max = Math.max(rn, gn, bn)
    const min = Math.min(rn, gn, bn)
    const d = max - min
    const l = (max + min) / 2
    if (d === 0) return { h: 0, s: 0, l }
    const s = d / (1 - Math.abs(2 * l - 1))
    let h = 0
    switch (max) {
      case rn:
        h = ((gn - bn) / d) % 6
        break
      case gn:
        h = (bn - rn) / d + 2
        break
      default:
        h = (rn - gn) / d + 4
        break
    }
    h = h * 60
    if (h < 0) h += 360
    return { h, s, l }
  }

  function hslToRgb(h: number, s: number, l: number) {
    const c = (1 - Math.abs(2 * l - 1)) * s
    const hp = h / 60
    const x = c * (1 - Math.abs((hp % 2) - 1))
    let r1 = 0
    let g1 = 0
    let b1 = 0
    if (hp >= 0 && hp < 1) {
      r1 = c
      g1 = x
    } else if (hp >= 1 && hp < 2) {
      r1 = x
      g1 = c
    } else if (hp >= 2 && hp < 3) {
      g1 = c
      b1 = x
    } else if (hp >= 3 && hp < 4) {
      g1 = x
      b1 = c
    } else if (hp >= 4 && hp < 5) {
      r1 = x
      b1 = c
    } else {
      r1 = c
      b1 = x
    }
    const m = l - c / 2
    return {
      r: Math.round((r1 + m) * 255),
      g: Math.round((g1 + m) * 255),
      b: Math.round((b1 + m) * 255)
    }
  }

  function close() {
    if (closeTimeout.current) window.clearTimeout(closeTimeout.current)
    setClosing(true)
    closeTimeout.current = window.setTimeout(() => {
      setOpen(false)
      setClosing(false)
      closeTimeout.current = null
    }, 240)
  }

  function openModal() {
    if (closeTimeout.current) window.clearTimeout(closeTimeout.current)
    setClosing(false)
    const nextIndex = gallery?.items?.length ? Math.max(0, Math.min(total - 1, gallery.index)) : 0
    setActiveIndex(nextIndex)
    setOpen(true)
  }

  useEffect(() => {
    return () => {
      if (closeTimeout.current) window.clearTimeout(closeTimeout.current)
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close()
      if (e.key === "ArrowLeft" && total > 1) {
        setActiveIndex((prevIdx) => (prevIdx - 1 + total) % total)
      }
      if (e.key === "ArrowRight" && total > 1) {
        setActiveIndex((prevIdx) => (prevIdx + 1) % total)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open, total])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const img = new window.Image()
    img.decoding = "async"
    img.crossOrigin = "anonymous"
    img.src = activeItem.src
    img.onload = () => {
      if (cancelled) return
      try {
        const canvas = document.createElement("canvas")
        const size = 42
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext("2d", { willReadFrequently: true })
        if (!ctx) return
        ctx.drawImage(img, 0, 0, size, size)
        const data = ctx.getImageData(0, 0, size, size).data
        let r = 0
        let g = 0
        let b = 0
        let count = 0
        for (let i = 0; i < data.length; i += 16) {
          const a = data[i + 3] ?? 0
          if (a < 180) continue
          r += data[i] ?? 0
          g += data[i + 1] ?? 0
          b += data[i + 2] ?? 0
          count += 1
        }
        if (!count) return
        r = Math.round(r / count)
        g = Math.round(g / count)
        b = Math.round(b / count)

        const hsl = rgbToHsl(r, g, b)
        const tuned = hslToRgb(hsl.h, clamp(hsl.s * 0.65, 0.08, 0.42), clamp(hsl.l * 0.55, 0.12, 0.28))
        setGlowRgb([tuned.r, tuned.g, tuned.b])
      } catch {
        setGlowRgb(null)
      }
    }
    img.onerror = () => {
      if (cancelled) return
      setGlowRgb(null)
    }
    return () => {
      cancelled = true
    }
  }, [activeItem.src, open])

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={(wrapperClassName ?? "") + " text-left cursor-zoom-in"}
        aria-haspopup="dialog"
        aria-controls={open ? dialogId : undefined}
        aria-label="Ampliar imagen"
      >
        <div className={frameClassName ?? "relative"}>
          <Image src={src} alt={alt} fill className={imageClassName} sizes={sizes} />
        </div>
      </button>

      {open
        ? createPortal(
            <div
              id={dialogId}
              className={
                "fixed inset-0 z-zoom flex items-start justify-center overflow-y-auto p-1 pt-8 pb-4 sm:p-4 sm:pt-10 sm:pb-6 " +
                (closing ? "modal-overlay-out" : "modal-overlay-in")
              }
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) close()
              }}
            >
              <div
                className={"relative w-full max-w-6xl " + (closing ? "modal-pop-out" : "modal-pop")}
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
                  className="group relative h-[86vh] overflow-hidden rounded-luxe-dialog border border-whiteA-4 bg-inkModal shadow-zoom-modal sm:h-[88vh]"
                  style={
                    glowRgb
                      ? ({
                          ["--glow-rgb" as never]: `${glowRgb[0]} ${glowRgb[1]} ${glowRgb[2]}`
                        } as CSSProperties)
                      : undefined
                  }
                >
                  <p id={titleId} className="sr-only">
                    {activeItem.alt}
                  </p>

                  <div className="pointer-events-none absolute inset-0 bg-zoom-overlay" />
                  <div className="pointer-events-none absolute left-1/2 top-[60%] h-[640px] w-[640px] -translate-x-1/2 rounded-full bg-zoom-glow-1 opacity-32 blur-[140px] sm:h-[820px] sm:w-[820px]" />
                  <div className="pointer-events-none absolute left-1/2 top-[68%] h-[760px] w-[760px] -translate-x-1/2 rounded-full bg-zoom-glow-2 opacity-24 blur-[160px] sm:h-[960px] sm:w-[960px]" />
                  {glowRgb ? (
                    <div className="pointer-events-none absolute inset-0 bg-zoom-dynamic-glow opacity-65 transition-opacity duration-luxe-fast ease-luxe" />
                  ) : null}

                  <div
                    className="absolute inset-0"
                    style={{
                      transform: `translate3d(${parallax.x}px, ${parallax.y}px, 0) translateY(-10px) scale(1.12)`,
                      transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)"
                    }}
                  >
                    <div className={"absolute inset-0 " + (closing ? "modal-image-out" : "modal-image")}>
                    <Image
                      key={activeItem.src}
                      src={activeItem.src}
                      alt={activeItem.alt}
                      fill
                      className={dialogImageClassName ?? "object-contain"}
                      sizes="(max-width: 768px) 95vw, 1100px"
                    />
                  </div>
                  </div>

                  <div className="pointer-events-none absolute inset-0 bg-zoom-vignette-1" />

                  <div className="pointer-events-none absolute inset-0 shadow-zoom-inset" />
                  <div className="pointer-events-none absolute inset-0 bg-zoom-vignette-2" />
                  <div
                    className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
                    style={{
                      backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%27160%27%20height%3D%27160%27%3E%3Cfilter%20id%3D%27n%27%3E%3CfeTurbulence%20type%3D%27fractalNoise%27%20baseFrequency%3D%270.85%27%20numOctaves%3D%274%27%20stitchTiles%3D%27stitch%27/%3E%3C/filter%3E%3Crect%20width%3D%27160%27%20height%3D%27160%27%20filter%3D%27url(%23n)%27%20opacity%3D%270.35%27/%3E%3C/svg%3E\")",
                      backgroundSize: "260px 260px"
                    }}
                  />

                  {total > 1 ? (
                    <div className="pointer-events-none absolute left-6 top-6 rounded-full bg-black/0 px-3 py-1 text-ui-xs font-medium tracking-[0.16em] text-white/66 ring-1 ring-white/3">
                      {String(activeIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={close}
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
                                : "text-ui-lg text-white/66 tracking-[0.21em]"
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
            </div>,
            document.body
          )
        : null}
    </>
  )
}
