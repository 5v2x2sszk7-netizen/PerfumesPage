"use client"

import { cn } from "@/lib/cn"
import type { ReactNode } from "react"
import { useEffect } from "react"

type Props = {
  open: boolean
  onClose: () => void
  children: ReactNode
  placement?: "center" | "top"
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  overlayClassName?: string
  contentClassName?: string
}

export function ModalShell({
  open,
  onClose,
  children,
  placement = "center",
  closeOnBackdrop = true,
  closeOnEscape = true,
  overlayClassName,
  contentClassName = "w-full",
}: Props) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open || !closeOnEscape) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, closeOnEscape, onClose])

  if (!open) return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-modal flex justify-center bg-black/40 p-4",
        placement === "top" ? "items-start overflow-y-auto" : "items-center",
        overlayClassName
      )}
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (!closeOnBackdrop) return
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={contentClassName}>{children}</div>
    </div>
  )
}
