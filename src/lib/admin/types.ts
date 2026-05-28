import type { Perfume } from "@/types/perfume"
import type { Review as StoreReview } from "@/lib/perfumeStore"

export type Draft = {
  id?: string
  name: string
  brand: string
  category: Perfume["category"]
  description: string
  sizeMl: string
  price: string
  cost: string
  stock: string
  availability: Perfume["availability"]
  imageSrc: string
  notesTop: string
  notesHeart: string
  notesBase: string
}

export type AdminSection = "products" | "form" | "report" | "reviews"

export type Suggestions = {
  brands: string[]
  namesByBrand: Record<string, string[]>
}

export type SaleRecord = {
  id: string
  at: string
  perfumeId: string
  brand: string
  name: string
  sizeMl: number
  unitPrice: number
  unitCost: number
  qty: number
}

export type Review = StoreReview

export type ReviewDraft = {
  customerName: string
  text: string
  rating: string
  imageSrc: string
}

export const emptyDraft: Draft = {
  name: "",
  brand: "",
  category: "niche",
  description: "",
  sizeMl: "",
  price: "",
  cost: "",
  stock: "1",
  availability: "in_stock",
  imageSrc: "",
  notesTop: "",
  notesHeart: "",
  notesBase: ""
}

export const emptyReviewDraft: ReviewDraft = {
  customerName: "",
  text: "",
  rating: "",
  imageSrc: ""
}
