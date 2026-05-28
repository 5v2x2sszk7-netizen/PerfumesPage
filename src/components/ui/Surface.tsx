import { cn } from "@/lib/cn"
import type { ComponentPropsWithoutRef } from "react"

type SurfaceVariant = "glass" | "solid"
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

export const Card = Surface
