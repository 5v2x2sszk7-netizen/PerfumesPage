"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input, Label } from "@/components/ui/Field"
import { Button } from "@/components/ui/Button"

export function AdminLoginClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get("next") || "/admin"

  const [token, setToken] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => Boolean(token.trim()), [token])

  async function onLogin() {
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() })
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error || "Error")
      }
      router.replace(nextPath)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg rounded-3xl border border-black/8 bg-white p-6">
      <p className="text-xs tracking-section text-ink-500">ADMIN</p>
      <h1 className="mt-2 font-display text-3xl text-ink-950">Iniciar sesión</h1>
      <div className="mt-6 grid gap-2">
        <Label htmlFor="token">Token</Label>
        <Input
          id="token"
          placeholder='En local puedes usar "dev" si no configuras ADMIN_TOKEN'
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onLogin()
          }}
        />
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <div className="mt-6">
        <Button type="button" onClick={onLogin} disabled={!canSubmit || busy} className="w-full">
          Entrar
        </Button>
      </div>
    </div>
  )
}
