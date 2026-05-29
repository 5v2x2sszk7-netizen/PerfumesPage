"use client"

import Image from "next/image"
import { useEffect, useId, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useDominantColor } from "@/components/reviews/useDominantColor"
import type { GalleryItem, ZoomDialogProps } from "@/components/reviews/ZoomDialog"
import { clamp } from "@/lib/math"

const ZoomDialog = dynamic<ZoomDialogProps>(
  () => import("@/components/reviews/ZoomDialog").then((mod) => mod.ZoomDialog),
  { ssr: false }
)

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
  const dialogId = useId()
  const titleId = useId()
  const closeTimeout = useRef<number | null>(null)

  const items = useMemo<GalleryItem[]>(() => {
    if (gallery?.items?.length) return gallery.items
    return [{ src, alt, meta }]
  }, [alt, gallery?.items, meta, src])

  const total = items.length
  const activeItem = items[clamp(activeIndex, 0, total - 1)] ?? items[0]!
  const glowRgb = useDominantColor(open, activeItem.src)

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
    }
  }, [])

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

      <ZoomDialog
        open={open}
        closing={closing}
        dialogId={dialogId}
        titleId={titleId}
        items={items}
        activeIndex={clamp(activeIndex, 0, total - 1)}
        setActiveIndex={setActiveIndex}
        activeItem={activeItem}
        glowRgb={glowRgb}
        onClose={close}
        dialogImageClassName={dialogImageClassName}
      />
    </>
  )
}
