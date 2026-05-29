import type { Review } from "@/lib/perfumeStore"

export function formatReviewSnippet(text: string, maxLen: number) {
  const trimmed = text.trim()
  const lettersOnly = trimmed.toLowerCase().replace(/[^a-záéíóúüñ]+/g, "")
  const uniqueLetters = new Set(lettersOnly.split(""))
  const looksLikeNoise = lettersOnly.length >= 10 && uniqueLetters.size > 0 && uniqueLetters.size <= 2
  const base = looksLikeNoise ? "" : trimmed
  if (!base) return ""
  if (base.length <= maxLen) return base
  return `${base.slice(0, maxLen).trimEnd()}…`
}

export type ReviewCarouselItem = {
  id: string
  src: string
  alt: string
  customerName: string
  rating?: number
  text: string
}

export function buildReviewCarouselItems(reviews: Review[], maxItems = 12) {
  return reviews
    .filter((r) => Boolean(r.imageSrc))
    .slice(0, maxItems)
    .map((r) => ({
      id: r.id,
      src: r.imageSrc!,
      alt: `Reseña de ${r.customerName}`,
      customerName: r.customerName,
      rating: r.rating,
      text: formatReviewSnippet(r.text, 180)
    }))
}

export function getReviewRatingSummary(reviews: Review[]) {
  const rated = reviews.filter((r) => typeof r.rating === "number" && (r.rating ?? 0) > 0)
  const ratingCount = rated.length
  const avgRating = ratingCount ? rated.reduce((acc, r) => acc + (r.rating ?? 0), 0) / ratingCount : 0
  const avgRatingLabel = avgRating ? avgRating.toFixed(1) : ""
  const roundedStars = Math.max(0, Math.min(5, Math.round(avgRating)))
  return { ratingCount, avgRating, avgRatingLabel, roundedStars }
}
