import crypto from "node:crypto"
import { dataFilePath, readJsonArrayResult, withStorageLock, writeJson } from "@/lib/storage/jsonFile"

export type SaleRecord = {
  id: string
  at: string
  perfumeId: string
  brand: string
  name: string
  sizeMl: number
  unitPrice: number
  unitCost: number
  qty: number
}

const salesPath = dataFilePath("sales.json")

function normalizeSaleRecord(input: unknown): SaleRecord | null {
  if (!input || typeof input !== "object") return null
  const record = input as Record<string, unknown>

  const at = typeof record.at === "string" ? record.at : null
  const perfumeId = typeof record.perfumeId === "string" ? record.perfumeId.trim() : ""
  const brand = typeof record.brand === "string" ? record.brand.trim() : ""
  const name = typeof record.name === "string" ? record.name.trim() : ""
  const sizeMlRaw = typeof record.sizeMl === "number" && Number.isFinite(record.sizeMl) ? record.sizeMl : NaN
  const unitPriceRaw = typeof record.unitPrice === "number" && Number.isFinite(record.unitPrice) ? record.unitPrice : NaN
  const unitCostRaw = typeof record.unitCost === "number" && Number.isFinite(record.unitCost) ? record.unitCost : NaN
  const qtyRaw = typeof record.qty === "number" && Number.isFinite(record.qty) ? record.qty : NaN

  if (!at) return null
  if (!perfumeId || !brand || !name) return null
  if (!(sizeMlRaw > 0)) return null
  if (!(unitPriceRaw >= 0)) return null
  if (!(unitCostRaw >= 0)) return null
  const qty = Math.floor(qtyRaw)
  if (!(qty > 0)) return null

  const id =
    typeof record.id === "string" && record.id.trim() ? record.id.trim() : crypto.randomUUID()

  return {
    id,
    at,
    perfumeId,
    brand,
    name,
    sizeMl: Math.floor(sizeMlRaw),
    unitPrice: unitPriceRaw,
    unitCost: unitCostRaw,
    qty
  }
}

export async function readSales(): Promise<SaleRecord[]> {
  const res = await readJsonArrayResult<unknown>(salesPath)
  if (res.status === "missing" || res.status === "invalid" || res.status === "error") {
    return []
  }
  return res.value.map(normalizeSaleRecord).filter(Boolean) as SaleRecord[]
}

export async function writeSales(sales: SaleRecord[]) {
  await writeJson(salesPath, sales)
}

export async function appendSale(record: Omit<SaleRecord, "id" | "at"> & { id?: string; at?: string }) {
  const sale: SaleRecord = {
    id: record.id?.trim() || crypto.randomUUID(),
    at: record.at ?? new Date().toISOString(),
    perfumeId: record.perfumeId,
    brand: record.brand,
    name: record.name,
    sizeMl: record.sizeMl,
    unitPrice: record.unitPrice,
    unitCost: record.unitCost,
    qty: record.qty
  }

  await withStorageLock(salesPath, async () => {
    const existing = await readSales()
    await writeSales([sale, ...existing])
  })
}
