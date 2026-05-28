import path from "node:path"
import sharp from "sharp"
import { slugify } from "@/lib/slug"
import { isPersistenceNotConfiguredError } from "@/lib/persistence"
import { checkRateLimit } from "@/lib/rateLimit"
import { jsonError, jsonOk } from "@/lib/apiResponse"
import { getStorageDriver } from "@/lib/storage/driver"

type RateLimitConfig = {
  keyPrefix: string
  windowMs: number
  max: number
}

type ProcessUploadOptions = {
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
      return jsonError("Rate limited", 429, {
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil(rate.retryAfterMs / 1000)))
        }
      })
    }
  }

  const formData = await req.formData()
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return jsonError("Missing file", 400)
  }

  if (file.size <= 0 || file.size > opts.maxSizeBytes) {
    return jsonError("File too large", 400)
  }

  const originalName = file.name || "image"
  const ext = path.extname(originalName).toLowerCase()
  if (!allowedExtensions.has(ext)) {
    return jsonError("Unsupported file type", 400)
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
    return jsonError("Could not process image", 400)
  }

  try {
    await getStorageDriver().writeBytes(storageKey, new Uint8Array(outputBuffer), {
      contentType: "image/webp"
    })
  } catch (e) {
    if (isPersistenceNotConfiguredError(e)) {
      return jsonError(e.message, 501)
    }
    return jsonError("Upload not available", 500)
  }

  const publicPath = opts.uploadSubdir ? `/uploads/${opts.uploadSubdir}/${fileName}` : `/uploads/${fileName}`
  return jsonOk({ path: publicPath })
}
