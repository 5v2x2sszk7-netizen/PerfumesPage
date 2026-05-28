import { getStorageDriver } from "@/lib/storage/driver"

export function dataFilePath(fileName: string) {
  return `data/${fileName}`
}

const storageLockTails = new Map<string, Promise<void>>()

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function upstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return { url: url.replace(/\/$/, ""), token }
}

async function upstashCommand(command: unknown[]) {
  const cfg = upstashConfig()
  if (!cfg) return null
  const res = await fetch(`${cfg.url}/command`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  }).catch(() => null)
  if (!res || !res.ok) return null
  const json = (await res.json().catch(() => null)) as { result?: unknown } | null
  return json?.result ?? null
}

async function acquireDistributedLock(lockKey: string, ttlMs: number, waitBudgetMs: number) {
  const cfg = upstashConfig()
  if (!cfg) return null
  const token = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`
  const started = Date.now()
  while (Date.now() - started < waitBudgetMs) {
    const result = await upstashCommand(["SET", lockKey, token, "NX", "PX", String(ttlMs)])
    if (result === "OK") return { lockKey, token }
    await sleep(90 + Math.floor(Math.random() * 70))
  }
  throw new Error("Storage is busy. Try again.")
}

async function releaseDistributedLock(lock: { lockKey: string; token: string } | null) {
  if (!lock) return
  await upstashCommand([
    "EVAL",
    "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
    "1",
    lock.lockKey,
    lock.token
  ])
}

export async function withStorageLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = storageLockTails.get(key) ?? Promise.resolve()
  let release!: () => void
  const next = new Promise<void>((resolve) => {
    release = resolve
  })
  const nextTail = prev.then(() => next)
  storageLockTails.set(key, nextTail)
  await prev
  try {
    const lockKey = `perfimes:lock:${key}`
    const dist = await acquireDistributedLock(lockKey, 15_000, 6_000)
    try {
      return await fn()
    } finally {
      await releaseDistributedLock(dist)
    }
  } finally {
    release()
    if (storageLockTails.get(key) === nextTail) storageLockTails.delete(key)
  }
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
