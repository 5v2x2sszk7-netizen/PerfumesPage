export type ShippingStatus = "pending" | "shipped" | "delivered"

export type OrderShippingDetails = {
  carrier?: string
  trackingNumber?: string
  trackingUrl?: string
  shippedAt?: string
  shippingStatus?: ShippingStatus
}

export function normalizeShippingStatus(value: unknown): ShippingStatus | undefined {
  if (value === "pending" || value === "shipped" || value === "delivered") {
    return value
  }
  return undefined
}

export function normalizeTrackingUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined

  try {
    const url = new URL(trimmed)
    return url.toString()
  } catch {
    return undefined
  }
}

export function normalizeOrderShippingDetails(input: unknown): OrderShippingDetails {
  if (!input || typeof input !== "object") return {}
  const record = input as Record<string, unknown>
  const carrier = typeof record.carrier === "string" && record.carrier.trim() ? record.carrier.trim() : undefined
  const trackingNumber =
    typeof record.trackingNumber === "string" && record.trackingNumber.trim() ? record.trackingNumber.trim() : undefined
  const trackingUrl = normalizeTrackingUrl(record.trackingUrl)
  const shippedAt = typeof record.shippedAt === "string" && record.shippedAt.trim() ? record.shippedAt.trim() : undefined
  const shippingStatus = normalizeShippingStatus(record.shippingStatus)

  return {
    carrier,
    trackingNumber,
    trackingUrl,
    shippedAt,
    shippingStatus
  }
}

export function resolveShippingStatusFromFulfillmentStatus(
  fulfillmentStatus: string,
  fallback?: ShippingStatus
): ShippingStatus | undefined {
  const normalized = fulfillmentStatus.trim().toLowerCase()
  if (normalized === "shipped") return "shipped"
  if (normalized === "delivered") return "delivered"
  if (normalized === "preparing" || normalized === "processing" || normalized === "packing") return "pending"
  return fallback
}
