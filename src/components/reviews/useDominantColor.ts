"use client"

import { useEffect, useState } from "react"
import { clamp } from "@/lib/math"

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  const l = (max + min) / 2
  if (d === 0) return { h: 0, s: 0, l }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h = 0
  switch (max) {
    case rn:
      h = ((gn - bn) / d) % 6
      break
    case gn:
      h = (bn - rn) / d + 2
      break
    default:
      h = (rn - gn) / d + 4
      break
  }
  h = h * 60
  if (h < 0) h += 360
  return { h, s, l }
}

function hslToRgb(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hp = h / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  let r1 = 0
  let g1 = 0
  let b1 = 0
  if (hp >= 0 && hp < 1) {
    r1 = c
    g1 = x
  } else if (hp >= 1 && hp < 2) {
    r1 = x
    g1 = c
  } else if (hp >= 2 && hp < 3) {
    g1 = c
    b1 = x
  } else if (hp >= 3 && hp < 4) {
    g1 = x
    b1 = c
  } else if (hp >= 4 && hp < 5) {
    r1 = x
    b1 = c
  } else {
    r1 = c
    b1 = x
  }
  const m = l - c / 2
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255)
  }
}

export function useDominantColor(open: boolean, src: string) {
  const [glowRgb, setGlowRgb] = useState<[number, number, number] | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const img = new window.Image()
    img.decoding = "async"
    img.crossOrigin = "anonymous"
    img.src = src
    img.onload = () => {
      if (cancelled) return
      try {
        const canvas = document.createElement("canvas")
        const size = 42
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext("2d", { willReadFrequently: true })
        if (!ctx) return
        ctx.drawImage(img, 0, 0, size, size)
        const data = ctx.getImageData(0, 0, size, size).data
        let r = 0
        let g = 0
        let b = 0
        let count = 0
        for (let i = 0; i < data.length; i += 16) {
          const a = data[i + 3] ?? 0
          if (a < 180) continue
          r += data[i] ?? 0
          g += data[i + 1] ?? 0
          b += data[i + 2] ?? 0
          count += 1
        }
        if (!count) return
        r = Math.round(r / count)
        g = Math.round(g / count)
        b = Math.round(b / count)

        const hsl = rgbToHsl(r, g, b)
        const tuned = hslToRgb(hsl.h, clamp(hsl.s * 0.65, 0.08, 0.42), clamp(hsl.l * 0.55, 0.12, 0.28))
        setGlowRgb([tuned.r, tuned.g, tuned.b])
      } catch {
        setGlowRgb(null)
      }
    }
    img.onerror = () => {
      if (cancelled) return
      setGlowRgb(null)
    }
    return () => {
      cancelled = true
    }
  }, [open, src])

  return open ? glowRgb : null
}
