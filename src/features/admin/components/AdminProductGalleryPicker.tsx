"use client"

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/Button"
import { Input, Label } from "@/components/ui/Field"
import { UploadButton } from "@/components/ui/UploadButton"
import { maxPerfumeImages } from "@/lib/perfume/parsers"

type SlotUploadState = {
  selectedFileName: string | null
  localPreviewUrl: string | null
  uploadedPath: string | null
}

const slotLabels = ["Portada", "Foto 2", "Foto 3", "Foto 4", "Foto 5", "Foto 6"] as const

function emptySlotState(): SlotUploadState {
  return {
    selectedFileName: null,
    localPreviewUrl: null,
    uploadedPath: null
  }
}

export function AdminProductGalleryPicker({
  label,
  values,
  onChange,
  busy,
  setBusy,
  setError,
  endpoint,
  accept
}: {
  label: string
  values: string[]
  onChange: (next: string[]) => void
  busy: boolean
  setBusy: Dispatch<SetStateAction<boolean>>
  setError: Dispatch<SetStateAction<string | null>>
  endpoint: string
  accept: string
}) {
  const normalizedValues = useMemo(
    () => Array.from({ length: maxPerfumeImages }, (_, index) => values[index]?.trim() || ""),
    [values]
  )
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [slotState, setSlotState] = useState<SlotUploadState[]>(() => Array.from({ length: maxPerfumeImages }, emptySlotState))

  useEffect(() => {
    return () => {
      setSlotState((current) => {
        current.forEach((slot) => {
          if (slot.localPreviewUrl) URL.revokeObjectURL(slot.localPreviewUrl)
        })
        return current
      })
    }
  }, [])

  useEffect(() => {
    setSlotState((current) =>
      current.map((slot, index) => {
        const nextValue = normalizedValues[index]
        if (!slot.localPreviewUrl && slot.uploadedPath === nextValue) return slot
        if (!slot.localPreviewUrl && !slot.uploadedPath && !nextValue) return slot
        if (slot.localPreviewUrl) URL.revokeObjectURL(slot.localPreviewUrl)
        return {
          selectedFileName: null,
          localPreviewUrl: null,
          uploadedPath: nextValue || null
        }
      })
    )
  }, [normalizedValues])

  async function handleUpload(index: number, file: File) {
    setSlotState((current) =>
      current.map((slot, slotIndex) => {
        if (slotIndex !== index) return slot
        if (slot.localPreviewUrl) URL.revokeObjectURL(slot.localPreviewUrl)
        return {
          selectedFileName: file.name || null,
          localPreviewUrl: URL.createObjectURL(file),
          uploadedPath: slot.uploadedPath
        }
      })
    )
    setUploadingIndex(index)
    setBusy(true)
    setError(null)

    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch(endpoint, { method: "POST", body: form })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error || "No se pudo subir la imagen.")
      }

      const json = (await res.json()) as { path: string }
      const next = [...normalizedValues]
      next[index] = json.path
      onChange(next)
      setSlotState((current) =>
        current.map((slot, slotIndex) =>
          slotIndex === index
            ? {
                selectedFileName: file.name || null,
                localPreviewUrl: slot.localPreviewUrl,
                uploadedPath: json.path
              }
            : slot
        )
      )
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo subir la imagen.")
    } finally {
      setBusy(false)
      setUploadingIndex(null)
    }
  }

  function updateValue(index: number, nextValue: string) {
    const next = [...normalizedValues]
    next[index] = nextValue
    onChange(next)
  }

  function clearSlot(index: number) {
    const next = [...normalizedValues]
    next[index] = ""
    onChange(next)
  }

  return (
    <div className="grid gap-3">
      <div className="space-y-1">
        <Label>{label}</Label>
        <p className="text-xs leading-6 text-ink-500">
          Puedes cargar hasta 6 fotos. La primera se usa como portada del catálogo, carrito y checkout.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {normalizedValues.map((value, index) => {
          const slot = slotState[index]
          const previewSrc = slot.localPreviewUrl || value
          const isUploading = uploadingIndex === index
          const unoptimized = Boolean(slot.localPreviewUrl) || value.startsWith("data:") || value.startsWith("blob:")

          return (
            <div key={slotLabels[index]} className="rounded-luxe-lg border border-black/8 bg-ink-50/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs tracking-section text-ink-500">{slotLabels[index]}</p>
                {index === 0 ? (
                  <span className="rounded-full border border-antiqueGold/20 bg-antiqueGold/10 px-2.5 py-1 text-[11px] tracking-[0.14em] text-antiqueGold">
                    Principal
                  </span>
                ) : null}
              </div>

              <div className="mt-3 overflow-hidden rounded-luxe border border-black/8 bg-white">
                <div className="relative aspect-square">
                  {previewSrc ? (
                    <Image
                      src={previewSrc}
                      alt={`Vista previa ${slotLabels[index]}`}
                      fill
                      sizes="(max-width: 1280px) 50vw, 280px"
                      className="object-cover"
                      unoptimized={unoptimized}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-6 text-center text-xs leading-6 text-ink-400">
                      Sin imagen
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 grid gap-2">
                <Input
                  placeholder="/uploads/tu-imagen.webp"
                  value={value}
                  onChange={(event) => updateValue(index, event.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <UploadButton
                    accept={accept}
                    disabled={busy}
                    onSelect={(files) => {
                      const file = files[0]
                      if (file) void handleUpload(index, file)
                    }}
                    className="sm:min-w-36"
                  >
                    {isUploading ? "Subiendo..." : value || slot.selectedFileName ? "Cambiar imagen" : "Elegir imagen"}
                  </UploadButton>
                  {value ? (
                    <Button type="button" variant="outline" className="sm:min-w-28" onClick={() => clearSlot(index)} disabled={busy}>
                      Limpiar
                    </Button>
                  ) : null}
                </div>
                {slot.selectedFileName ? <p className="text-xs text-ink-600">{slot.selectedFileName}</p> : null}
                {slot.uploadedPath ? <p className="text-xs break-all text-ink-500">Subida: {slot.uploadedPath}</p> : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
