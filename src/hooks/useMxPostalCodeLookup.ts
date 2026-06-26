"use client"

import { useEffect, useState } from "react"
import { normalizePostalCodeInput, type PostalCodeLookupResult } from "@/lib/mxAddress"

type LookupState =
  | { status: "idle"; result: null; error: "" }
  | { status: "loading"; result: null; error: "" }
  | { status: "success"; result: PostalCodeLookupResult; error: "" }
  | { status: "error"; result: null; error: string }

const lookupCache = new Map<string, PostalCodeLookupResult | null>()

export function useMxPostalCodeLookup(postalCode: string) {
  const normalizedPostalCode = normalizePostalCodeInput(postalCode)
  const [state, setState] = useState<LookupState>({ status: "idle", result: null, error: "" })

  useEffect(() => {
    if (normalizedPostalCode.length !== 5) {
      setState({ status: "idle", result: null, error: "" })
      return
    }

    const cached = lookupCache.get(normalizedPostalCode)
    if (cached) {
      setState({ status: "success", result: cached, error: "" })
      return
    }

    if (lookupCache.has(normalizedPostalCode) && cached === null) {
      setState({ status: "error", result: null, error: "No encontramos informacion para ese codigo postal." })
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      setState({ status: "loading", result: null, error: "" })
      try {
        const response = await fetch(`/api/postal-code/${normalizedPostalCode}`, {
          cache: "no-store",
          signal: controller.signal
        })
        const json = (await response.json().catch(() => null)) as
          | { ok?: boolean; error?: string; result?: PostalCodeLookupResult }
          | null

        if (!response.ok || !json?.ok || !json.result) {
          lookupCache.set(normalizedPostalCode, null)
          setState({
            status: "error",
            result: null,
            error: json?.error || "No se pudo validar el codigo postal."
          })
          return
        }

        lookupCache.set(normalizedPostalCode, json.result)
        setState({ status: "success", result: json.result, error: "" })
      } catch (error) {
        if (controller.signal.aborted) return
        setState({
          status: "error",
          result: null,
          error: error instanceof Error ? error.message : "No se pudo validar el codigo postal."
        })
      }
    }, 260)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [normalizedPostalCode])

  return state
}
