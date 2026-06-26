"use client"

import { useState } from "react"
import { Container } from "@/components/ui/Container"
import { Card } from "@/components/ui/Surface"
import { Input, Label } from "@/components/ui/Field"
import { Button, ButtonLink, ButtonExternal } from "@/components/ui/Button"

type ForgotPasswordResponse = {
  ok?: boolean
  error?: string
  message?: string
  previewUrl?: string
}

async function readJson<T>(response: Response) {
  return (await response.json().catch(() => null)) as T | null
}

export function RecoverPasswordPageClient({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail)
  const [status, setStatus] = useState<"idle" | "submitting">("idle")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [previewUrl, setPreviewUrl] = useState("")

  async function onSubmit() {
    setError("")
    setMessage("")
    setPreviewUrl("")

    if (!email.trim() || !email.includes("@")) {
      setError("Ingresa un correo válido para continuar.")
      return
    }

    setStatus("submitting")
    try {
      const response = await fetch("/api/account/password/forgot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      })

      const json = await readJson<ForgotPasswordResponse>(response)
      if (!response.ok || !json?.ok) {
        throw new Error(json?.error || "No se pudo iniciar la recuperación.")
      }

      setMessage(
        json.message ||
          "Si encontramos una cuenta con ese correo, te enviaremos un enlace para restablecer tu contraseña."
      )
      setPreviewUrl(json.previewUrl || "")
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo iniciar la recuperación.")
    } finally {
      setStatus("idle")
    }
  }

  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="overflow-hidden rounded-luxe-xl border border-black/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(247,244,238,0.94))] shadow-[0_18px_50px_rgba(10,10,10,0.05)]">
          <div className="border-b border-black/6 px-5 py-4 sm:px-7">
            <p className="text-[11px] tracking-section text-ink-400">ACCESO</p>
            <h1 className="mt-2 font-display text-3xl leading-none text-ink-950 sm:text-[2.8rem]">Recupera tu acceso</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-700">
              Te enviaremos un enlace seguro para restablecer tu contraseña y retomar tu cuenta con calma.
            </p>
          </div>
          <div className="grid gap-3 px-5 py-3 text-sm text-ink-600 sm:grid-cols-3 sm:px-7">
            <p className="leading-6">El enlace solo puede usarse una vez.</p>
            <p className="leading-6">La vigencia es breve para proteger tu acceso.</p>
            <p className="leading-6">Si tu correo existe, recibirás instrucciones enseguida.</p>
          </div>
        </div>

        {error ? (
          <div className="rounded-luxe-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">{error}</div>
        ) : null}

        {message ? (
          <div className="rounded-luxe-xl border border-antiqueGold/25 bg-[linear-gradient(135deg,rgba(251,248,241,0.96),rgba(247,243,233,0.92))] px-4 py-3 text-sm leading-6 text-ink-700 shadow-[0_12px_28px_rgba(188,149,79,0.08)]">
            <p>{message}</p>
            {previewUrl ? (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <ButtonExternal
                  href={previewUrl}
                  variant="gold"
                  className="h-12 whitespace-nowrap px-6 text-[13px] font-semibold tracking-[0.08em] text-white"
                >
                  Abrir enlace de prueba
                </ButtonExternal>
                <p className="text-xs leading-5 text-ink-500">
                  Vista previa local activa mientras configuras el envío real por correo.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        <Card className="p-5 shadow-[0_16px_42px_rgba(10,10,10,0.04)] sm:p-7">
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs tracking-section text-ink-500">CORREO</p>
              <h2 className="font-display text-2xl text-ink-950">Solicita tu enlace</h2>
              <p className="max-w-xl text-sm leading-6 text-ink-700">
                Usa el mismo correo con el que inicias sesión en tu cuenta de MALO Fragances.
              </p>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="recover-email">Correo</Label>
              <Input
                id="recover-email"
                type="email"
                autoComplete="email"
                className="h-12 border-black/12 shadow-[0_8px_18px_rgba(10,10,10,0.03)]"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="gold"
                className="h-14 whitespace-nowrap px-7 text-[15px] font-semibold tracking-[0.08em] text-white shadow-[0_14px_32px_rgba(188,149,79,0.18)]"
                disabled={status !== "idle"}
                onClick={onSubmit}
              >
                {status === "submitting" ? "Enviando..." : "Enviar enlace"}
              </Button>
              <ButtonLink href="/account" variant="outline" className="h-14 whitespace-nowrap px-6">
                Volver a mi cuenta
              </ButtonLink>
            </div>
          </div>
        </Card>
      </div>
    </Container>
  )
}
