import { cn } from "@/lib/cn"
import type { ComponentPropsWithoutRef } from "react"
import type { PerfumeAvailability } from "@/types/perfume"

type BadgeTone = "neutral" | "neutral-muted" | "gold"
type BadgeSize = "xs" | "sm" | "md"

function sizeClass(size: BadgeSize) {
  if (size === "xs") return "px-3 py-1 text-[10px] font-medium tracking-[0.18em]"
  if (size === "md") return "px-5 py-2.5 text-sm font-medium tracking-wide"
  return "px-4 py-1.5 text-[10px] font-medium tracking-[0.22em]"
}

function toneClass(tone: BadgeTone) {
  if (tone === "gold") return "bg-antiqueGold/10 text-ink-900 ring-antiqueGold/22"
  if (tone === "neutral-muted") return "bg-white/55 text-ink-600 ring-black/8"
  return "bg-white/70 text-ink-700 ring-black/8"
}

export function Badge({
  className,
  tone = "neutral",
  size = "sm",
  blur = true,
  ...props
}: ComponentPropsWithoutRef<"span"> & { className?: string; tone?: BadgeTone; size?: BadgeSize; blur?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full ring-1 ring-inset whitespace-nowrap",
        blur ? "backdrop-blur-sm" : "",
        sizeClass(size),
        toneClass(tone),
        className
      )}
      {...props}
    />
  )
}

export function availabilityBadgeTone(availability: PerfumeAvailability): BadgeTone {
  if (availability === "low_stock") return "gold"
  if (availability === "out_of_stock") return "neutral-muted"
  return "neutral"
}
