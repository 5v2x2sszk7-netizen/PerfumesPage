type MemoryRateState = { count: number; resetAt: number }

type RateLimitResult = {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
  retryAfterMs: number
}

function getIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return xff || "unknown"
}

function getRateKey(req: Request, keyPrefix: string) {
  return `${keyPrefix}:${getIp(req)}`
}

function getMemoryStore() {
  const g = globalThis as unknown as { __perfimesRateByKey?: Map<string, MemoryRateState> }
  if (!g.__perfimesRateByKey) g.__perfimesRateByKey = new Map<string, MemoryRateState>()
  return g.__perfimesRateByKey
}

function checkRateLimitMemory(req: Request, keyPrefix: string, windowMs: number, max: number): RateLimitResult {
  const key = getRateKey(req, keyPrefix)
  const now = Date.now()
  const store = getMemoryStore()

  if (store.size > 5000) {
    for (const [k, v] of store) {
      if (v.resetAt <= now) store.delete(k)
    }
  }

  const current = store.get(key)
  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, limit: max, remaining: Math.max(0, max - 1), resetAt, retryAfterMs: 0 }
  }

  if (current.count >= max) {
    const retryAfterMs = Math.max(0, current.resetAt - now)
    return { allowed: false, limit: max, remaining: 0, resetAt: current.resetAt, retryAfterMs }
  }

  current.count += 1
  return {
    allowed: true,
    limit: max,
    remaining: Math.max(0, max - current.count),
    resetAt: current.resetAt,
    retryAfterMs: 0
  }
}

async function checkRateLimitUpstash(
  req: Request,
  keyPrefix: string,
  windowMs: number,
  max: number
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return checkRateLimitMemory(req, keyPrefix, windowMs, max)

  const key = getRateKey(req, keyPrefix)
  const script =
    "local c=redis.call('INCR', KEYS[1]);" +
    "if c==1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); end;" +
    "local ttl=redis.call('PTTL', KEYS[1]);" +
    "return {c, ttl};"

  const res = await fetch(`${url.replace(/\/$/, "")}/command`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(["EVAL", script, "1", key, String(windowMs)])
  }).catch(() => null)

  if (!res || !res.ok) return checkRateLimitMemory(req, keyPrefix, windowMs, max)
  const json = (await res.json().catch(() => null)) as { result?: unknown } | null
  const result = Array.isArray(json?.result) ? json?.result : null
  const count = typeof result?.[0] === "number" ? result?.[0] : NaN
  const ttl = typeof result?.[1] === "number" ? result?.[1] : NaN

  const now = Date.now()
  const retryAfterMs = Number.isFinite(ttl) ? Math.max(0, ttl) : windowMs
  const resetAt = now + retryAfterMs
  const allowed = Number.isFinite(count) ? count <= max : true
  const remaining = Number.isFinite(count) ? Math.max(0, max - count) : Math.max(0, max - 1)

  return { allowed, limit: max, remaining, resetAt, retryAfterMs: allowed ? 0 : retryAfterMs }
}

export async function checkRateLimit(req: Request, opts: { keyPrefix: string; windowMs: number; max: number }) {
  const provider = (process.env.PERFIMES_RATE_LIMIT_PROVIDER || "").trim().toLowerCase()
  if (provider === "memory") return checkRateLimitMemory(req, opts.keyPrefix, opts.windowMs, opts.max)
  if (provider === "upstash" || (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)) {
    return checkRateLimitUpstash(req, opts.keyPrefix, opts.windowMs, opts.max)
  }
  return checkRateLimitMemory(req, opts.keyPrefix, opts.windowMs, opts.max)
}
