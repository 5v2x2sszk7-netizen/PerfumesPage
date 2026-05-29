"use client"

import type { Dispatch, RefObject, SetStateAction } from "react"
import type { Perfume } from "@/types/perfume"
import { Button } from "@/components/ui/Button"
import { Input, Label, SelectWithCaret, Textarea } from "@/components/ui/Field"
import { Card } from "@/components/ui/Surface"
import type { Draft } from "@/lib/admin/types"
import { formatMoney } from "@/lib/admin/utils"
import { AdminImagePicker } from "@/features/admin/components/AdminImagePicker"

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
      <Card className="p-6">
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
            <Input
              list="admin-perfume-name-suggestions"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Marca *</Label>
            <Input
              list="admin-perfume-brand-suggestions"
              value={draft.brand}
              onChange={(e) => setDraft((d) => ({ ...d, brand: e.target.value }))}
            />
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
            <SelectWithCaret
              value={draft.category}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as Perfume["category"] }))}
            >
              <option value="niche">Nicho</option>
              <option value="designer">Diseñador</option>
            </SelectWithCaret>
          </div>
          <div className="grid gap-2">
            <Label>Disponibilidad</Label>
            <SelectWithCaret
              value={draft.availability}
              onChange={(e) => setDraft((d) => ({ ...d, availability: e.target.value as Perfume["availability"] }))}
            >
              <option value="in_stock">Disponible</option>
              <option value="low_stock">Pocas piezas</option>
              <option value="out_of_stock">Agotado</option>
            </SelectWithCaret>
          </div>
          <div className="grid gap-2">
            <Label>Tamaño (ml) *</Label>
            <Input
              inputMode="numeric"
              value={draft.sizeMl}
              onChange={(e) => setDraft((d) => ({ ...d, sizeMl: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Precio *</Label>
            <Input
              inputMode="numeric"
              value={draft.price}
              onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Costo (tu compra)</Label>
            <Input
              inputMode="numeric"
              value={draft.cost}
              onChange={(e) => setDraft((d) => ({ ...d, cost: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Stock (piezas)</Label>
            <Input
              inputMode="numeric"
              value={draft.stock}
              onChange={(e) => setDraft((d) => ({ ...d, stock: e.target.value }))}
            />
          </div>
          <Card radius="lg" className="md:col-span-2 grid gap-3 p-4">
            <p className="text-xs tracking-ui text-ink-500">GANANCIA</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-control border border-black/8 bg-ink-50/40 px-4 py-3">
                <p className="text-xs text-ink-600">Tu costo</p>
                <p className="mt-1 font-display text-lg text-ink-950">
                  {Number.isFinite(finance.cost) && finance.cost >= 0 ? formatMoney(finance.cost) : "—"}
                </p>
              </div>
              <div className="rounded-control border border-black/8 bg-ink-50/40 px-4 py-3">
                <p className="text-xs text-ink-600">Precio venta</p>
                <p className="mt-1 font-display text-lg text-ink-950">
                  {Number.isFinite(finance.price) && finance.price >= 0 ? formatMoney(finance.price) : "—"}
                </p>
              </div>
              <div className="rounded-control border border-black/8 bg-ink-50/40 px-4 py-3">
                <p className="text-xs text-ink-600">Ganancia</p>
                <p className="mt-1 font-display text-lg text-antiqueGold">
                  {Number.isFinite(finance.profit) ? formatMoney(finance.profit) : "—"}
                </p>
                <p className="mt-1 text-xs text-ink-600">
                  {Number.isFinite(finance.margin) ? `${Math.round(finance.margin * 100)}% margen` : ""}
                </p>
              </div>
            </div>
          </Card>
          <div className="md:col-span-2 grid gap-2">
            <Label>Descripción *</Label>
            <Textarea value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
          </div>

          <div className="md:col-span-2 grid gap-2">
            <AdminImagePicker
              label="Imagen"
              value={draft.imageSrc}
              onChange={(next) => setDraft((d) => ({ ...d, imageSrc: next }))}
              placeholder="/uploads/tu-imagen.jpg"
              busy={busy}
              uploading={uploading}
              uploadedPath={uploadedPath}
              selectedFileName={selectedFileName}
              localPreviewUrl={localPreviewUrl}
              inputRef={fileInputRef}
              accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
              helpEmpty="Selecciona una imagen para que aquí aparezca “Cambiar imagen”."
              onUpload={onUpload}
            />
          </div>

          <div className="grid gap-2">
            <Label>Notas (salida) CSV</Label>
            <Input value={draft.notesTop} onChange={(e) => setDraft((d) => ({ ...d, notesTop: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Notas (corazón) CSV</Label>
            <Input
              value={draft.notesHeart}
              onChange={(e) => setDraft((d) => ({ ...d, notesHeart: e.target.value }))}
            />
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
                  radius="xl"
                  className="w-full border border-black/8 px-4 py-2.5 text-sm hover:bg-ink-50 sm:w-auto"
                  onClick={onCancelEdit}
                  disabled={busy}
                >
                  Cancelar
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </Card>
    </section>
  )
}
