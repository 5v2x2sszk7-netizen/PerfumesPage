"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { clearActiveCheckoutReservation, onActiveCheckoutReservationChange, readActiveCheckoutReservation } from "@/lib/checkout/clientReservation"

function splitTokens(value: string) {
  return value.split(/\s+/g).map((v) => v.trim()).filter(Boolean)
}

function formatMinutesAndSeconds(totalMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(totalMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

type ReservationBannerState = {
  orderId: string
  provider: "mercado_pago" | "paypal"
  expiresAt: string
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
  const pathname = usePathname()
  const [reservation, setReservation] = useState<ReservationBannerState | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

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

  const syncReservation = useCallback(() => {
    let cancelled = false
    const stored = readActiveCheckoutReservation()
    if (!stored) {
      setReservation(null)
      return () => {
        cancelled = true
      }
    }

    const expiresAtMs = new Date(stored.expiresAt).getTime()
    if (Number.isNaN(expiresAtMs) || expiresAtMs <= Date.now()) {
      clearActiveCheckoutReservation(stored.orderId)
      setReservation(null)
      return () => {
        cancelled = true
      }
    }

    setReservation({
      orderId: stored.orderId,
      provider: stored.provider,
      expiresAt: stored.expiresAt
    })

    fetch(`/api/checkout/reservation?orderId=${encodeURIComponent(stored.orderId)}`, {
      cache: "no-store"
    })
      .then(async (response) => {
        const json = (await response.json().catch(() => null)) as
          | {
              ok?: boolean
              active?: boolean
              provider?: ReservationBannerState["provider"]
              reservationExpiresAt?: string | null
            }
          | null

        if (cancelled) return

        if (!response.ok || !json?.ok || !json.active || !json.provider || !json.reservationExpiresAt) {
          clearActiveCheckoutReservation(stored.orderId)
          setReservation(null)
          return
        }

        setReservation({
          orderId: stored.orderId,
          provider: json.provider,
          expiresAt: json.reservationExpiresAt
        })
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const cleanupSync = syncReservation()
    const unsubscribe = onActiveCheckoutReservationChange(() => {
      syncReservation()
    })

    const onFocus = () => {
      syncReservation()
    }

    window.addEventListener("focus", onFocus)
    return () => {
      cleanupSync()
      unsubscribe()
      window.removeEventListener("focus", onFocus)
    }
  }, [syncReservation])

  useEffect(() => {
    if (!reservation) return

    const tick = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(tick)
    }
  }, [reservation])

  const remainingMs = useMemo(() => {
    if (!reservation) return 0
    const expiresAtMs = new Date(reservation.expiresAt).getTime()
    if (Number.isNaN(expiresAtMs)) return 0
    return expiresAtMs - nowMs
  }, [nowMs, reservation])

  const shouldShowBanner = Boolean(reservation && remainingMs > 0 && !pathname.startsWith("/checkout"))
  const providerLabel = reservation?.provider === "paypal" ? "PayPal" : "Mercado Pago"

  return shouldShowBanner ? (
    <div className="border-b border-black/6 bg-white/72 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-700">
          Reserva activa · {providerLabel} · {formatMinutesAndSeconds(remainingMs)}
        </p>
        <div className="flex items-center gap-3 text-xs text-ink-600">
          <span className="hidden sm:inline">Puede aparecer como agotado mientras completas el pago.</span>
          <Link href="/checkout" className="font-medium text-ink-950 underline decoration-black/20 underline-offset-4 hover:decoration-black/40">
            Volver al checkout
          </Link>
        </div>
      </div>
    </div>
  ) : null
}
