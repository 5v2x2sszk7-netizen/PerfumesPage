"use client"

import { cn } from "@/lib/cn"
import type { CSSProperties, ReactNode } from "react"
import { useEffect, useMemo, useRef, useState } from "react"

const lazyRevealCallbacks = new WeakMap<Element, () => void>()
let lazyRevealObserver: IntersectionObserver | null = null

function getLazyRevealObserver() {
  if (typeof window === "undefined") return null
  if (lazyRevealObserver) return lazyRevealObserver
  lazyRevealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const cb = lazyRevealCallbacks.get(entry.target)
        if (!cb) continue
        lazyRevealCallbacks.delete(entry.target)
        lazyRevealObserver?.unobserve(entry.target)
        cb()
      }
    },
    { root: null, rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
  )
  return lazyRevealObserver
}

export function LazyReveal({
  children,
  className,
  delayMs,
  style
}: {
  children: ReactNode
  className?: string
  delayMs?: number
  style?: CSSProperties
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  const mergedStyle = useMemo(() => {
    if (!delayMs) return style
    return { ...(style ?? {}), transitionDelay: `${delayMs}ms` }
  }, [delayMs, style])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = getLazyRevealObserver()
    if (!observer) return

    const rect = el.getBoundingClientRect()
    const inView = rect.top < window.innerHeight * 0.92 && rect.bottom > 0
    lazyRevealCallbacks.set(el, () => setVisible(true))
    const raf = window.requestAnimationFrame(() => {
      if (inView) setVisible(true)
      setMounted(true)
    })
    if (!inView) observer.observe(el)
    return () => {
      window.cancelAnimationFrame(raf)
      lazyRevealCallbacks.delete(el)
      observer.unobserve(el)
    }
  }, [])

  return (
    <div
      ref={ref}
      className={cn(mounted ? "reveal" : "", mounted && visible ? "is-visible" : "", className)}
      style={mergedStyle}
    >
      {children}
    </div>
  )
}
