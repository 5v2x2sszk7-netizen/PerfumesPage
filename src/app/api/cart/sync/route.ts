import { jsonError, jsonNoStoreOk, readJsonBody } from "@/lib/apiResponse"
import { normalizeCartItems, toCartItem, type CartItem } from "@/lib/cart"
import { readSellablePerfumes } from "@/lib/checkout/reservations"

type SyncCartBody = {
  items?: CartItem[]
}

function buildSyncMessage(input: { removedCount: number; adjustedCount: number }) {
  if (input.removedCount > 0 && input.adjustedCount > 0) {
    return "Actualizamos tu carrito porque algunos perfumes se agotaron o cambiaron de disponibilidad."
  }
  if (input.removedCount > 0) {
    return input.removedCount === 1
      ? "Quitamos un perfume agotado de tu carrito."
      : "Quitamos perfumes agotados de tu carrito."
  }
  if (input.adjustedCount > 0) {
    return input.adjustedCount === 1
      ? "Ajustamos la cantidad disponible de un perfume en tu carrito."
      : "Ajustamos cantidades disponibles en tu carrito."
  }
  return ""
}

export async function POST(req: Request) {
  const body = await readJsonBody<SyncCartBody>(req)
  if (!body) return jsonError("No se pudo leer el carrito.", 400)

  const requestedItems = normalizeCartItems(body.items || [])
  if (!requestedItems.length) {
    return jsonNoStoreOk({
      items: [],
      changed: false,
      message: ""
    })
  }

  const perfumes = await readSellablePerfumes()
  let removedCount = 0
  let adjustedCount = 0

  const items = requestedItems.flatMap((entry) => {
    const perfume = perfumes.find((candidate) => candidate.id === entry.id)
    if (!perfume || perfume.price <= 0 || perfume.stock <= 0 || perfume.availability === "out_of_stock") {
      removedCount += 1
      return []
    }

    const quantity = Math.max(1, Math.min(perfume.stock, Math.trunc(entry.quantity) || 1))
    const nextItem = toCartItem(perfume, quantity)
    const changed =
      quantity !== entry.quantity ||
      nextItem.slug !== entry.slug ||
      nextItem.name !== entry.name ||
      nextItem.brand !== entry.brand ||
      nextItem.imageSrc !== entry.imageSrc ||
      nextItem.price !== entry.price ||
      nextItem.sizeMl !== entry.sizeMl ||
      nextItem.availability !== entry.availability ||
      nextItem.stock !== entry.stock

    if (changed) adjustedCount += 1
    return [nextItem]
  })

  return jsonNoStoreOk({
    items,
    changed: removedCount > 0 || adjustedCount > 0,
    message: buildSyncMessage({ removedCount, adjustedCount })
  })
}
