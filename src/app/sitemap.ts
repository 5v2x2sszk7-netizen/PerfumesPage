import type { MetadataRoute } from "next"
import { siteConfig } from "@/config/site"
import { readPerfumes } from "@/lib/perfumeStore"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.domain.replace(/\/$/, "")
  const perfumes = (await readPerfumes()).filter((p) => (p.stock ?? 0) > 0)

  return [
    { url: `${base}/`, changeFrequency: "weekly" as const, priority: 1 },
    { url: `${base}/catalog`, changeFrequency: "weekly" as const, priority: 0.9 },
    { url: `${base}/special-order`, changeFrequency: "monthly" as const, priority: 0.7 },
    ...perfumes.map((p) => ({
      url: `${base}/catalog/${p.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8
    }))
  ]
}
