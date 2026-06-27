import fs from "node:fs/promises"
import path from "node:path"
import { ensureFsWritesAllowed } from "@/lib/persistence"

type StorageWriteOptions = {
  contentType?: string
}

type StorageDriver = {
  readText: (key: string) => Promise<string | null>
  writeText: (key: string, value: string, options?: StorageWriteOptions) => Promise<void>
  readBytes: (key: string) => Promise<Uint8Array | null>
  writeBytes: (key: string, value: Uint8Array, options?: StorageWriteOptions) => Promise<void>
}

function normalizeKey(input: string) {
  return input.replace(/^\/+/, "").trim()
}

function resolveFsPathFromKey(key: string) {
  const normalized = normalizeKey(key)
  validateStorageKey(normalized)
  if (normalized.startsWith("uploads/")) {
    const rest = normalized.slice("uploads/".length)
    const base = path.resolve(process.cwd(), "public", "uploads")
    const resolved = path.resolve(base, rest)
    if (resolved !== base && !resolved.startsWith(base + path.sep)) {
      throw new Error(`Unsupported storage key: ${normalized}`)
    }
    return resolved
  }
  if (normalized.startsWith("data/")) {
    const rest = normalized.slice("data/".length)
    const base = path.resolve(process.cwd(), "data")
    const resolved = path.resolve(base, rest)
    if (resolved !== base && !resolved.startsWith(base + path.sep)) {
      throw new Error(`Unsupported storage key: ${normalized}`)
    }
    return resolved
  }
  throw new Error(`Unsupported storage key: ${normalized}`)
}

function inferScopeFromKey(key: string): "data" | "uploads" | null {
  const normalized = normalizeKey(key)
  if (normalized.startsWith("uploads/")) return "uploads"
  if (normalized.startsWith("data/")) return "data"
  return null
}

function validateStorageKey(normalized: string) {
  if (!normalized) throw new Error("Unsupported storage key")
  if (!(normalized.startsWith("uploads/") || normalized.startsWith("data/"))) {
    throw new Error(`Unsupported storage key: ${normalized}`)
  }
  if (normalized.includes("..")) throw new Error(`Unsupported storage key: ${normalized}`)
  if (normalized.includes("\\")) throw new Error(`Unsupported storage key: ${normalized}`)
  if (normalized.includes("\u0000")) throw new Error(`Unsupported storage key: ${normalized}`)
}

class FsStorageDriver implements StorageDriver {
  async readText(key: string) {
    const filePath = resolveFsPathFromKey(key)
    try {
      return await fs.readFile(filePath, "utf8")
    } catch (err: unknown) {
      const code = typeof err === "object" && err !== null ? (err as { code?: string }).code : undefined
      if (code === "ENOENT") return null
      throw err
    }
  }

  async writeText(key: string, value: string, options?: StorageWriteOptions) {
    void options
    const scope = inferScopeFromKey(key)
    if (scope) ensureFsWritesAllowed(scope)
    const filePath = resolveFsPathFromKey(key)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, value, "utf8")
  }

  async readBytes(key: string) {
    const filePath = resolveFsPathFromKey(key)
    try {
      const buf = await fs.readFile(filePath)
      return new Uint8Array(buf)
    } catch (err: unknown) {
      const code = typeof err === "object" && err !== null ? (err as { code?: string }).code : undefined
      if (code === "ENOENT") return null
      throw err
    }
  }

  async writeBytes(key: string, value: Uint8Array, options?: StorageWriteOptions) {
    void options
    const scope = inferScopeFromKey(key)
    if (scope) ensureFsWritesAllowed(scope)
    const filePath = resolveFsPathFromKey(key)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, Buffer.from(value))
  }
}

class UpstashDataStorageDriver implements StorageDriver {
  private baseUrl: string
  private token: string
  private fallback: FsStorageDriver

  constructor(opts: { baseUrl: string; token: string; fallback: FsStorageDriver }) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "")
    this.token = opts.token
    this.fallback = opts.fallback
  }

  private storageKey(key: string) {
    const normalized = normalizeKey(key)
    validateStorageKey(normalized)
    if (inferScopeFromKey(normalized) !== "data") return null
    return `perfimes:storage:${normalized}`
  }

  private async command(command: unknown[]) {
    const res = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(command)
    })
    if (!res.ok) throw new Error(`Storage command failed: ${res.status}`)
    const json = (await res.json().catch(() => null)) as { result?: unknown } | null
    return json?.result ?? null
  }

  async readText(key: string) {
    const storageKey = this.storageKey(key)
    if (!storageKey) return this.fallback.readText(key)

    const value = await this.command(["GET", storageKey]).catch(() => null)
    if (typeof value === "string") return value

    const fallbackValue = await this.fallback.readText(key)
    if (fallbackValue !== null) {
      await this.command(["SET", storageKey, fallbackValue]).catch(() => null)
    }
    return fallbackValue
  }

  async writeText(key: string, value: string, options?: StorageWriteOptions) {
    const storageKey = this.storageKey(key)
    if (!storageKey) return this.fallback.writeText(key, value, options)
    await this.command(["SET", storageKey, value])
  }

  async readBytes(key: string) {
    const scope = inferScopeFromKey(key)
    if (scope !== "data") return this.fallback.readBytes(key)
    const text = await this.readText(key)
    return text === null ? null : new TextEncoder().encode(text)
  }

  async writeBytes(key: string, value: Uint8Array, options?: StorageWriteOptions) {
    const scope = inferScopeFromKey(key)
    if (scope !== "data") return this.fallback.writeBytes(key, value, options)
    await this.writeText(key, new TextDecoder().decode(value), options)
  }
}

class HttpStorageDriver implements StorageDriver {
  private baseUrl: string
  private token: string | undefined

  constructor(opts: { baseUrl: string; token?: string }) {
    this.baseUrl = opts.baseUrl
    this.token = opts.token
  }

  private urlForKey(key: string) {
    const normalized = normalizeKey(key)
    validateStorageKey(normalized)
    const base = this.baseUrl.endsWith("/") ? this.baseUrl : `${this.baseUrl}/`
    return new URL(normalized, base)
  }

  private headers(contentType?: string) {
    const headers: Record<string, string> = {}
    if (this.token) headers.Authorization = `Bearer ${this.token}`
    if (contentType) headers["Content-Type"] = contentType
    return headers
  }

  async readText(key: string) {
    const res = await fetch(this.urlForKey(key), { method: "GET", headers: this.headers() })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Storage read failed: ${res.status}`)
    return await res.text()
  }

  async writeText(key: string, value: string, options?: StorageWriteOptions) {
    const res = await fetch(this.urlForKey(key), {
      method: "PUT",
      headers: this.headers(options?.contentType ?? "text/plain; charset=utf-8"),
      body: value
    })
    if (!res.ok) throw new Error(`Storage write failed: ${res.status}`)
  }

  async readBytes(key: string) {
    const res = await fetch(this.urlForKey(key), { method: "GET", headers: this.headers() })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Storage read failed: ${res.status}`)
    const buf = await res.arrayBuffer()
    return new Uint8Array(buf)
  }

  async writeBytes(key: string, value: Uint8Array, options?: StorageWriteOptions) {
    const body = value.slice().buffer as ArrayBuffer
    const res = await fetch(this.urlForKey(key), {
      method: "PUT",
      headers: this.headers(options?.contentType ?? "application/octet-stream"),
      body
    })
    if (!res.ok) throw new Error(`Storage write failed: ${res.status}`)
  }
}

let cachedDriver: StorageDriver | null = null

export function getStorageDriver(): StorageDriver {
  if (cachedDriver) return cachedDriver

  const fsDriver = new FsStorageDriver()
  const baseUrl = process.env.PERFIMES_STORAGE_BASE_URL
  const token = process.env.PERFIMES_STORAGE_TOKEN
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN
  const useRemote = process.env.NODE_ENV === "production" && typeof baseUrl === "string" && baseUrl.trim()
  const useUpstash =
    process.env.NODE_ENV === "production" &&
    typeof upstashUrl === "string" &&
    typeof upstashToken === "string" &&
    upstashUrl.trim() &&
    upstashToken.trim()

  cachedDriver = useRemote
    ? new HttpStorageDriver({ baseUrl: baseUrl!, token })
    : useUpstash
      ? new UpstashDataStorageDriver({ baseUrl: upstashUrl!, token: upstashToken!, fallback: fsDriver })
      : fsDriver
  return cachedDriver
}
