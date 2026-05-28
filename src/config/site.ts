function normalizeSiteUrl(input: string) {
  const trimmed = input.trim().replace(/\/+$/, "")
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

const siteUrlRaw =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  "http://localhost:3000"

export const siteConfig = {
  name: "MALO Parfums",
  wordmark: "M A L O",
  descriptor: "Parfums",
  domain: normalizeSiteUrl(siteUrlRaw),
  description:
    "Perfumería de nicho. Catálogo curado, atención personalizada y pedidos por WhatsApp.",
  whatsappPhoneDigits: "525548902156",
  currency: "MXN"
} as const
