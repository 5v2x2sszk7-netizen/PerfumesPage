"use client"

import { useState } from "react"
import { Button, ButtonGhost } from "@/components/ui/Button"
import { ReviewForm } from "@/components/reviews/ReviewForm"
import { ModalShell } from "@/components/ui/ModalShell"
import { Surface } from "@/components/ui/Surface"

export function ReviewWriteModal() {
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
        <ModalShell
          open={open}
          onClose={() => setOpen(false)}
          placement="top"
          contentClassName="my-6 w-full max-w-3xl"
        >
          <Surface variant="glass" radius="luxe-xl" className="bg-ink-50/60 p-3">
            <div className="relative max-h-[90vh] overflow-y-auto rounded-3xl border border-black/8 bg-white px-6 pb-6 pt-5 shadow-modal-soft">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs tracking-[0.25em] text-ink-500">OPINIÓN</p>
                  <h2 className="font-display text-2xl text-ink-950">Escribe tu reseña</h2>
                </div>
              </div>
              <ButtonGhost
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-4 top-4 h-11 w-11 border border-black/8 bg-white px-0 hover:bg-ink-50"
                aria-label="Cerrar"
              >
                ✕
              </ButtonGhost>

              <div className="mt-4">
                <ReviewForm />
              </div>
            </div>
          </Surface>
        </ModalShell>
      ) : null}
    </>
  )
}
