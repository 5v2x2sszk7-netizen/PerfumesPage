import { cn } from "@/lib/cn"
import type { ComponentPropsWithoutRef } from "react"

type FieldVariant = "default" | "pill"
type FieldSize = "md" | "sm"

function fieldClasses(opts: { variant: FieldVariant; size: FieldSize }) {
  const size = opts.size === "sm" ? "h-10" : "h-11"
  if (opts.variant === "pill") {
    return cn(
      size,
      "w-full rounded-full bg-ink-50/70 px-4 text-sm text-ink-950 outline-none ring-1 ring-inset ring-black/8 shadow-[0_6px_16px_rgba(10,10,10,0.02)] transition-[border-color,box-shadow,background-color,transform] duration-200 ease-luxe placeholder:text-ink-500/70",
      "focus:bg-white focus:ring-1 focus:ring-antiqueGold/40 focus:shadow-[0_0_0_3px_rgba(188,149,79,0.08),0_10px_22px_rgba(188,149,79,0.08)]"
    )
  }
  return cn(
    size,
    "w-full rounded-control border border-black/8 bg-white px-4 text-sm text-ink-950 outline-none shadow-[0_6px_16px_rgba(10,10,10,0.02)] transition-[border-color,box-shadow,background-color,transform] duration-200 ease-luxe placeholder:text-ink-400",
    "focus:border-antiqueGold/60 focus:ring-1 focus:ring-antiqueGold/40 focus:shadow-[0_0_0_3px_rgba(188,149,79,0.08),0_10px_22px_rgba(188,149,79,0.08)]"
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
        "min-h-28 w-full resize-y rounded-control border border-black/8 bg-white px-4 py-3 text-sm text-ink-950 outline-none shadow-[0_6px_16px_rgba(10,10,10,0.02)] transition-[border-color,box-shadow,background-color,transform] duration-200 ease-luxe placeholder:text-ink-400 focus:border-antiqueGold/60 focus:ring-1 focus:ring-antiqueGold/40 focus:shadow-[0_0_0_3px_rgba(188,149,79,0.08),0_10px_22px_rgba(188,149,79,0.08)]",
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

export function SelectWithCaret({
  className,
  wrapperClassName,
  variant = "default",
  uiSize = "md",
  ...props
}: ComponentPropsWithoutRef<"select"> & {
  className?: string
  wrapperClassName?: string
  variant?: FieldVariant
  uiSize?: FieldSize
}) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <Select
        className={cn("pr-10", className)}
        variant={variant}
        uiSize={uiSize}
        {...props}
      />
      <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-ink-400">▾</div>
    </div>
  )
}
