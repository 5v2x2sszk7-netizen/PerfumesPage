"use client"

import Link from "next/link"
import { useCart } from "@/components/cart/CartProvider"

export function HeaderCartButton() {
  const { itemCount, isReady } = useCart()
  const countLabel = isReady && itemCount > 99 ? "99+" : String(itemCount)

  return (
    <Link
      href="/cart"
      aria-label={isReady && itemCount > 0 ? `Carrito con ${itemCount} articulo(s)` : "Abrir carrito"}
      className="group relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-ink-950 text-white shadow-sm transition-all duration-200 ease-luxe hover:-translate-y-[1px] hover:bg-black hover:shadow-[0_14px_28px_rgba(10,10,10,0.16)]"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[18px] w-[18px] transition-transform duration-200 ease-luxe group-hover:scale-[1.03]"
      >
        <circle cx="9" cy="20" r="1.25" />
        <circle cx="18" cy="20" r="1.25" />
        <path d="M2.75 3.5h2.1l2.1 10.1a1 1 0 0 0 .98.8h8.74a1 1 0 0 0 .97-.75l1.66-6.9H6.2" />
      </svg>
      {isReady && itemCount > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-[1.3rem] items-center justify-center rounded-full border border-antiqueGold/20 bg-[linear-gradient(135deg,rgba(251,248,241,0.98),rgba(247,243,233,0.94))] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-ink-900 shadow-[0_8px_16px_rgba(188,149,79,0.16)]">
          {countLabel}
        </span>
      ) : null}
    </Link>
  )
}
