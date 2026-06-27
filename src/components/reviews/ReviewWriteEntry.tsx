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
        className="bg-white/70 px-6 py-3 text-ink-800 shadow-sm backdrop-blur hover:bg-white/85 hover:shadow-soft-hover"
      >
        <span className="text-base leading-none">★</span>
        Compartir experiencia
      </Button>

      {open ? (
        <ModalSheet open={open} onClose={() => setOpen(false)} kicker="OPINIÓN" title="Escribe tu reseña">
          <ReviewForm photoUploadsEnabled={photoUploadsEnabled} />
        </ModalSheet>
      ) : null}
    </>
  )
}
