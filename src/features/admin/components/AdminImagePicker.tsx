"use client"

import type { RefObject } from "react"
import { Input, Label } from "@/components/ui/Field"
import { UploadButton } from "@/components/ui/UploadButton"
import Image from "next/image"

export function AdminImagePicker({
  label,
  value,
  onChange,
  placeholder,
  busy,
  uploading,
  uploadedPath,
  selectedFileName,
  localPreviewUrl,
  inputRef,
  accept,
  helpEmpty,
  onUpload
}: {
  label: string
  value: string
  onChange: (next: string) => void
  placeholder: string
  busy: boolean
  uploading: boolean
  uploadedPath: string | null
  selectedFileName: string | null
  localPreviewUrl: string | null
  inputRef: RefObject<HTMLInputElement | null>
  accept: string
  helpEmpty: string
  onUpload: (file: File) => void
}) {
  const src = localPreviewUrl || value ? (localPreviewUrl ?? value) : ""
  const unoptimized = Boolean(localPreviewUrl) || value.startsWith("data:") || value.startsWith("blob:")

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <Input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
        <UploadButton
          inputRef={inputRef}
          accept={accept}
          disabled={busy}
          onSelect={(files) => {
            const f = files[0]
            if (f) onUpload(f)
          }}
        >
          {uploading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
              Subiendo...
            </span>
          ) : uploadedPath || selectedFileName ? (
            "Cambiar imagen"
          ) : (
            "Elegir imagen"
          )}
        </UploadButton>
      </div>
      <div className="grid gap-2 sm:grid-cols-[120px_1fr] sm:items-center">
        <div className="h-24 w-24 overflow-hidden rounded-ui border border-black/8 bg-ink-50">
          {src ? (
            <Image
              src={src}
              alt="Preview"
              width={96}
              height={96}
              sizes="96px"
              className="h-full w-full object-cover"
              unoptimized={unoptimized}
            />
          ) : null}
        </div>
        <div className="space-y-1">
          {selectedFileName ? <p className="text-xs text-ink-600">{selectedFileName}</p> : null}
          {uploadedPath ? <p className="text-xs text-ink-500">Subida: {uploadedPath}</p> : null}
          {!selectedFileName && !uploadedPath ? <p className="text-xs text-ink-500">{helpEmpty}</p> : null}
        </div>
      </div>
    </div>
  )
}
