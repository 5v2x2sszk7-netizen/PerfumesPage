import fs from "node:fs/promises"
import path from "node:path"

const dataDir = path.join(process.cwd(), "data")

export function dataFilePath(fileName: string) {
  return path.join(dataDir, fileName)
}

export function readErrorCode(err: unknown) {
  return typeof err === "object" && err !== null ? (err as { code?: string }).code : undefined
}

export async function readJsonArrayResult<T>(filePath: string): Promise<
  | { status: "ok"; value: T[] }
  | { status: "missing"; value: [] }
  | { status: "invalid"; value: [] }
  | { status: "error"; value: [] }
> {
  try {
    const raw = await fs.readFile(filePath, "utf8")
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return { status: "invalid", value: [] }
    return { status: "ok", value: parsed as T[] }
  } catch (err: unknown) {
    const code = readErrorCode(err)
    if (code === "ENOENT") return { status: "missing", value: [] }
    return { status: "error", value: [] }
  }
}

export async function readJsonArray<T>(filePath: string): Promise<T[]> {
  const res = await readJsonArrayResult<T>(filePath)
  return res.status === "ok" ? res.value : []
}

export async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8")
    return JSON.parse(raw) as T
  } catch (err: unknown) {
    const code = readErrorCode(err)
    if (code === "ENOENT") return null
    return null
  }
}

export async function writeJson(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8")
}
