"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

const lazyMountCallbacks = new WeakMap<Element, () => void>()
let lazyMountObserver: IntersectionObserver | null = null

function getLazyMountObserver() {
  if (typeof window === "undefined") return null
  if (lazyMountObserver) return lazyMountObserver
  lazyMountObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const cb = lazyMountCallbacks.get(entry.target)
        if (!cb) continue
        lazyMountCallbacks.delete(entry.target)
        lazyMountObserver?.unobserve(entry.target)
        cb()
      }
    },
    { root: null, rootMargin: "220px 0px", threshold: 0.01 }
  )
  return lazyMountObserver
}

export function LazyMount({
  children,
  fallback
}: {
  children: ReactNode
  fallback?: ReactNode
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = getLazyMountObserver()
    if (!observer) return

    const rect = el.getBoundingClientRect()
    const inView = rect.top < window.innerHeight * 1.2 && rect.bottom > -200
    lazyMountCallbacks.set(el, () => setMounted(true))
    if (!inView) observer.observe(el)
    if (inView) setMounted(true)
    return () => {
      lazyMountCallbacks.delete(el)
      observer.unobserve(el)
    }
  }, [])

  return <div ref={ref}>{mounted ? children : fallback ?? null}</div>
}

