import { cn, focusRing } from "@/lib/cn"
import Link from "next/link"
import type { ComponentPropsWithoutRef } from "react"

type ButtonVariant = "primary" | "ghost" | "outline" | "soft" | "gold" | "danger" | "icon"
type ButtonRadius = "pill" | "xl"

const base =
  cn(
    "inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium tracking-wide transition disabled:opacity-50",
    focusRing
  )

function variantClasses(variant: ButtonVariant) {
  if (variant === "ghost") return "bg-transparent text-ink-950 hover:bg-ink-100 active:bg-ink-200"
  if (variant === "outline")
    return "bg-white text-ink-950 ring-1 ring-inset ring-black/8 hover:bg-ink-50 active:bg-white"
  if (variant === "soft")
    return "bg-ink-50/70 text-ink-950 ring-1 ring-inset ring-black/8 hover:bg-white active:bg-ink-50/70"
  if (variant === "danger")
    return "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 active:bg-red-50"
  if (variant === "icon")
    return "h-11 w-11 px-0 py-0 border border-black/8 bg-white text-ink-950 hover:bg-ink-50 active:bg-white"
  if (variant === "gold")
    return "bg-antiqueGold text-ink-950 shadow-sm ring-1 ring-inset ring-black/8 hover:bg-antiqueGoldDark active:bg-antiqueGold disabled:bg-antiqueGold disabled:text-ink-950 disabled:opacity-100 disabled:hover:bg-antiqueGold"
  return "bg-ink-950 text-white hover:bg-ink-900 active:bg-ink-950"
}

function radiusClasses(radius: ButtonRadius) {
  if (radius === "xl") return "rounded-control"
  return "rounded-full"
}

export function Button({
  className,
  variant = "primary",
  radius = "pill",
  ...props
}: ComponentPropsWithoutRef<"button"> & { className?: string; variant?: ButtonVariant; radius?: ButtonRadius }) {
  return (
    <button
      className={cn(
        base,
        radiusClasses(radius),
        variantClasses(variant),
        className
      )}
      {...props}
    />
  )
}

export function ButtonLink({
  className,
  variant = "primary",
  radius = "pill",
  ...props
}: ComponentPropsWithoutRef<typeof Link> & { className?: string; variant?: ButtonVariant; radius?: ButtonRadius }) {
  return (
    <Link
      className={cn(
        base,
        radiusClasses(radius),
        variantClasses(variant),
        className
      )}
      {...props}
    />
  )
}

export function ButtonExternal({
  className,
  variant = "primary",
  radius = "pill",
  ...props
}: ComponentPropsWithoutRef<"a"> & { className?: string; variant?: ButtonVariant; radius?: ButtonRadius }) {
  return (
    <a
      className={cn(
        base,
        radiusClasses(radius),
        variantClasses(variant),
        className
      )}
      {...props}
    />
  )
}
