import type { Perfume } from "@/types/perfume"
import type { SaleRecord } from "@/lib/admin/types"

function toIntNonNegative(value: unknown) {
  const num = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.max(0, Math.floor(num))
}

function toMoneyNonNegative(value: unknown) {
  const num = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.max(0, num)
}

export function profitPerUnit(price: unknown, cost: unknown) {
  return toMoneyNonNegative(price) - toMoneyNonNegative(cost)
}

export function profitForQty(price: unknown, cost: unknown, qty: unknown) {
  return profitPerUnit(price, cost) * toIntNonNegative(qty)
}

function buildSalesTotals(sales: SaleRecord[]) {
  const totals = sales.reduce(
    (acc, s) => {
      const qty = toIntNonNegative(s.qty)
      if (qty <= 0) return acc
      const price = toMoneyNonNegative(s.unitPrice)
      const cost = toMoneyNonNegative(s.unitCost)
      acc.soldUnits += qty
      acc.revenue += price * qty
      acc.cost += cost * qty
      acc.profit += (price - cost) * qty
      return acc
    },
    { soldUnits: 0, revenue: 0, cost: 0, profit: 0 }
  )
  const margin = totals.revenue > 0 ? totals.profit / totals.revenue : 0
  return { ...totals, margin }
}

function buildInventoryTotals(perfumes: Perfume[]) {
  return perfumes.reduce(
    (acc, p) => {
      const stock = toIntNonNegative(p.stock)
      acc.inventoryUnits += stock
      acc.inventoryValue += stock * toMoneyNonNegative(p.cost)
      acc.potentialProfit += stock * profitPerUnit(p.price, p.cost)
      return acc
    },
    { inventoryUnits: 0, inventoryValue: 0, potentialProfit: 0 }
  )
}

export function buildAdminReport(perfumes: Perfume[], sales: SaleRecord[]) {
  const salesTotals = buildSalesTotals(sales)
  const inventoryTotals = buildInventoryTotals(perfumes)
  return { ...salesTotals, ...inventoryTotals }
}

export function buildSalesByPerfume(perfumes: Perfume[], sales: SaleRecord[]) {
  const perfumeById = new Map(perfumes.map((p) => [p.id, p] as const))
  const collator = new Intl.Collator("es", { sensitivity: "base" })
  const map = new Map<
    string,
    {
      id: string
      brand: string
      name: string
      sizeMl: number
      soldUnits: number
      revenue: number
      cost: number
      profit: number
    }
  >()

  for (const s of sales) {
    const qty = toIntNonNegative(s.qty)
    if (qty <= 0) continue
    const key = String(s.perfumeId ?? "").trim()
    if (!key) continue

    const price = toMoneyNonNegative(s.unitPrice)
    const cost = toMoneyNonNegative(s.unitCost)
    const existing = map.get(key)
    if (!existing) {
      const current = perfumeById.get(key)
      map.set(key, {
        id: key,
        brand: current?.brand ?? String(s.brand ?? "").trim(),
        name: current?.name ?? String(s.name ?? "").trim(),
        sizeMl: current?.sizeMl ?? toIntNonNegative(s.sizeMl),
        soldUnits: qty,
        revenue: price * qty,
        cost: cost * qty,
        profit: (price - cost) * qty
      })
    } else {
      existing.soldUnits += qty
      existing.revenue += price * qty
      existing.cost += cost * qty
      existing.profit += (price - cost) * qty
      const current = perfumeById.get(key)
      if (current) {
        existing.brand = current.brand
        existing.name = current.name
        existing.sizeMl = current.sizeMl
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.soldUnits !== a.soldUnits) return b.soldUnits - a.soldUnits
    if (b.revenue !== a.revenue) return b.revenue - a.revenue
    const brandCmp = collator.compare(a.brand, b.brand)
    if (brandCmp !== 0) return brandCmp
    return collator.compare(a.name, b.name)
  })
}

export function perfumeSoldUnits(perfume: Pick<Perfume, "sold">) {
  return toIntNonNegative(perfume.sold)
}
