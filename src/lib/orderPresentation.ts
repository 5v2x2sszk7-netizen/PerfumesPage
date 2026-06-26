export function formatCustomerOrderNumber(orderId: string) {
  const normalized = orderId.replace(/[^a-fA-F0-9]/g, "")
  if (normalized) {
    const tail = normalized.slice(-8)
    const numeric = parseInt(tail || "0", 16) % 1_000_000
    return `MALO-${String(numeric || 1).padStart(6, "0")}`
  }

  let hash = 0
  for (const char of orderId) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return `MALO-${String((hash % 1_000_000) || 1).padStart(6, "0")}`
}

export function paymentStatusCustomerLabel(value: string) {
  const normalized = value.trim().toLowerCase()

  if (["approved", "completed", "paid", "success"].includes(normalized)) {
    return "Pagado"
  }

  if (["confirmed", "authorized"].includes(normalized)) {
    return "Confirmado"
  }

  if (["pending", "in_process", "processing"].includes(normalized)) {
    return "Pendiente"
  }

  if (["cancelled", "canceled", "failure", "failed", "rejected"].includes(normalized)) {
    return "No pagado"
  }

  if (normalized === "refunded") {
    return "Reembolsado"
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function fulfillmentStatusCustomerLabel(value: string) {
  const normalized = value.trim().toLowerCase()

  if (["preparing", "processing", "packing"].includes(normalized)) {
    return "Preparando"
  }

  if (["shipped", "in_transit", "sent"].includes(normalized)) {
    return "Enviado"
  }

  if (["delivered", "completed_delivery"].includes(normalized)) {
    return "Entregado"
  }

  return paymentStatusCustomerLabel(value)
}

export function orderStatusCustomerLabel(input: { paymentStatus: string; fulfillmentStatus?: string }) {
  const fulfillmentStatus = input.fulfillmentStatus?.trim()
  if (fulfillmentStatus) {
    return fulfillmentStatusCustomerLabel(fulfillmentStatus)
  }
  return paymentStatusCustomerLabel(input.paymentStatus)
}

export function orderStatusSupportingLabel(input: { paymentStatus: string; fulfillmentStatus?: string }) {
  const status = orderStatusCustomerLabel(input)

  if (status === "Preparando") return "Preparando envio"
  if (status === "Enviado") return "En camino"
  if (status === "Entregado") return "Pedido entregado"
  if (status === "Pagado") return "Pago confirmado"
  if (status === "Confirmado") return "Pedido confirmado"
  if (status === "Pendiente") return "Pendiente de confirmacion"

  return status
}
