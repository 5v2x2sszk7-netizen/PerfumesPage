import { getStorageDriver } from "@/lib/storage/driver"

export function dataFilePath(fileName: string) {
  return `data/${fileName}`
}

export async function readJsonArrayResult<T>(filePath: string): Promise<
  | { status: "ok"; value: T[] }
  | { status: "missing"; value: [] }
  | { status: "invalid"; value: [] }
  | { status: "error"; value: [] }
> {
  try {
    const raw = await getStorageDriver().readText(filePath)
    if (raw === null) return { status: "missing", value: [] }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return { status: "invalid", value: [] }
    return { status: "ok", value: parsed as T[] }
  } catch {
    return { status: "error", value: [] }
  }
}

export async function readJsonArray<T>(filePath: string): Promise<T[]> {
  const res = await readJsonArrayResult<T>(filePath)
  return res.status === "ok" ? res.value : []
}

export async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await getStorageDriver().readText(filePath)
    if (raw === null) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export async function writeJson(filePath: string, value: unknown) {
  await getStorageDriver().writeText(filePath, JSON.stringify(value, null, 2), {
    contentType: "application/json; charset=utf-8"
  })
}
