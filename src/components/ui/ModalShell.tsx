"use client"

import { cn } from "@/lib/cn"
import { Surface } from "@/components/ui/Surface"
import { Button } from "@/components/ui/Button"
import type { ReactNode } from "react"
import { useEffect, useRef } from "react"

type Props = {
  open: boolean
  onClose: () => void
  children: ReactNode
  placement?: "center" | "top"
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  overlayTone?: "dim" | "none"
  zIndex?: string
  id?: string
  ariaLabelledby?: string
  ariaLabel?: string
  overlayClassName?: string
  contentClassName?: string
}

function getFocusable(container: HTMLElement) {
  const selector =
    'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'
  const list = Array.from(container.querySelectorAll<HTMLElement>(selector))
  return list.filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1 && el.getClientRects().length > 0)
}

export function ModalShell({
  open,
  onClose,
  children,
  placement = "center",
  closeOnBackdrop = true,
  closeOnEscape = true,
  overlayTone = "dim",
  zIndex = "z-modal",
  id,
  ariaLabelledby,
  ariaLabel,
  overlayClassName,
  contentClassName = "w-full",
}: Props) {
  const contentRef = useRef<HTMLDivElement | null>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    queueMicrotask(() => {
      const root = contentRef.current
      if (!root) return
      const focusables = getFocusable(root)
      const first = focusables[0]
      if (first) first.focus()
      else root.focus()
    })
    return () => {
      restoreFocusRef.current?.focus?.()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && closeOnEscape) {
        onClose()
        return
      }
      if (e.key !== "Tab") return
      const root = contentRef.current
      if (!root) return
      const focusables = getFocusable(root)
      if (!focusables.length) {
        e.preventDefault()
        root.focus()
        return
      }
      const first = focusables[0]!
      const last = focusables[focusables.length - 1]!
      const active = document.activeElement
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, closeOnEscape, onClose])

  if (!open) return null

  return (
    <div
      id={id}
      className={cn(
        "fixed inset-0 flex justify-center p-4",
        zIndex,
        overlayTone === "dim" ? "bg-black/40" : "",
        placement === "top" ? "items-start overflow-y-auto" : "items-center",
        overlayClassName
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledby}
      aria-label={ariaLabel}
      onMouseDown={(e) => {
        if (!closeOnBackdrop) return
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div ref={contentRef} className={contentClassName} tabIndex={-1}>
        {children}
      </div>
    </div>
  )
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  busy,
  kicker = "CONFIRMAR",
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmTone = "danger",
  contentClassName = "w-full max-w-md"
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  busy: boolean
  kicker?: string
  title: string
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  confirmTone?: "danger" | "gold"
  contentClassName?: string
}) {
  return (
    <ModalShell open={open} onClose={onClose} contentClassName={contentClassName}>
      <Surface variant="modal" radius="xl" className="w-full p-6">
        <p className="text-xs tracking-section text-ink-500">{kicker}</p>
        <h2 className="mt-2 font-display text-2xl text-ink-950">{title}</h2>
        <div className="mt-3 text-sm text-ink-700">{description}</div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            radius="xl"
            className="w-full px-4 py-2.5 text-sm sm:w-auto"
            onClick={onClose}
            disabled={busy}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmTone === "gold" ? "gold" : "danger"}
            radius="xl"
            className={cn("w-full px-4 py-2.5 text-sm sm:w-auto", confirmTone === "gold" ? "hover:shadow-cta-hover" : "")}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </Button>
        </div>
      </Surface>
    </ModalShell>
  )
}

export function ModalSheet({
  open,
  onClose,
  kicker,
  title,
  children,
  contentClassName = "my-3 w-full max-w-3xl sm:my-6"
}: {
  open: boolean
  onClose: () => void
  kicker: string
  title: string
  children: ReactNode
  contentClassName?: string
}) {
  return (
    <ModalShell open={open} onClose={onClose} placement="top" contentClassName={contentClassName}>
      <Surface variant="glass" radius="luxe-xl" className="bg-ink-50/60 p-2 sm:p-3">
        <div className="relative max-h-[min(88vh,760px)] overflow-y-auto rounded-luxe-xl border border-black/8 bg-white px-4 pb-5 pt-4 shadow-modal-soft sm:max-h-modal-sheet sm:px-6 sm:pb-6 sm:pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs tracking-section text-ink-500">{kicker}</p>
              <h2 className="font-display text-xl text-ink-950 sm:text-2xl">{title}</h2>
            </div>
          </div>
          <Button
            type="button"
            variant="icon"
            onClick={onClose}
            radius="xl"
            className="absolute right-4 top-4"
            aria-label="Cerrar"
          >
            ✕
          </Button>
          <div className="mt-4">{children}</div>
        </div>
      </Surface>
    </ModalShell>
  )
}

export function ModalCard({
  open,
  onClose,
  kicker,
  title,
  description,
  children,
  footer,
  contentClassName = "w-full max-w-md"
}: {
  open: boolean
  onClose: () => void
  kicker: string
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  contentClassName?: string
}) {
  return (
    <ModalShell open={open} onClose={onClose} contentClassName={contentClassName}>
      <Surface variant="modal" radius="xl" className="w-full p-6">
        <p className="text-xs tracking-section text-ink-500">{kicker}</p>
        <h2 className="mt-2 font-display text-2xl text-ink-950">{title}</h2>
        {description ? <div className="mt-3 text-sm text-ink-700">{description}</div> : null}
        {children}
        {footer}
      </Surface>
    </ModalShell>
  )
}
