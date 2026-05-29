import { cn } from "@/lib/cn"
import type { ComponentPropsWithoutRef } from "react"

type SurfaceVariant = "glass" | "solid" | "modal"
type SurfaceRadius = "md" | "lg" | "xl" | "luxe" | "luxe-lg" | "luxe-xl"

type SharedRadius = Exclude<SurfaceRadius, "md">

function sharedRadiusClass(radius: SharedRadius) {
  if (radius === "lg") return "rounded-2xl"
  if (radius === "xl") return "rounded-3xl"
  if (radius === "luxe") return "rounded-luxe"
  if (radius === "luxe-xl") return "rounded-luxe-xl"
  return "rounded-luxe-lg"
}

function radiusClass(radius: SurfaceRadius) {
  if (radius === "md") return "rounded-xl"
  return sharedRadiusClass(radius)
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

type CardTone = "solid" | "glass"
type CardRadius = SharedRadius

function cardToneClass(tone: CardTone) {
  return tone === "glass" ? "bg-white/70" : "bg-white"
}

export function Card({
  className,
  tone = "solid",
  radius = "xl",
  ...props
}: ComponentPropsWithoutRef<"div"> & { className?: string; tone?: CardTone; radius?: CardRadius }) {
  return (
    <div
      className={cn(
        sharedRadiusClass(radius),
        cardToneClass(tone),
        "border border-black/8",
        className
      )}
      {...props}
    />
  )
}
