export type { Review } from "@/lib/stores/reviews"

import { cache } from "react"
import { readPerfumes } from "@/lib/stores/perfumes"

export const readPerfumesCached = cache(readPerfumes)

export { readPerfumes, withPerfumesLock, writePerfumes } from "@/lib/stores/perfumes"
export { readSuggestions, addSuggestion } from "@/lib/stores/suggestions"
export { readSales, appendSale } from "@/lib/stores/sales"
export { readReviews, createReview, updateReview, deleteReview } from "@/lib/stores/reviews"
