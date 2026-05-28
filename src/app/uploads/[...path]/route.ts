import { getStorageDriver } from "@/lib/storage/driver"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

function contentTypeForKey(key: string) {
  const lower = key.toLowerCase()
  if (lower.endsWith(".webp")) return "image/webp"
  if (lower.endsWith(".png")) return "image/png"
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg"
  if (lower.endsWith(".avif")) return "image/avif"
  return "application/octet-stream"
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const resolved = await ctx.params
  const parts = Array.isArray(resolved.path) ? resolved.path : []
  if (!parts.length) return new Response("Not found", { status: 404 })

  const key = `uploads/${parts.join("/")}`
  const bytes = await getStorageDriver().readBytes(key)
  if (!bytes) return new Response("Not found", { status: 404 })

  const body = bytes.slice().buffer as ArrayBuffer
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentTypeForKey(key),
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  })
}
