"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { ModalSheet } from "@/components/ui/ModalShell"

const ReviewForm = dynamic(() => import("./ReviewForm").then((m) => m.ReviewForm), {
  ssr: false
})

export function ReviewWriteEntry({ photoUploadsEnabled }: { photoUploadsEnabled: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        variant="soft"
        className="justify-center bg-white/70 px-6 py-3 text-ink-800 shadow-sm backdrop-blur hover:bg-white/85 hover:shadow-soft-hover"
      >
        <span className="inline-flex items-center justify-center gap-2.5">
          <span className="inline-flex h-4 w-4 items-center justify-center text-[15px] leading-none">★</span>
          <span className="leading-none">Compartir experiencia</span>
        </span>
      </Button>

      {open ? (
        <ModalSheet open={open} onClose={() => setOpen(false)} kicker="OPINIÓN" title="Escribe tu reseña">
          <ReviewForm photoUploadsEnabled={photoUploadsEnabled} />
        </ModalSheet>
      ) : null}
    </>
  )
}
