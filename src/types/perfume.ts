export type PerfumeAvailability = "in_stock" | "low_stock" | "out_of_stock"

export type PerfumeNotes = {
  top?: string[]
  heart?: string[]
  base?: string[]
}

export type Perfume = {
  id: string
  slug: string
  name: string
  brand: string
  category: "niche" | "designer"
  concentration?: string
  description: string
  sizeMl: number
  price: number
  cost: number
  sold: number
  stock: number
  availability: PerfumeAvailability
  imageSrc: string
  imageGallery?: string[]
  notes?: PerfumeNotes
}
