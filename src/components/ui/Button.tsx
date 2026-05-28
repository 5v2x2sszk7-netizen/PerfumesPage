import { cn } from "@/lib/cn"
import Link from "next/link"
import type { ComponentPropsWithoutRef } from "react"

type ButtonVariant = "primary" | "ghost" | "soft" | "gold"

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium tracking-wide transition focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-antiqueGold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-50"

function variantClasses(variant: ButtonVariant) {
  if (variant === "ghost") return "bg-transparent text-ink-950 hover:bg-ink-100 active:bg-ink-200"
  if (variant === "soft")
    return "bg-white text-ink-950 ring-1 ring-inset ring-black/8 hover:bg-ink-50 active:bg-white"
  if (variant === "gold")
    return "bg-antiqueGold text-ink-950 shadow-sm ring-1 ring-inset ring-black/8 hover:bg-antiqueGoldDark active:bg-antiqueGold disabled:bg-antiqueGold disabled:text-ink-950 disabled:opacity-100 disabled:hover:bg-antiqueGold"
  return "bg-ink-950 text-white hover:bg-ink-900 active:bg-ink-950"
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ComponentPropsWithoutRef<"button"> & { className?: string; variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        base,
        variantClasses(variant),
        className
      )}
      {...props}
    />
  )
}

export function ButtonGhost({
  className,
  variant = "ghost",
  ...props
}: ComponentPropsWithoutRef<"button"> & { className?: string; variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        base,
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
  ...props
}: ComponentPropsWithoutRef<typeof Link> & { className?: string; variant?: ButtonVariant }) {
  return (
    <Link
      className={cn(
        base,
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
  ...props
}: ComponentPropsWithoutRef<"a"> & { className?: string; variant?: ButtonVariant }) {
  return (
    <a
      className={cn(
        base,
        variantClasses(variant),
        className
      )}
      {...props}
    />
  )
}
