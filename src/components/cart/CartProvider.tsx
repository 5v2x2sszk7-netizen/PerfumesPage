"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { normalizeCartItems, type CartItem } from "@/lib/cart"
import { buildCheckoutReservationLinesKey, clearActiveCheckoutReservation, readActiveCheckoutReservation } from "@/lib/checkout/clientReservation"

const storageKey = "perfimes-cart:v1"

type AddCartItem = Omit<CartItem, "quantity"> & { quantity?: number }

type CartContextValue = {
  items: CartItem[]
  isReady: boolean
  syncNotice: string
  itemCount: number
  subtotal: number
  addItem: (item: AddCartItem) => void
  removeItem: (id: string) => void
  removeItems: (ids: string[]) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  syncCart: () => Promise<{ changed: boolean }>
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isReady, setIsReady] = useState(false)
  const [syncNotice, setSyncNotice] = useState("")
  const itemsRef = useRef<CartItem[]>([])

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      setItems(normalizeCartItems(raw ? JSON.parse(raw) : []))
    } catch {
      setItems([])
    } finally {
      setIsReady(true)
    }
  }, [])

  useEffect(() => {
    if (!isReady) return
    window.localStorage.setItem(storageKey, JSON.stringify(items))
  }, [isReady, items])

  const syncCart = useCallback(async () => {
    if (!isReady) return { changed: false }

    const currentItems = itemsRef.current
    if (!currentItems.length) {
      setSyncNotice("")
      return { changed: false }
    }

    const storedReservation = readActiveCheckoutReservation()
    const storedExpiresAtMs = storedReservation ? new Date(storedReservation.expiresAt).getTime() : Number.NaN
    const currentLinesKey = buildCheckoutReservationLinesKey(currentItems.map((item) => ({ id: item.id, quantity: item.quantity })))
    const excludeOrderId =
      storedReservation &&
      storedReservation.orderId &&
      storedReservation.linesKey === currentLinesKey &&
      !Number.isNaN(storedExpiresAtMs) &&
      storedExpiresAtMs > Date.now()
        ? storedReservation.orderId
        : ""

    try {
      const response = await fetch("/api/cart/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ items: currentItems, excludeOrderId }),
        cache: "no-store"
      })

      const json = (await response.json().catch(() => null)) as
        | { ok?: boolean; items?: CartItem[]; changed?: boolean; message?: string }
        | null

      if (!response.ok || !json?.ok || !Array.isArray(json.items)) {
        return { changed: false }
      }

      const nextItems = normalizeCartItems(json.items)
      if (json.changed) {
        setItems(nextItems)
        setSyncNotice(json.message?.trim() || "Actualizamos tu carrito con la disponibilidad real.")
      }

      return { changed: Boolean(json.changed) }
    } catch {
      return { changed: false }
    }
  }, [isReady])

  const releaseMismatchedReservation = useCallback(async (orderId: string) => {
    const normalizedOrderId = orderId.trim()
    if (!normalizedOrderId) return

    try {
      await fetch(`/api/checkout/reservation?orderId=${encodeURIComponent(normalizedOrderId)}`, {
        method: "DELETE",
        cache: "no-store"
      })
    } catch {
    } finally {
      clearActiveCheckoutReservation(normalizedOrderId)
    }
  }, [])

  useEffect(() => {
    if (!isReady) return
    void syncCart()
  }, [isReady, syncCart])

  useEffect(() => {
    if (!isReady) return

    const storedReservation = readActiveCheckoutReservation()
    if (!storedReservation) return

    const storedExpiresAtMs = new Date(storedReservation.expiresAt).getTime()
    if (Number.isNaN(storedExpiresAtMs) || storedExpiresAtMs <= Date.now()) {
      clearActiveCheckoutReservation(storedReservation.orderId)
      return
    }

    const currentLinesKey = buildCheckoutReservationLinesKey(items.map((item) => ({ id: item.id, quantity: item.quantity })))
    if (currentLinesKey && currentLinesKey === storedReservation.linesKey) return

    void releaseMismatchedReservation(storedReservation.orderId)
  }, [isReady, items, releaseMismatchedReservation])

  useEffect(() => {
    if (!isReady) return

    const handleFocus = () => {
      void syncCart()
    }
    const handleVisibility = () => {
      if (!document.hidden) {
        void syncCart()
      }
    }

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [isReady, syncCart])

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    return {
      items,
      isReady,
      syncNotice,
      itemCount,
      subtotal,
      addItem(item) {
        setSyncNotice("")
        setItems((current) => {
          const quantity = Math.max(1, Math.trunc(item.quantity ?? 1))
          const existing = current.find((entry) => entry.id === item.id)
          if (!existing) return [...current, { ...item, quantity }]

          return current.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  quantity: Math.min(entry.stock, entry.quantity + quantity)
                }
              : entry
          )
        })
      },
      removeItem(id) {
        setSyncNotice("")
        setItems((current) => current.filter((item) => item.id !== id))
      },
      removeItems(ids) {
        setSyncNotice("")
        const normalizedIds = new Set(ids.map((entry) => entry.trim()).filter(Boolean))
        if (!normalizedIds.size) return
        setItems((current) => current.filter((item) => !normalizedIds.has(item.id)))
      },
      updateQuantity(id, quantity) {
        setSyncNotice("")
        setItems((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  quantity: Math.max(1, Math.min(item.stock, Math.trunc(quantity) || 1))
                }
              : item
          )
        )
      },
      clearCart() {
        setSyncNotice("")
        setItems([])
      },
      syncCart
    }
  }, [isReady, items, syncCart, syncNotice])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const value = useContext(CartContext)
  if (!value) throw new Error("useCart must be used within CartProvider")
  return value
}
