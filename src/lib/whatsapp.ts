import { siteConfig } from "@/config/site"
import type { Perfume } from "@/types/perfume"

export function buildWhatsAppLink(text: string, phoneDigits = siteConfig.whatsappPhoneDigits) {
  const sanitizedPhone = phoneDigits.replace(/[^\d]/g, "")
  const encoded = encodeURIComponent(text)
  return `https://wa.me/${sanitizedPhone}?text=${encoded}`
}

export function formatPrice(price: number) {
  if (price <= 0) return "Consultar"
  const formatted = new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 0
  }).format(price)
  return `${siteConfig.currency} ${formatted}`
}

export const availabilityLabel = {
  in_stock: "Disponible",
  low_stock: "Pocas piezas",
  out_of_stock: "Agotado"
} as const

export function formatPerfumeWhatsAppMessage(perfume: Perfume) {
  const lines = [
    "Hola! Vengo de la web de *MALO Fragances*. Me interesa adquirir:",
    `- Perfume: *${perfume.name}*`,
    `- Casa: *${perfume.brand}*`,
    `- Presentación: *${perfume.sizeMl} ml*`,
    `- Precio: *${formatPrice(perfume.price)}*`,
    `- Estatus: *${availabilityLabel[perfume.availability]}*`,
    "",
    "",
    "¿Tienen disponibilidad para envío?"
  ]
  return lines.join("\n")
}

export function formatSpecialOrderWhatsAppMessage(payload: {
  customerName: string
  phone: string
  perfumeName: string
  brand: string
  sizeMl: string
  comments?: string
}) {
  const rawSize = payload.sizeMl.trim()
  const sizeLabel = /^\d+(\.\d+)?$/.test(rawSize) ? `${rawSize} ml` : rawSize

  const lines = [
    "*Pedido especial*:",
    `Cliente: *${payload.customerName}*`,
    `Teléfono: *${payload.phone}*`,
    `Perfume solicitado: *${payload.perfumeName}*`,
    `Marca: *${payload.brand}*`,
    `Tamaño: ${sizeLabel}`
  ]

  const trimmedComments = payload.comments?.trim()
  if (trimmedComments) lines.push(`Comentarios: *${trimmedComments}*`)

  return lines.join("\n")
}
