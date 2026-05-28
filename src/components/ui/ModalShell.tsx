"use client"

import { cn } from "@/lib/cn"
import type { ReactNode } from "react"
import { useEffect, useRef } from "react"

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
      <div ref={contentRef} className={contentClassName} tabIndex={-1}>
        {children}
      </div>
    </div>
  )
}
