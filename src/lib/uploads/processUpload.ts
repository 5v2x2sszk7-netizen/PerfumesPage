import { NextResponse } from "next/server"
import path from "node:path"
import sharp from "sharp"
import { slugify } from "@/lib/slug"
import { isPersistenceNotConfiguredError } from "@/lib/persistence"
import { checkRateLimit } from "@/lib/rateLimit"
import { getStorageDriver } from "@/lib/storage/driver"

type RateLimitConfig = {
  keyPrefix: string
  windowMs: number
  max: number
}

export type ProcessUploadOptions = {
  maxSizeBytes: number
  baseNameFallback: string
  uploadSubdir?: string
  maxDim: number
  quality: number
  rateLimit?: RateLimitConfig
}

const allowedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"])

export async function processUpload(req: Request, opts: ProcessUploadOptions) {
  if (opts.rateLimit) {
    const rate = await checkRateLimit(req, opts.rateLimit)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Rate limited" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(1, Math.ceil(rate.retryAfterMs / 1000)))
          }
        }
      )
    }
  }

  const formData = await req.formData()
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 })
  }

  if (file.size <= 0 || file.size > opts.maxSizeBytes) {
    return NextResponse.json({ error: "File too large" }, { status: 400 })
  }

  const originalName = file.name || "image"
  const ext = path.extname(originalName).toLowerCase()
  if (!allowedExtensions.has(ext)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
  }

  const baseName = slugify(path.basename(originalName, ext)) || opts.baseNameFallback
  const fileName = `${Date.now()}-${baseName}.webp`
  const uploadSubdir = opts.uploadSubdir ? `uploads/${opts.uploadSubdir}` : "uploads"
  const storageKey = `${uploadSubdir}/${fileName}`

  let outputBuffer: Buffer
  try {
    const inputBuffer = Buffer.from(await file.arrayBuffer())
    outputBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({
        width: opts.maxDim,
        height: opts.maxDim,
        fit: "inside",
        withoutEnlargement: true
      })
      .webp({ quality: opts.quality })
      .toBuffer()
  } catch {
    return NextResponse.json({ error: "Could not process image" }, { status: 400 })
  }

  try {
    await getStorageDriver().writeBytes(storageKey, new Uint8Array(outputBuffer), {
      contentType: "image/webp"
    })
  } catch (e) {
    if (isPersistenceNotConfiguredError(e)) {
      return NextResponse.json({ error: e.message }, { status: 501 })
    }
    return NextResponse.json({ error: "Upload not available" }, { status: 500 })
  }

  const publicPath = opts.uploadSubdir ? `/uploads/${opts.uploadSubdir}/${fileName}` : `/uploads/${fileName}`
  return NextResponse.json({ path: publicPath })
}
