"use client"

import { cn } from "@/lib/cn"
import type { CSSProperties, ReactNode } from "react"
import { useEffect, useMemo, useRef, useState } from "react"

type InViewOnceOptions = {
  rootMargin: string
  threshold: number | number[]
  initialInView?: (rect: DOMRect, viewportHeight: number) => boolean
}

type ObserverEntry = {
  observer: IntersectionObserver
  callbacks: WeakMap<Element, () => void>
}

const inViewOnceRegistry = new Map<string, ObserverEntry>()

function getObserverEntry(opts: Pick<InViewOnceOptions, "rootMargin" | "threshold">) {
  if (typeof window === "undefined") return null
  const key = `${opts.rootMargin}|${Array.isArray(opts.threshold) ? opts.threshold.join(",") : String(opts.threshold)}`
  const cached = inViewOnceRegistry.get(key)
  if (cached) return cached

  const callbacks = new WeakMap<Element, () => void>()
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const cb = callbacks.get(entry.target)
        if (!cb) continue
        callbacks.delete(entry.target)
        observer.unobserve(entry.target)
        cb()
      }
    },
    { root: null, rootMargin: opts.rootMargin, threshold: opts.threshold }
  )
  const entry = { observer, callbacks }
  inViewOnceRegistry.set(key, entry)
  return entry
}

export function useInViewOnce<T extends Element>(opts: InViewOnceOptions) {
  const { rootMargin, threshold, initialInView } = opts
  const ref = useRef<T | null>(null)
  const [ready, setReady] = useState(false)
  const [inView, setInView] = useState(false)
  const initialInViewRef = useRef<InViewOnceOptions["initialInView"]>(initialInView)
  const thresholdKey = Array.isArray(threshold) ? threshold.join(",") : String(threshold)

  useEffect(() => {
    initialInViewRef.current = initialInView
  }, [initialInView])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const entry = getObserverEntry({ rootMargin, threshold })
    if (!entry) return

    const rect = el.getBoundingClientRect()
    const viewportHeight = window.innerHeight || 0
    const initialInView = initialInViewRef.current
    const isInitiallyInView = initialInView ? initialInView(rect, viewportHeight) : rect.top < viewportHeight && rect.bottom > 0

    entry.callbacks.set(el, () => setInView(true))
    const raf = window.requestAnimationFrame(() => {
      if (isInitiallyInView) setInView(true)
      setReady(true)
    })

    if (!isInitiallyInView) entry.observer.observe(el)

    return () => {
      window.cancelAnimationFrame(raf)
      entry.callbacks.delete(el)
      entry.observer.unobserve(el)
    }
  }, [rootMargin, thresholdKey, threshold])

  return { ref, ready, inView }
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
  const { ref, ready, inView } = useInViewOnce<HTMLDivElement>({
    rootMargin: "0px 0px -10% 0px",
    threshold: 0.12,
    initialInView: (rect, viewportHeight) => rect.top < viewportHeight * 0.92 && rect.bottom > 0
  })

  const mergedStyle = useMemo(() => {
    if (!delayMs) return style
    return { ...(style ?? {}), transitionDelay: `${delayMs}ms` }
  }, [delayMs, style])

  return (
    <div
      ref={ref}
      className={cn(ready ? "reveal" : "", ready && inView ? "is-visible" : "", className)}
      style={mergedStyle}
    >
      {children}
    </div>
  )
}
