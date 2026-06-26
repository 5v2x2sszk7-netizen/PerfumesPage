"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { normalizeCartItems, type CartItem } from "@/lib/cart"

const storageKey = "perfimes-cart:v1"

type AddCartItem = Omit<CartItem, "quantity"> & { quantity?: number }

type CartContextValue = {
  items: CartItem[]
  isReady: boolean
  itemCount: number
  subtotal: number
  addItem: (item: AddCartItem) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isReady, setIsReady] = useState(false)

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

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    return {
      items,
      isReady,
      itemCount,
      subtotal,
      addItem(item) {
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
        setItems((current) => current.filter((item) => item.id !== id))
      },
      updateQuantity(id, quantity) {
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
        setItems([])
      }
    }
  }, [isReady, items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const value = useContext(CartContext)
  if (!value) throw new Error("useCart must be used within CartProvider")
  return value
}
