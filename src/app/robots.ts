import type { MetadataRoute } from "next"
import { siteConfig } from "@/config/site"

export default function robots(): MetadataRoute.Robots {
  const base = siteConfig.domain.replace(/\/$/, "")
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${base}/sitemap.xml`
  }
}

