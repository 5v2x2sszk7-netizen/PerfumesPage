"use client"

import type { Dispatch, RefObject, SetStateAction } from "react"
import type { Perfume } from "@/types/perfume"
import { Button } from "@/components/ui/Button"
import { Input, Label, SelectWithCaret, Textarea } from "@/components/ui/Field"
import { Card } from "@/components/ui/Surface"
import type { Draft } from "@/lib/admin/types"
import { formatMoney } from "@/lib/admin/utils"
import { AdminImagePicker } from "@/features/admin/components/AdminImagePicker"
import { AdminPanel } from "@/features/admin/components/AdminPanel"

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
    <AdminPanel className="p-2 sm:p-3" innerClassName="p-4 sm:p-5">
      <div className="-mx-4 -mt-4 sticky top-3 z-sticky border-b border-black/6 bg-white/94 px-4 py-4 backdrop-blur shadow-sticky-soft sm:-mx-5 sm:-mt-5 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs tracking-section text-ink-500">{isEditing ? "EDICION" : "NUEVO"}</p>
            <h2 className="font-display text-xl text-ink-950 sm:text-2xl">{isEditing ? "Editar perfume" : "Nuevo perfume"}</h2>
          </div>
        </div>
        {!canSubmit && missingFields.length ? (
          <p className="mt-2 text-sm text-ink-600">Para poder añadirlo, completa: {missingFields.join(", ")}.</p>
        ) : null}
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
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
          <Card radius="lg" className="md:col-span-2 grid gap-4 bg-ink-50/30 p-4 sm:p-5">
            <p className="text-xs tracking-ui text-ink-500">GANANCIA</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-control border border-black/8 bg-white/80 px-4 py-3.5">
                <p className="text-xs text-ink-600">Tu costo</p>
                <p className="mt-1 font-display text-lg text-ink-950">
                  {Number.isFinite(finance.cost) && finance.cost >= 0 ? formatMoney(finance.cost) : "—"}
                </p>
              </div>
              <div className="rounded-control border border-black/8 bg-white/80 px-4 py-3.5">
                <p className="text-xs text-ink-600">Precio venta</p>
                <p className="mt-1 font-display text-lg text-ink-950">
                  {Number.isFinite(finance.price) && finance.price >= 0 ? formatMoney(finance.price) : "—"}
                </p>
              </div>
              <div className="rounded-control border border-black/8 bg-white/82 px-4 py-3.5 shadow-[0_10px_24px_rgba(188,149,79,0.08)]">
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

      <div className="-mx-4 mt-8 sticky bottom-3 z-sticky border-t border-black/6 bg-white/94 px-4 py-4 backdrop-blur shadow-sticky-soft-up sm:-mx-5 sm:px-5">
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
                variant="outline"
                radius="xl"
                className="w-full px-4 py-2.5 text-sm sm:w-auto"
                onClick={onCancelEdit}
                disabled={busy}
              >
                Cancelar
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </AdminPanel>
  )
}
