import { getStorageDriver } from "@/lib/storage/driver"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

function isSafeUploadPathParts(parts: string[]) {
  if (!parts.length || parts.length > 20) return false
  for (const part of parts) {
    if (!part) return false
    if (part === "." || part === "..") return false
    if (part.includes("..")) return false
    if (part.includes("\\")) return false
    if (part.includes("\u0000")) return false
  }
  return true
}

function contentTypeForKey(key: string) {
  const lower = key.toLowerCase()
  if (lower.endsWith(".webp")) return "image/webp"
  if (lower.endsWith(".png")) return "image/png"
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg"
  if (lower.endsWith(".avif")) return "image/avif"
  return "application/octet-stream"
}

export async function GET(_req: NextRequest, ctx: { params: { path: string[] } }) {
  const parts = Array.isArray(ctx.params.path) ? ctx.params.path : []
  if (!isSafeUploadPathParts(parts)) return new Response("Not found", { status: 404 })

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
