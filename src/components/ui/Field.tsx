import { cn } from "@/lib/cn"
import type { ComponentPropsWithoutRef } from "react"

type FieldVariant = "default" | "pill"
type FieldSize = "md" | "sm"

function fieldClasses(opts: { variant: FieldVariant; size: FieldSize }) {
  const size = opts.size === "sm" ? "h-10" : "h-11"
  if (opts.variant === "pill") {
    return cn(
      size,
      "w-full rounded-full bg-ink-50/70 px-4 text-sm text-ink-950 outline-none ring-1 ring-inset ring-black/8 transition duration-luxe-fast ease-luxe placeholder:text-ink-500/70",
      "focus:bg-white focus:ring-1 focus:ring-antiqueGold/35"
    )
  }
  return cn(
    size,
    "w-full rounded-xl border border-black/8 bg-white px-4 text-sm text-ink-950 outline-none transition duration-luxe-fast ease-luxe placeholder:text-ink-400",
    "focus:border-antiqueGold/60 focus:ring-1 focus:ring-antiqueGold/35"
  )
}

export function Label({
  className,
  ...props
}: ComponentPropsWithoutRef<"label"> & { className?: string }) {
  return (
    <label className={cn("text-sm font-medium text-ink-800", className)} {...props} />
  )
}

export function Input({
  className,
  variant = "default",
  uiSize = "md",
  ...props
}: ComponentPropsWithoutRef<"input"> & { className?: string; variant?: FieldVariant; uiSize?: FieldSize }) {
  return (
    <input
      className={cn(
        fieldClasses({ variant, size: uiSize }),
        className
      )}
      {...props}
    />
  )
}

export function Textarea({
  className,
  ...props
}: ComponentPropsWithoutRef<"textarea"> & { className?: string }) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full resize-y rounded-xl border border-black/8 bg-white px-4 py-3 text-sm text-ink-950 outline-none transition duration-luxe-fast ease-luxe placeholder:text-ink-400 focus:border-antiqueGold/60 focus:ring-1 focus:ring-antiqueGold/35",
        className
      )}
      {...props}
    />
  )
}

export function Select({
  className,
  variant = "default",
  uiSize = "md",
  ...props
}: ComponentPropsWithoutRef<"select"> & { className?: string; variant?: FieldVariant; uiSize?: FieldSize }) {
  return (
    <select
      className={cn(
        fieldClasses({ variant, size: uiSize }),
        "appearance-none",
        className
      )}
      {...props}
    />
  )
}
