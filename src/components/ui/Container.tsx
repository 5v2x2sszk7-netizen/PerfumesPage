import { cn } from "@/lib/cn"
import type { ReactNode } from "react"

export function Container({
  className,
  children
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("mx-auto w-full max-w-page px-5 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  )
}
