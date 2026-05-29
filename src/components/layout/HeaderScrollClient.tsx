"use client"

import { useEffect } from "react"

function splitTokens(value: string) {
  return value.split(/\s+/g).map((v) => v.trim()).filter(Boolean)
}

export function HeaderScrollClient({
  targetId,
  topClassName,
  scrolledClassName,
  threshold = 8
}: {
  targetId: string
  topClassName: string
  scrolledClassName: string
  threshold?: number
}) {
  useEffect(() => {
    const el = document.getElementById(targetId)
    if (!el) return

    const topTokens = splitTokens(topClassName)
    const scrolledTokens = splitTokens(scrolledClassName)

    let raf = 0
    const apply = (isScrolled: boolean) => {
      if (isScrolled) {
        for (const t of topTokens) el.classList.remove(t)
        for (const t of scrolledTokens) el.classList.add(t)
      } else {
        for (const t of scrolledTokens) el.classList.remove(t)
        for (const t of topTokens) el.classList.add(t)
      }
    }

    const onScroll = () => {
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        apply(window.scrollY > threshold)
      })
    }

    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      window.removeEventListener("scroll", onScroll)
    }
  }, [scrolledClassName, targetId, threshold, topClassName])

  return null
}

