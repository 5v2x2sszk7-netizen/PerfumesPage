"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button, ButtonLink } from "@/components/ui/Button"
import { useCart } from "@/components/cart/CartProvider"
import { toCartItem } from "@/lib/cart"
import type { Perfume } from "@/types/perfume"

type PurchasePerfume = Pick<
  Perfume,
  "id" | "slug" | "name" | "brand" | "imageSrc" | "price" | "sizeMl" | "availability" | "stock"
>

export function PurchaseActions({ perfume }: { perfume: PurchasePerfume }) {
  const router = useRouter()
  const { addItem, itemCount } = useCart()
  const [added, setAdded] = useState(false)
  const cartItem = useMemo(() => toCartItem(perfume), [perfume])

  if (perfume.price <= 0 || perfume.availability === "out_of_stock" || perfume.stock <= 0) return null

  function addToCart() {
    addItem(cartItem)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1800)
  }

  function startCheckout() {
    addItem(cartItem)
    router.push(`/checkout?buyNow=${encodeURIComponent(perfume.slug)}`)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="button" variant="outline" className="h-12 border-black/10 bg-white/90 text-[15px] sm:min-w-44 sm:text-sm" onClick={addToCart}>
          {added ? "Agregado" : "Agregar al carrito"}
        </Button>
        <Button
          type="button"
          variant="gold"
          className="h-12 text-[15px] shadow-cta-soft transition-luxe duration-luxe ease-luxe hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(188,149,79,0.26)] sm:min-w-44 sm:text-sm"
          onClick={startCheckout}
        >
          Pago en linea
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-600">
        <ButtonLink href="/cart" variant="ghost" className="px-0 py-0 text-sm hover:bg-transparent">
          Ver carrito
        </ButtonLink>
        <span>{itemCount} articulo(s)</span>
      </div>
    </div>
  )
}
