import crypto from "node:crypto"
import { dataFilePath, readJsonArray, withStorageLock, writeJson } from "@/lib/storage/jsonFile"

export type Review = {
  id: string
  at: string
  customerName: string
  customerId?: string
  customerEmail?: string
  verifiedPurchase?: boolean
  text: string
  rating?: number
  imageSrc?: string
  deliveryCondition?: "perfect" | "box_damaged" | "leak" | "other"
  deliveryNotes?: string
  deliveryImageSrc?: string
  deliveryImageSrcs?: string[]
}

const reviewsPath = dataFilePath("reviews.json")

type ReviewValidationResult = { ok: true; value: Review } | { ok: false; error: string }

function isSafeUploadsPath(value: string, requiredPrefix: string) {
  const trimmed = value.trim()
  if (!trimmed.startsWith(requiredPrefix)) return false
  if (trimmed.includes("..")) return false
  if (trimmed.includes("\\")) return false
  return true
}

function validateAndNormalizeReview(input: unknown): ReviewValidationResult {
  if (!input || typeof input !== "object") return { ok: false, error: "Invalid body" }
  const record = input as Record<string, unknown>

  const id =
    typeof record.id === "string" && record.id.trim() ? record.id.trim() : crypto.randomUUID()
  const at =
    typeof record.at === "string" && record.at.trim() ? record.at.trim() : new Date().toISOString()
  const customerName = typeof record.customerName === "string" ? record.customerName.trim() : ""
  const customerId = typeof record.customerId === "string" ? record.customerId.trim() : ""
  const customerEmail = typeof record.customerEmail === "string" ? record.customerEmail.trim().toLowerCase() : ""
  const verifiedPurchase = record.verifiedPurchase === true
  const text = typeof record.text === "string" ? record.text.trim() : ""
  const imageSrc = typeof record.imageSrc === "string" ? record.imageSrc.trim() : ""
  const deliveryNotes = typeof record.deliveryNotes === "string" ? record.deliveryNotes.trim() : ""
  const deliveryImageSrc = typeof record.deliveryImageSrc === "string" ? record.deliveryImageSrc.trim() : ""
  const deliveryImageSrcsRaw = Array.isArray(record.deliveryImageSrcs) ? record.deliveryImageSrcs : null
  const deliveryImageSrcsFromArray = deliveryImageSrcsRaw
    ? deliveryImageSrcsRaw.map((v) => String(v).trim()).filter(Boolean)
    : []
  const mergedDeliveryImageSrcs = [
    ...(deliveryImageSrc ? [deliveryImageSrc] : []),
    ...deliveryImageSrcsFromArray
  ]
  const uniqueDeliveryImageSrcs = Array.from(new Set(mergedDeliveryImageSrcs))
  const deliveryConditionRaw = typeof record.deliveryCondition === "string" ? record.deliveryCondition.trim() : ""
  const ratingRaw = typeof record.rating === "number" && Number.isFinite(record.rating) ? record.rating : NaN
  const ratingInt = Number.isFinite(ratingRaw) ? Math.floor(ratingRaw) : NaN
  const rating = Number.isFinite(ratingInt) ? Math.min(5, Math.max(1, ratingInt)) : undefined

  if (!customerName) return { ok: false, error: "Missing customerName" }
  if (text.length < 10 || text.length > 1000) return { ok: false, error: "Invalid text" }
  if (deliveryNotes && deliveryNotes.length > 400) return { ok: false, error: "Invalid deliveryNotes" }

  const allowedConditions = new Set(["perfect", "box_damaged", "leak", "other"])
  const deliveryCondition = allowedConditions.has(deliveryConditionRaw)
    ? (deliveryConditionRaw as Review["deliveryCondition"])
    : undefined

  if (uniqueDeliveryImageSrcs.length > 5) return { ok: false, error: "Máximo 5 fotos." }
  for (const src of uniqueDeliveryImageSrcs) {
    if (!isSafeUploadsPath(src, "/uploads/reviews/")) return { ok: false, error: "Invalid deliveryImageSrc" }
  }
  const deliveryImageSrcs = uniqueDeliveryImageSrcs.slice(0, 5)

  if (imageSrc && !isSafeUploadsPath(imageSrc, "/uploads/")) return { ok: false, error: "Invalid imageSrc" }

  if (typeof record.rating === "number" && (!Number.isFinite(ratingRaw) || ratingInt < 1 || ratingInt > 5)) {
    return { ok: false, error: "Invalid rating" }
  }

  return {
    ok: true,
    value: {
      id,
      at,
      customerName,
      customerId: customerId || undefined,
      customerEmail: customerEmail || undefined,
      verifiedPurchase: verifiedPurchase || undefined,
      text,
      rating,
      imageSrc: imageSrc ? imageSrc : undefined,
      deliveryCondition,
      deliveryNotes: deliveryNotes ? deliveryNotes : undefined,
      deliveryImageSrc: deliveryImageSrcs[0] ? deliveryImageSrcs[0] : undefined,
      deliveryImageSrcs: deliveryImageSrcs.length ? deliveryImageSrcs : undefined
    }
  }
}

export async function readReviews(): Promise<Review[]> {
  const parsed = await readJsonArray<unknown>(reviewsPath)
  return parsed
    .map((v) => {
      const res = validateAndNormalizeReview(v)
      return res.ok ? res.value : null
    })
    .filter(Boolean) as Review[]
}

async function writeReviews(reviews: Review[]) {
  await writeJson(reviewsPath, reviews)
}

export async function createReview(input: Omit<Review, "id" | "at"> & { id?: string; at?: string }) {
  const res = validateAndNormalizeReview(input)
  if (!res.ok) throw new Error(res.error)
  const normalized = res.value
  await withStorageLock(reviewsPath, async () => {
    const existing = await readReviews()
    await writeReviews([normalized, ...existing])
  })
  return normalized
}

export async function updateReview(id: string, patch: Partial<Review>) {
  return withStorageLock(reviewsPath, async () => {
    const existing = await readReviews()
    const idx = existing.findIndex((r) => r.id === id)
    if (idx === -1) return null
    const current = existing[idx]
    const merged = {
      ...current,
      ...patch,
      id: current.id,
      at: current.at
    }
    const res = validateAndNormalizeReview(merged)
    if (!res.ok) throw new Error(res.error)
    const normalized = res.value
    const next = [...existing]
    next[idx] = normalized
    await writeReviews(next)
    return normalized
  })
}

export async function deleteReview(id: string) {
  return withStorageLock(reviewsPath, async () => {
    const existing = await readReviews()
    const next = existing.filter((r) => r.id !== id)
    if (next.length === existing.length) return false
    await writeReviews(next)
    return true
  })
}
