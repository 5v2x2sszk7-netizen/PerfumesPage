const FREE_SHIPPING_THRESHOLD = 4999
const METRO_SHIPPING_AMOUNT = 250
const CENTER_SHIPPING_AMOUNT = 250
const NATIONAL_SHIPPING_AMOUNT = 350

const METRO_STATES = new Set(["ciudad de mexico", "estado de mexico"])

const CENTER_STATES = new Set([
  "guanajuato",
  "hidalgo",
  "morelos",
  "puebla",
  "queretaro",
  "tlaxcala"
])

export type ShippingZoneId = "metro" | "center" | "national"

export type ShippingZone = {
  id: ShippingZoneId
  label: string
  amount: number
}

export type ShippingQuote = {
  isReady: boolean
  subtotal: number
  shippingAmount: number
  total: number
  shippingLabel: string
  zone?: ShippingZone
  qualifiesForFreeShipping: boolean
  freeShippingThreshold: number
}

function normalizeStateName(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  if (normalized === "mexico") return "estado de mexico"
  if (normalized === "cdmx") return "ciudad de mexico"
  return normalized
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

export function shippingFreeThreshold() {
  return FREE_SHIPPING_THRESHOLD
}

export function shippingRatePreview() {
  return {
    metro: METRO_SHIPPING_AMOUNT,
    center: CENTER_SHIPPING_AMOUNT,
    national: NATIONAL_SHIPPING_AMOUNT
  }
}

export function resolveShippingZone(state: string): ShippingZone | null {
  const normalizedState = normalizeStateName(state)
  if (!normalizedState) return null

  if (METRO_STATES.has(normalizedState)) {
    return {
      id: "metro",
      label: "Zona metropolitana",
      amount: METRO_SHIPPING_AMOUNT
    }
  }

  if (CENTER_STATES.has(normalizedState)) {
    return {
      id: "center",
      label: "Zona centro",
      amount: CENTER_SHIPPING_AMOUNT
    }
  }

  return {
    id: "national",
    label: "Cobertura nacional",
    amount: NATIONAL_SHIPPING_AMOUNT
  }
}

export function calculateShippingQuote(input: { subtotal: number; state: string; postalCode: string }): ShippingQuote {
  const subtotal = Math.max(0, roundMoney(input.subtotal))
  const postalCode = input.postalCode.replace(/\D/g, "").slice(0, 5)
  const zone = resolveShippingZone(input.state)

  if (!zone || postalCode.length !== 5) {
    return {
      isReady: false,
      subtotal,
      shippingAmount: 0,
      total: subtotal,
      shippingLabel: "Envio pendiente",
      qualifiesForFreeShipping: subtotal >= FREE_SHIPPING_THRESHOLD,
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD
    }
  }

  const qualifiesForFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD
  const shippingAmount = qualifiesForFreeShipping ? 0 : zone.amount

  return {
    isReady: true,
    subtotal,
    shippingAmount,
    total: roundMoney(subtotal + shippingAmount),
    shippingLabel: qualifiesForFreeShipping ? `Envio gratis · ${zone.label}` : `Envio ${zone.label}`,
    zone,
    qualifiesForFreeShipping,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD
  }
}

export function resolveStoredOrderTotal(input: {
  subtotal: number
  shippingAmount?: number
  total?: number
}) {
  if (typeof input.total === "number" && Number.isFinite(input.total)) {
    return roundMoney(Math.max(0, input.total))
  }

  const shippingAmount =
    typeof input.shippingAmount === "number" && Number.isFinite(input.shippingAmount)
      ? Math.max(0, input.shippingAmount)
      : 0

  return roundMoney(Math.max(0, input.subtotal) + shippingAmount)
}
