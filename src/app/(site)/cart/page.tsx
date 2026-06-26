import type { Metadata } from "next"
import { CartPageClient } from "@/app/(site)/cart/CartPageClient"

export const metadata: Metadata = {
  title: "Carrito | MALO Fragances"
}

export default function CartPage() {
  return <CartPageClient />
}
