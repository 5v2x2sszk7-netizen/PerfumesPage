import { cn } from "@/lib/cn"
import { Card } from "@/components/ui/Surface"
import type { ComponentPropsWithoutRef } from "react"

export function AdminPanel({
  className,
  innerClassName,
  children,
  ...props
}: ComponentPropsWithoutRef<"section"> & { className?: string; innerClassName?: string }) {
  return (
    <section
      className={cn("rounded-luxe-xl bg-ink-50/60 p-3 ring-1 ring-inset ring-black/8 sm:p-5", className)}
      {...props}
    >
      <Card className={cn("p-6", innerClassName)}>{children}</Card>
    </section>
  )
}
