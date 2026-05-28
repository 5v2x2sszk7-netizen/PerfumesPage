export type { PerfumeSuggestions } from "@/lib/stores/suggestions"
export type { SaleRecord } from "@/lib/stores/sales"
export type { Review } from "@/lib/stores/reviews"

export { readPerfumes, writePerfumes } from "@/lib/stores/perfumes"
export { readSuggestions, writeSuggestions, addSuggestion } from "@/lib/stores/suggestions"
export { readSales, writeSales, appendSale } from "@/lib/stores/sales"
export { readReviews, writeReviews, createReview, updateReview, deleteReview } from "@/lib/stores/reviews"
