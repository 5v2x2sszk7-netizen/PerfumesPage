export type ActiveCheckoutReservation = {
  orderId: string
  provider: "mercado_pago" | "paypal"
  expiresAt: string
  linesKey: string
}

const activeReservationStorageKey = "perfimes-active-checkout-reservation:v1"

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
  if (!raw) return null

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
}

export function clearActiveCheckoutReservation(orderId?: string) {
  if (typeof window === "undefined") return
  if (!orderId?.trim()) {
    window.localStorage.removeItem(activeReservationStorageKey)
    return
  }

  const current = readActiveCheckoutReservation()
  if (current?.orderId === orderId.trim()) {
    window.localStorage.removeItem(activeReservationStorageKey)
  }
}
