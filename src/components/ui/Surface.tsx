import { cn } from "@/lib/cn"
import type { ComponentPropsWithoutRef } from "react"

type SurfaceVariant = "glass" | "solid" | "modal"
type SurfaceRadius = "md" | "lg" | "xl" | "luxe" | "luxe-lg" | "luxe-xl"

function radiusClass(radius: SurfaceRadius) {
  if (radius === "md") return "rounded-xl"
  if (radius === "lg") return "rounded-2xl"
  if (radius === "xl") return "rounded-3xl"
  if (radius === "luxe") return "rounded-luxe"
  if (radius === "luxe-xl") return "rounded-luxe-xl"
  return "rounded-luxe-lg"
}

function variantClass(variant: SurfaceVariant) {
  if (variant === "solid") return "bg-white"
  if (variant === "modal") return "bg-white shadow-modal"
  return "bg-white/70"
}

export function Surface({
  className,
  variant = "glass",
  radius = "luxe-lg",
  ...props
}: ComponentPropsWithoutRef<"div"> & { className?: string; variant?: SurfaceVariant; radius?: SurfaceRadius }) {
  return (
    <div
      className={cn(
        radiusClass(radius),
        variantClass(variant),
        "ring-1 ring-inset ring-black/8",
        className
      )}
      {...props}
    />
  )
}

export function AdminPanel({
  className,
  innerClassName,
  children,
  ...props
}: ComponentPropsWithoutRef<"section"> & { className?: string; innerClassName?: string }) {
  return (
    <section className={cn("rounded-luxe-xl bg-ink-50/60 p-3 ring-1 ring-inset ring-black/8 sm:p-5", className)} {...props}>
      <div className={cn("rounded-3xl border border-black/8 bg-white p-6", innerClassName)}>{children}</div>
    </section>
  )
}
