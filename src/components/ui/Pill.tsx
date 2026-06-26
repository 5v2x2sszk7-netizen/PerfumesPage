import { cn, focusRing } from "@/lib/cn"
import type { ComponentPropsWithoutRef } from "react"

type PillVariant = "catalog" | "admin"

function baseClass(variant: PillVariant) {
  if (variant === "catalog") {
    return cn(
      "inline-flex h-10 items-center justify-center rounded-full px-5 text-ui-sm font-medium tracking-ui ring-1 ring-inset transition-luxe-wide duration-luxe-fast ease-luxe",
      focusRing
    )
  }
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium tracking-wide transition duration-luxe-fast ease-luxe disabled:opacity-50",
    focusRing
  )
}

function stateClass(variant: PillVariant, active: boolean) {
  if (variant === "catalog") {
    return active
      ? "bg-white text-ink-950 ring-antiqueGold/28 shadow-pill-active"
      : "bg-ink-50/70 text-ink-700 ring-black/8 hover:bg-white"
  }
  return active
    ? "border-antiqueGold/50 bg-antiqueGold/12 text-ink-950 shadow-[0_8px_18px_rgba(188,149,79,0.12)]"
    : "border-black/8 bg-white/72 text-ink-700 hover:bg-ink-50"
}

export function Pill({
  className,
  active = false,
  variant = "admin",
  ...props
}: ComponentPropsWithoutRef<"button"> & { className?: string; active?: boolean; variant?: PillVariant }) {
  return (
    <button
      {...props}
      aria-pressed={props["aria-pressed"] ?? active}
      className={cn(baseClass(variant), stateClass(variant, active), className)}
    />
  )
}
