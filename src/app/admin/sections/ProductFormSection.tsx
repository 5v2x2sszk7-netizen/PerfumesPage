"use client"

import type { Dispatch, RefObject, SetStateAction } from "react"
import type { Perfume } from "@/types/perfume"
import { Button } from "@/components/ui/Button"
import { Input, Label, Textarea } from "@/components/ui/Field"
import { UploadButton } from "@/components/ui/UploadButton"
import type { Draft } from "@/lib/admin/types"
import { formatMoney } from "@/lib/admin/utils"
import Image from "next/image"

type Finance = {
  price: number
  cost: number
  profit: number
  margin: number
}

type Props = {
  draft: Draft
  setDraft: Dispatch<SetStateAction<Draft>>
  isEditing: boolean
  canSubmit: boolean
  missingFields: string[]
  finance: Finance
  busy: boolean
  uploading: boolean
  uploadedPath: string | null
  selectedFileName: string | null
  localPreviewUrl: string | null
  fileInputRef: RefObject<HTMLInputElement | null>
  brandSuggestions: string[]
  nameSuggestions: string[]
  onUpload: (file: File) => void
  onSave: () => void
  onCancelEdit: () => void
}

export function ProductFormSection({
  draft,
  setDraft,
  isEditing,
  canSubmit,
  missingFields,
  finance,
  busy,
  uploading,
  uploadedPath,
  selectedFileName,
  localPreviewUrl,
  fileInputRef,
  brandSuggestions,
  nameSuggestions,
  onUpload,
  onSave,
  onCancelEdit
}: Props) {
  return (
    <section className="rounded-luxe-xl bg-ink-50/60 p-3 ring-1 ring-inset ring-black/8 sm:p-5">
      <div className="rounded-3xl border border-black/8 bg-white p-6">
        <div className="-mx-6 -mt-6 sticky top-3 z-sticky border-b border-black/6 bg-white/90 px-6 py-4 backdrop-blur shadow-sticky-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl text-ink-950">{isEditing ? "Editar perfume" : "Nuevo perfume"}</h2>
          </div>
          {!canSubmit && missingFields.length ? (
            <p className="mt-2 text-sm text-ink-600">Para poder añadirlo, completa: {missingFields.join(", ")}.</p>
          ) : null}
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Nombre *</Label>
            <Input list="admin-perfume-name-suggestions" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Marca *</Label>
            <Input list="admin-perfume-brand-suggestions" value={draft.brand} onChange={(e) => setDraft((d) => ({ ...d, brand: e.target.value }))} />
          </div>
          <datalist id="admin-perfume-name-suggestions">
            {nameSuggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <datalist id="admin-perfume-brand-suggestions">
            {brandSuggestions.map((brand) => (
              <option key={brand} value={brand} />
            ))}
          </datalist>
          <div className="grid gap-2">
            <Label>Categoría</Label>
            <select
              value={draft.category}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as Perfume["category"] }))}
              className="h-11 w-full rounded-xl border border-black/8 bg-white px-4 text-sm text-ink-950 outline-none transition focus:border-antiqueGold/60 focus:ring-4 focus:ring-antiqueGold/15"
            >
              <option value="niche">Nicho</option>
              <option value="designer">Diseñador</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label>Disponibilidad</Label>
            <select
              value={draft.availability}
              onChange={(e) => setDraft((d) => ({ ...d, availability: e.target.value as Perfume["availability"] }))}
              className="h-11 w-full rounded-xl border border-black/8 bg-white px-4 text-sm text-ink-950 outline-none transition focus:border-antiqueGold/60 focus:ring-4 focus:ring-antiqueGold/15"
            >
              <option value="in_stock">Disponible</option>
              <option value="low_stock">Pocas piezas</option>
              <option value="out_of_stock">Agotado</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label>Tamaño (ml) *</Label>
            <Input inputMode="numeric" value={draft.sizeMl} onChange={(e) => setDraft((d) => ({ ...d, sizeMl: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Precio *</Label>
            <Input inputMode="numeric" value={draft.price} onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Costo (tu compra)</Label>
            <Input inputMode="numeric" value={draft.cost} onChange={(e) => setDraft((d) => ({ ...d, cost: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Stock (piezas)</Label>
            <Input inputMode="numeric" value={draft.stock} onChange={(e) => setDraft((d) => ({ ...d, stock: e.target.value }))} />
          </div>
          <div className="md:col-span-2 grid gap-3 rounded-2xl border border-black/8 bg-white p-4">
            <p className="text-xs tracking-ui text-ink-500">GANANCIA</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-black/8 bg-ink-50/40 px-4 py-3">
                <p className="text-xs text-ink-600">Tu costo</p>
                <p className="mt-1 font-display text-lg text-ink-950">
                  {Number.isFinite(finance.cost) && finance.cost >= 0 ? formatMoney(finance.cost) : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-black/8 bg-ink-50/40 px-4 py-3">
                <p className="text-xs text-ink-600">Precio venta</p>
                <p className="mt-1 font-display text-lg text-ink-950">
                  {Number.isFinite(finance.price) && finance.price >= 0 ? formatMoney(finance.price) : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-black/8 bg-ink-50/40 px-4 py-3">
                <p className="text-xs text-ink-600">Ganancia</p>
                <p className="mt-1 font-display text-lg text-antiqueGold">{Number.isFinite(finance.profit) ? formatMoney(finance.profit) : "—"}</p>
                <p className="mt-1 text-xs text-ink-600">{Number.isFinite(finance.margin) ? `${Math.round(finance.margin * 100)}% margen` : ""}</p>
              </div>
            </div>
          </div>
          <div className="md:col-span-2 grid gap-2">
            <Label>Descripción *</Label>
            <Textarea value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
          </div>

          <div className="md:col-span-2 grid gap-2">
            <Label>Imagen</Label>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <Input placeholder="/uploads/tu-imagen.jpg" value={draft.imageSrc} onChange={(e) => setDraft((d) => ({ ...d, imageSrc: e.target.value }))} />
              <UploadButton
                inputRef={fileInputRef}
                accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
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
              <div className="h-24 w-24 overflow-hidden rounded-2xl border border-black/8 bg-ink-50">
                {localPreviewUrl || draft.imageSrc ? (
                  <Image
                    src={localPreviewUrl ?? draft.imageSrc}
                    alt="Preview"
                    width={96}
                    height={96}
                    sizes="96px"
                    className="h-full w-full object-cover"
                    unoptimized={
                      Boolean(localPreviewUrl) ||
                      (draft.imageSrc?.startsWith("data:") ?? false) ||
                      (draft.imageSrc?.startsWith("blob:") ?? false)
                    }
                  />
                ) : null}
              </div>
              <div className="space-y-1">
                {selectedFileName ? <p className="text-xs text-ink-600">{selectedFileName}</p> : null}
                {uploadedPath ? <p className="text-xs text-ink-500">Subida: {uploadedPath}</p> : null}
                {!selectedFileName && !uploadedPath ? (
                  <p className="text-xs text-ink-500">Selecciona una imagen para que aquí aparezca “Cambiar imagen”.</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Notas (salida) CSV</Label>
            <Input value={draft.notesTop} onChange={(e) => setDraft((d) => ({ ...d, notesTop: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Notas (corazón) CSV</Label>
            <Input value={draft.notesHeart} onChange={(e) => setDraft((d) => ({ ...d, notesHeart: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Notas (fondo) CSV</Label>
            <Input value={draft.notesBase} onChange={(e) => setDraft((d) => ({ ...d, notesBase: e.target.value }))} />
          </div>
        </div>

        <div className="-mx-6 mt-10 sticky bottom-3 z-sticky border-t border-black/6 bg-white/90 px-6 py-4 backdrop-blur shadow-sticky-soft-up">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-600">{canSubmit ? "Listo para guardar." : "Completa los campos obligatorios (*)"}</p>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              <Button
                type="button"
                onClick={onSave}
                disabled={busy || !canSubmit}
                variant="gold"
                className="w-full hover:shadow-cta-hover sm:w-auto"
              >
                {isEditing ? "Guardar cambios" : "Añadir al catálogo"}
              </Button>
              {isEditing ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full rounded-xl border border-black/8 px-4 py-2.5 text-sm hover:bg-ink-50 sm:w-auto"
                  onClick={onCancelEdit}
                  disabled={busy}
                >
                  Cancelar
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
