export async function api<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (!headers.has("Cache-Control")) headers.set("Cache-Control", "no-store")
  if (!headers.has("Pragma")) headers.set("Pragma", "no-cache")
  const res = await fetch(input, { ...init, headers, cache: "no-store" })
  if (!res.ok) {
    const json = await res.json().catch(() => null)
    const message = json?.error || res.statusText
    throw new Error(message)
  }
  return (await res.json()) as T
}
