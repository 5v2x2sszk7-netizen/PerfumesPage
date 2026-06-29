"use client"

import Image from "next/image"
import Link from "next/link"
import { Button, ButtonLink } from "@/components/ui/Button"
import { Container } from "@/components/ui/Container"
import { Card } from "@/components/ui/Surface"
import { useCart } from "@/components/cart/CartProvider"
import { formatPrice } from "@/lib/whatsapp"

export function CartPageClient() {
  const { items, subtotal, isReady, syncNotice, updateQuantity, removeItem, clearCart } = useCart()

  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="space-y-2">
          <p className="text-xs tracking-section text-ink-500">CARRITO</p>
          <h1 className="font-display text-4xl text-ink-950 sm:text-5xl">Tu seleccion</h1>
          <p className="max-w-2xl text-sm text-ink-700">
            Revisa tus perfumes antes de continuar al checkout con Mercado Pago o PayPal.
          </p>
        </div>

        {!isReady ? (
          <Card className="p-6 text-sm text-ink-600">Cargando carrito...</Card>
        ) : items.length === 0 ? (
          <Card className="p-6 sm:p-8">
            <div className="space-y-3">
              <h2 className="font-display text-2xl text-ink-950">Tu carrito esta vacio</h2>
              <p className="text-sm text-ink-700">Agrega un perfume desde el catalogo para activar el pago en linea.</p>
              <ButtonLink href="/catalog" variant="gold" className="mt-2">
                Ir al catalogo
              </ButtonLink>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              {syncNotice ? (
                <Card className="border-antiqueGold/20 bg-antiqueGold/10 p-4 text-sm leading-6 text-ink-700">
                  {syncNotice}
                </Card>
              ) : null}
              {items.map((item) => {
                const isUploadImage = item.imageSrc.startsWith("/uploads/")
                return (
                  <Card key={item.id} className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <Link href={`/catalog/${item.slug}`} className="relative h-28 w-full shrink-0 overflow-hidden rounded-luxe bg-ink-50 sm:w-28">
                        <Image
                          src={item.imageSrc}
                          alt={`${item.name} de ${item.brand}`}
                          fill
                          className="object-cover"
                          sizes="112px"
                          unoptimized={isUploadImage}
                        />
                      </Link>

                      <div className="flex min-w-0 flex-1 flex-col gap-3">
                        <div className="space-y-1">
                          <p className="text-xs tracking-section text-ink-500">{item.brand}</p>
                          <h2 className="font-display text-2xl text-ink-950">{item.name}</h2>
                          <p className="text-sm text-ink-700">{item.sizeMl} ml</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <label className="text-sm text-ink-700" htmlFor={`qty-${item.id}`}>
                            Cantidad
                          </label>
                          <select
                            id={`qty-${item.id}`}
                            className="h-11 rounded-full border border-black/8 bg-white px-4 text-sm text-ink-950"
                            value={item.quantity}
                            onChange={(event) => updateQuantity(item.id, Number(event.target.value))}
                          >
                            {Array.from({ length: Math.max(1, item.stock) }, (_, index) => index + 1).map((qty) => (
                              <option key={qty} value={qty}>
                                {qty}
                              </option>
                            ))}
                          </select>
                          <Button type="button" variant="ghost" className="px-0 py-0 text-sm hover:bg-transparent" onClick={() => removeItem(item.id)}>
                            Quitar
                          </Button>
                        </div>
                      </div>

                      <div className="shrink-0 text-left sm:text-right">
                        <p className="text-sm text-ink-500">Subtotal</p>
                        <p className="mt-1 text-lg font-semibold text-ink-950">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>

            <Card className="h-fit p-5 sm:p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs tracking-section text-ink-500">RESUMEN</p>
                  <h2 className="mt-2 font-display text-2xl text-ink-950">Pedido</h2>
                </div>
                <div className="flex items-center justify-between text-sm text-ink-700">
                  <span>Articulos</span>
                  <span>{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold text-ink-950">
                  <span>Total</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <ButtonLink href="/checkout" variant="gold" className="w-full">
                  Ir al checkout
                </ButtonLink>
                <Button type="button" variant="ghost" className="w-full" onClick={clearCart}>
                  Vaciar carrito
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Container>
  )
}
