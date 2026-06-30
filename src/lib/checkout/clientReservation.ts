export type ActiveCheckoutReservation = {
  orderId: string
  provider: "mercado_pago" | "paypal"
  expiresAt: string
  linesKey: string
}

const activeReservationStorageKey = "perfimes-active-checkout-reservation:v1"
const activeReservationCookieName = "perfimes_active_checkout_reservation"
const activeReservationChangeEventName = "perfimes:active-checkout-reservation-change"

function dispatchActiveReservationChange() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(activeReservationChangeEventName))
}

function readCookieValue(name: string) {
  if (typeof document === "undefined") return ""
  const cookie = document.cookie || ""
  if (!cookie) return ""

  const entries = cookie.split(/;\s*/)
  for (const entry of entries) {
    const index = entry.indexOf("=")
    if (index === -1) continue
    const key = entry.slice(0, index).trim()
    if (key !== name) continue
    return decodeURIComponent(entry.slice(index + 1))
  }
  return ""
}

function writeCookieValue(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") return
  const safeSeconds = Math.max(1, Math.min(60 * 60, Math.floor(maxAgeSeconds)))
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${safeSeconds}; SameSite=Lax${secure}`
}

function clearCookieValue(name: string) {
  if (typeof document === "undefined") return
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
}

export function buildCheckoutReservationLinesKey(lines: Array<{ id: string; quantity: number }>) {
  return lines
    .map((line) => ({
      id: line.id.trim(),
      quantity: Math.max(1, Math.trunc(line.quantity) || 1)
    }))
    .filter((line) => line.id)
    .sort((a, b) => a.id.localeCompare(b.id, "es"))
    .map((line) => `${line.id}:${line.quantity}`)
    .join("|")
}

export function readActiveCheckoutReservation() {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(activeReservationStorageKey)
  if (!raw) {
    const cookieRaw = readCookieValue(activeReservationCookieName)
    if (!cookieRaw) return null

    try {
      const parsed = JSON.parse(cookieRaw) as Partial<ActiveCheckoutReservation> | null
      if (!parsed) return null
      if (parsed.provider !== "mercado_pago" && parsed.provider !== "paypal") return null
      if (typeof parsed.orderId !== "string" || !parsed.orderId.trim()) return null
      if (typeof parsed.expiresAt !== "string" || !parsed.expiresAt.trim()) return null
      if (typeof parsed.linesKey !== "string" || !parsed.linesKey.trim()) return null

      const expiresAtMs = new Date(parsed.expiresAt).getTime()
      if (Number.isNaN(expiresAtMs) || expiresAtMs <= Date.now()) return null

      const value = {
        orderId: parsed.orderId,
        provider: parsed.provider,
        expiresAt: parsed.expiresAt,
        linesKey: parsed.linesKey
      } satisfies ActiveCheckoutReservation

      window.localStorage.setItem(activeReservationStorageKey, JSON.stringify(value))
      dispatchActiveReservationChange()
      return value
    } catch {
      return null
    }
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ActiveCheckoutReservation> | null
    if (!parsed) return null
    if (parsed.provider !== "mercado_pago" && parsed.provider !== "paypal") return null
    if (typeof parsed.orderId !== "string" || !parsed.orderId.trim()) return null
    if (typeof parsed.expiresAt !== "string" || !parsed.expiresAt.trim()) return null
    if (typeof parsed.linesKey !== "string" || !parsed.linesKey.trim()) return null
    return {
      orderId: parsed.orderId,
      provider: parsed.provider,
      expiresAt: parsed.expiresAt,
      linesKey: parsed.linesKey
    } satisfies ActiveCheckoutReservation
  } catch {
    return null
  }
}

export function writeActiveCheckoutReservation(value: ActiveCheckoutReservation) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(activeReservationStorageKey, JSON.stringify(value))

  const expiresAtMs = new Date(value.expiresAt).getTime()
  if (!Number.isNaN(expiresAtMs)) {
    const maxAgeSeconds = Math.max(1, Math.ceil((expiresAtMs - Date.now()) / 1000))
    writeCookieValue(activeReservationCookieName, JSON.stringify(value), maxAgeSeconds)
  }
  dispatchActiveReservationChange()
}

export function clearActiveCheckoutReservation(orderId?: string) {
  if (typeof window === "undefined") return
  if (!orderId?.trim()) {
    window.localStorage.removeItem(activeReservationStorageKey)
    clearCookieValue(activeReservationCookieName)
    dispatchActiveReservationChange()
    return
  }

  const current = readActiveCheckoutReservation()
  if (current?.orderId === orderId.trim()) {
    window.localStorage.removeItem(activeReservationStorageKey)
    clearCookieValue(activeReservationCookieName)
    dispatchActiveReservationChange()
  }
}

export function onActiveCheckoutReservationChange(listener: () => void) {
  if (typeof window === "undefined") return () => undefined
  const handler = () => listener()
  window.addEventListener(activeReservationChangeEventName, handler)
  return () => {
    window.removeEventListener(activeReservationChangeEventName, handler)
  }
}
