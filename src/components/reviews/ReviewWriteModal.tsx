"use client"

import { useEffect, useState } from "react"
import { Button, ButtonGhost } from "@/components/ui/Button"
import { ReviewForm } from "@/components/reviews/ReviewForm"
import { Surface } from "@/components/ui/Surface"

export function ReviewWriteModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open])

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        variant="soft"
        className="bg-white/70 px-6 py-3 text-ink-800 shadow-sm backdrop-blur hover:bg-white/85 hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
      >
        <span className="text-base leading-none">★</span>
        Compartir experiencia
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div className="my-6 w-full max-w-3xl">
            <Surface variant="glass" radius="luxe-xl" className="bg-ink-50/60 p-3">
              <div className="relative max-h-[90vh] overflow-y-auto rounded-3xl border border-black/8 bg-white px-6 pb-6 pt-5 shadow-[0_30px_90px_rgba(0,0,0,0.25)]">
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
          </div>
        </div>
      ) : null}
    </>
  )
}
