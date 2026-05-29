"use client"

import type { ReactNode } from "react"
import { useInViewOnce } from "@/components/ui/LazyReveal"

export function LazyMount({
  children,
  fallback
}: {
  children: ReactNode
  fallback?: ReactNode
}) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>({
    rootMargin: "220px 0px",
    threshold: 0.01,
    initialInView: (rect, viewportHeight) => rect.top < viewportHeight * 1.2 && rect.bottom > -200
  })

  return <div ref={ref}>{inView ? children : fallback ?? null}</div>
}
