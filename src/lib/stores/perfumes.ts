import type { Perfume } from "@/types/perfume"
import { dataFilePath, readJsonArray, writeJson } from "@/lib/storage/jsonFile"

const perfumesPath = dataFilePath("perfumes.json")

function normalizePerfume(input: Perfume): Perfume {
  const cost =
    typeof (input as unknown as { cost?: unknown }).cost === "number" &&
    Number.isFinite((input as unknown as { cost: number }).cost)
      ? Math.max(0, (input as unknown as { cost: number }).cost)
      : 0
  const sold =
    typeof (input as unknown as { sold?: unknown }).sold === "number" &&
    Number.isFinite((input as unknown as { sold: number }).sold)
      ? Math.max(0, Math.floor((input as unknown as { sold: number }).sold))
      : 0
  const stock =
    typeof (input as unknown as { stock?: unknown }).stock === "number"
      ? (input as unknown as { stock: number }).stock
      : input.availability === "out_of_stock"
        ? 0
        : 1
  return { ...input, cost, sold, stock }
}

export async function readPerfumes(): Promise<Perfume[]> {
  const parsed = await readJsonArray<Perfume>(perfumesPath)
  return parsed.map(normalizePerfume)
}

export async function writePerfumes(perfumes: Perfume[]) {
  await writeJson(perfumesPath, perfumes.map(normalizePerfume))
}
