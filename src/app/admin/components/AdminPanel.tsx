import { cn } from "@/lib/cn"
import type { ComponentPropsWithoutRef } from "react"

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
