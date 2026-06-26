import type { Perfume, PerfumeAvailability } from "@/types/perfume"

export type CartItem = {
  id: string
  slug: string
  name: string
  brand: string
  imageSrc: string
  price: number
  sizeMl: number
  availability: PerfumeAvailability
  stock: number
  quantity: number
}

export function toCartItem(
  perfume: Pick<Perfume, "id" | "slug" | "name" | "brand" | "imageSrc" | "price" | "sizeMl" | "availability" | "stock">,
  quantity = 1
): CartItem {
  return {
    id: perfume.id,
    slug: perfume.slug,
    name: perfume.name,
    brand: perfume.brand,
    imageSrc: perfume.imageSrc,
    price: perfume.price,
    sizeMl: perfume.sizeMl,
    availability: perfume.availability,
    stock: perfume.stock,
    quantity: Math.max(1, Math.trunc(quantity) || 1)
  }
}

export function normalizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return []

    const item = entry as Record<string, unknown>
    const fields = [
      item.id,
      item.slug,
      item.name,
      item.brand,
      item.imageSrc,
      item.price,
      item.sizeMl,
      item.availability,
      item.stock,
      item.quantity
    ]

    if (
      typeof fields[0] !== "string" ||
      typeof fields[1] !== "string" ||
      typeof fields[2] !== "string" ||
      typeof fields[3] !== "string" ||
      typeof fields[4] !== "string" ||
      typeof fields[5] !== "number" ||
      typeof fields[6] !== "number" ||
      typeof fields[7] !== "string" ||
      typeof fields[8] !== "number" ||
      typeof fields[9] !== "number"
    ) {
      return []
    }

    const availability = item.availability as PerfumeAvailability
    if (!["in_stock", "low_stock", "out_of_stock"].includes(availability)) return []

    const quantity = item.quantity

    return [
      {
        id: item.id as string,
        slug: item.slug as string,
        name: item.name as string,
        brand: item.brand as string,
        imageSrc: item.imageSrc as string,
        price: item.price as number,
        sizeMl: item.sizeMl as number,
        availability,
        stock: item.stock as number,
        quantity: Math.max(1, Math.trunc(quantity as number))
      }
    ]
  })
}
