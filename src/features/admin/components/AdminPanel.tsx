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
      className={cn(
        "rounded-luxe-xl bg-gradient-to-b from-ink-50/70 to-white/40 p-2.5 ring-1 ring-inset ring-black/7 sm:p-3.5",
        className
      )}
      {...props}
    >
      <Card className={cn("bg-white/82 p-5 shadow-[0_14px_30px_rgba(10,10,10,0.035)] sm:p-6", innerClassName)}>{children}</Card>
    </section>
  )
}
