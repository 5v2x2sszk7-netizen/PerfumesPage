"use client"

import { PerfumeCard, type PerfumeCardModel } from "@/components/perfume/PerfumeCard"
import { Input, Label, Select } from "@/components/ui/Field"
import { Button } from "@/components/ui/Button"
import { Surface } from "@/components/ui/Surface"
import { LazyReveal } from "@/components/ui/LazyReveal"
import { Pill } from "@/components/ui/Pill"
import { cn, focusRing } from "@/lib/cn"
import { availabilityLabel } from "@/lib/whatsapp"
import { normalizeSearchText } from "@/lib/text"
import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"

type SortKey = "recommended" | "name_asc" | "brand_asc" | "availability" | "price_asc" | "price_desc"
type ViewMode = "grid" | "list"

function parseSortKey(value: string | null): SortKey {
  if (
    value === "name_asc" ||
    value === "brand_asc" ||
    value === "availability" ||
    value === "price_asc" ||
    value === "price_desc" ||
    value === "recommended"
  ) {
    return value
  }
  return "recommended"
}

function parseViewMode(value: string | null): ViewMode {
  if (value === "list" || value === "grid") return value
  return "grid"
}

function parseCategory(value: string | null): PerfumeCardModel["category"] {
  if (value === "designer" || value === "niche") return value
  return "niche"
}

function compareAvailability(a: PerfumeCardModel["availability"], b: PerfumeCardModel["availability"]) {
  const rank: Record<PerfumeCardModel["availability"], number> = {
    in_stock: 0,
    low_stock: 1,
    out_of_stock: 2
  }
  return rank[a] - rank[b]
}

function useCatalogPreferences(
  searchParams: ReturnType<typeof useSearchParams>,
  replaceQuery: (mut: (next: URLSearchParams) => void) => void
) {
  const view = parseViewMode(searchParams.get("view"))
  const category = parseCategory(searchParams.get("category"))

  useEffect(() => {
    const storedViewRaw = localStorage.getItem("catalog_view")
    const viewToSet = storedViewRaw === "grid" || storedViewRaw === "list" ? storedViewRaw : null

    const storedCategoryRaw = localStorage.getItem("catalog_category")
    const categoryToSet = storedCategoryRaw === "niche" || storedCategoryRaw === "designer" ? storedCategoryRaw : null

    const shouldSetView = !searchParams.get("view") && viewToSet != null && viewToSet !== "grid"
    const shouldSetCategory = !searchParams.get("category") && categoryToSet != null && categoryToSet !== "niche"

    if (!shouldSetView && !shouldSetCategory) return

    replaceQuery((next) => {
      if (shouldSetView) next.set("view", viewToSet)
      if (shouldSetCategory) next.set("category", categoryToSet)
    })
  }, [replaceQuery, searchParams])

  useEffect(() => {
    localStorage.setItem("catalog_view", view)
  }, [view])

  useEffect(() => {
    localStorage.setItem("catalog_category", category)
  }, [category])

  return { view, category }
}

export function CatalogClient({ perfumes }: { perfumes: PerfumeCardModel[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const replaceQuery = useCallback(
    (mut: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString())
      mut(next)
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const q = searchParams.get("q") ?? ""
  const { view, category } = useCatalogPreferences(searchParams, replaceQuery)
  const brand = searchParams.get("brand") ?? ""
  const availability = searchParams.get("availability") ?? ""
  const sort = parseSortKey(searchParams.get("sort"))
  const hasActiveFilters = Boolean(q.trim() || brand || availability || sort !== "recommended")

  const [isFilterOpen, setIsFilterOpen] = useState(() => hasActiveFilters)

  const brands = useMemo(() => {
    const base = perfumes.filter((p) => p.category === category)
    return Array.from(new Set(base.map((p) => p.brand))).sort((a, b) => a.localeCompare(b, "es"))
  }, [perfumes, category])

  const filtered = useMemo(() => {
    const query = normalizeSearchText(q)
    return perfumes.filter((p) => {
      if (p.category !== category) return false
      if (brand && p.brand !== brand) return false
      if (availability && p.availability !== availability) return false
      if (!query) return true
      const haystack = normalizeSearchText(`${p.brand} ${p.name}`)
      return haystack.includes(query)
    })
  }, [perfumes, q, category, brand, availability])

  const ordered = useMemo(() => {
    const items = [...filtered]
    if (sort === "name_asc") {
      items.sort((a, b) => a.name.localeCompare(b.name, "es"))
      return items
    }
    if (sort === "brand_asc") {
      items.sort((a, b) => {
        const byBrand = a.brand.localeCompare(b.brand, "es")
        if (byBrand !== 0) return byBrand
        return a.name.localeCompare(b.name, "es")
      })
      return items
    }
    if (sort === "availability") {
      items.sort((a, b) => {
        const byAvailability = compareAvailability(a.availability, b.availability)
        if (byAvailability !== 0) return byAvailability
        return a.name.localeCompare(b.name, "es")
      })
      return items
    }
    if (sort === "price_asc") {
      items.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name, "es"))
      return items
    }
    if (sort === "price_desc") {
      items.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name, "es"))
      return items
    }
    return items
  }, [filtered, sort])

  function clearFilters() {
    replaceQuery((next) => {
      next.delete("q")
      next.delete("brand")
      next.delete("availability")
      next.delete("sort")
    })
  }

  const countLabel = `${ordered.length} ${ordered.length === 1 ? "Producto" : "Productos"}`
  const showCount = ordered.length > 0

  return (
    <div className="mt-8">
      <Surface className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <div className="grid gap-2">
            <p className="text-ui-xs font-medium tracking-kicker text-ink-500">CATEGORÍA</p>
            <div className="flex items-center gap-2">
              <Pill
                type="button"
                variant="catalog"
                active={category === "niche"}
                onClick={() => {
                  replaceQuery((next) => {
                    next.delete("brand")
                    next.delete("category")
                  })
                }}
              >
                Nicho
              </Pill>
              <Pill
                type="button"
                variant="catalog"
                active={category === "designer"}
                onClick={() => {
                  replaceQuery((next) => {
                    next.delete("brand")
                    next.set("category", "designer")
                  })
                }}
              >
                Diseñador
              </Pill>
            </div>
          </div>

          {showCount ? (
            <p className="hidden text-sm font-medium tracking-wide text-ink-950 sm:block">{countLabel}</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setIsFilterOpen((v) => !v)}
          className={cn(
            "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink-50/70 px-5 text-sm font-medium tracking-wide text-ink-950 ring-1 ring-inset ring-black/8 transition-luxe duration-700 ease-luxe hover:-translate-y-0.5 hover:bg-white sm:w-auto",
            focusRing,
            hasActiveFilters ? "ring-antiqueGold/22 shadow-pill-active" : ""
          )}
          aria-expanded={isFilterOpen}
          aria-controls="catalog-filters"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M3 5h18M6 12h12M10 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {isFilterOpen ? "Cerrar filtros" : "Filtros"}
          {hasActiveFilters ? <span className="ml-1 inline-flex h-2 w-2 rounded-full bg-antiqueGold" /> : null}
        </button>
      </Surface>

      {isFilterOpen ? (
        <Surface id="catalog-filters" className="mt-4 p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="q" className="text-ui-xs tracking-ui text-ink-600">
                  Buscar
                </Label>
                <Input
                  id="q"
                  name="q"
                  placeholder="Nombre o marca"
                  value={q}
                  autoComplete="off"
                  variant="pill"
                  uiSize="sm"
                  onChange={(e) => {
                    const value = e.target.value
                    replaceQuery((next) => {
                      if (value.trim()) next.set("q", value)
                      else next.delete("q")
                    })
                  }}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="brand" className="text-ui-xs tracking-ui text-ink-600">
                  Marca
                </Label>
                <Select
                  id="brand"
                  name="brand"
                  value={brand}
                  onChange={(e) => {
                    const value = e.target.value
                    replaceQuery((next) => {
                      if (value) next.set("brand", value)
                      else next.delete("brand")
                    })
                  }}
                  variant="pill"
                  uiSize="sm"
                >
                  <option value="">Todas</option>
                  {brands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="availability" className="text-ui-xs tracking-ui text-ink-600">
                  Disponibilidad
                </Label>
                <Select
                  id="availability"
                  name="availability"
                  value={availability}
                  onChange={(e) => {
                    const value = e.target.value
                    replaceQuery((next) => {
                      if (value) next.set("availability", value)
                      else next.delete("availability")
                    })
                  }}
                  variant="pill"
                  uiSize="sm"
                >
                  <option value="">Todas</option>
                  <option value="in_stock">{availabilityLabel.in_stock}</option>
                  <option value="low_stock">{availabilityLabel.low_stock}</option>
                  <option value="out_of_stock">{availabilityLabel.out_of_stock}</option>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-3 lg:justify-end">
              <div className="flex items-end gap-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="sort" className="text-ui-xs tracking-ui text-ink-600">
                    Ordenar por:
                  </Label>
                  <Select
                    id="sort"
                    name="sort"
                    value={sort}
                    onChange={(e) => {
                      const value = e.target.value as SortKey
                      replaceQuery((next) => {
                        if (value === "recommended") next.delete("sort")
                        else next.set("sort", value)
                      })
                    }}
                    variant="pill"
                    uiSize="sm"
                    className="w-64 max-w-full"
                  >
                    <option value="recommended">Recomendado</option>
                    <option value="name_asc">Nombre (A–Z)</option>
                    <option value="brand_asc">Marca (A–Z)</option>
                    <option value="availability">Disponibilidad</option>
                    <option value="price_asc">Precio (menor)</option>
                    <option value="price_desc">Precio (mayor)</option>
                  </Select>
                </div>
                <div className="flex items-end gap-2 pb-0">
                  <button
                    type="button"
                    onClick={() => {
                      replaceQuery((next) => {
                        next.delete("view")
                      })
                    }}
                    className={cn(
                      "inline-flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-inset transition duration-500 ease-luxe",
                      focusRing,
                      view === "grid"
                        ? "bg-ink-950 text-white ring-white/10"
                        : "bg-ink-50/70 text-ink-950 ring-black/8 hover:bg-white"
                    )}
                    aria-label="Vista en cuadrícula"
                  >
                    <span className="grid grid-cols-2 gap-1">
                      <span className="h-2 w-2 rounded-sm bg-current" />
                      <span className="h-2 w-2 rounded-sm bg-current" />
                      <span className="h-2 w-2 rounded-sm bg-current" />
                      <span className="h-2 w-2 rounded-sm bg-current" />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      replaceQuery((next) => {
                        next.set("view", "list")
                      })
                    }}
                    className={cn(
                      "inline-flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-inset transition duration-500 ease-luxe",
                      focusRing,
                      view === "list"
                        ? "bg-ink-950 text-white ring-white/10"
                        : "bg-ink-50/70 text-ink-950 ring-black/8 hover:bg-white"
                    )}
                    aria-label="Vista en lista"
                  >
                    <span className="grid gap-1">
                      <span className="h-1 w-5 rounded-sm bg-current" />
                      <span className="h-1 w-5 rounded-sm bg-current" />
                      <span className="h-1 w-5 rounded-sm bg-current" />
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {showCount ? <p className="text-lg font-semibold text-ink-950 sm:hidden">{countLabel}</p> : null}
                {hasActiveFilters ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-full bg-ink-50/70 px-5 py-2.5 text-sm text-ink-700 ring-1 ring-inset ring-black/8 transition duration-700 ease-luxe hover:bg-white"
                    onClick={clearFilters}
                  >
                    Limpiar filtros
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </Surface>
      ) : null}

      {ordered.length ? (
        view === "grid" && ordered.length === 1 ? (
          <div className="mt-10 flex justify-center">
            <LazyReveal delayMs={0} className="w-full max-w-catalog-filters sm:max-w-catalog-filters-sm">
              <PerfumeCard perfume={ordered[0]!} />
            </LazyReveal>
          </div>
        ) : view === "grid" && ordered.length === 2 ? (
          <div className="mt-10 mx-auto grid max-w-catalog-grid grid-cols-1 gap-6 sm:grid-cols-2">
            {ordered.map((p, idx) => (
              <LazyReveal key={p.id} delayMs={idx * 90} className="w-full">
                <PerfumeCard perfume={p} />
              </LazyReveal>
            ))}
          </div>
        ) : (
          <div className={cn("mt-8 grid gap-6", view === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>
            {ordered.map((p, idx) => (
              <LazyReveal key={p.id} delayMs={Math.min(idx, 12) * 55} className="w-full">
                <PerfumeCard perfume={p} />
              </LazyReveal>
            ))}
          </div>
        )
      ) : (
        <Surface radius="luxe-xl" className="relative mt-8 overflow-hidden p-8 sm:p-10">
          <div className="pointer-events-none absolute inset-0">
            <Image
              src="/images/MaloParfumsHome.jpg"
              alt=""
              fill
              className="object-cover opacity-[0.08] blur-2xl grayscale"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-catalog-empty-overlay-1" />
            <div className="absolute inset-0 bg-catalog-empty-overlay-2" />
          </div>

          <div className="relative grid gap-3">
            <p className="text-ui-xs font-medium tracking-kicker text-ink-500">COLECCIÓN</p>
            <p className="font-display text-2xl text-ink-950">
              {hasActiveFilters ? "No hay fragancias disponibles con esta selección." : "Estamos actualizando esta colección."}
            </p>
            <p className="max-w-2xl text-sm leading-relaxed text-ink-700">
              {hasActiveFilters
                ? "Prueba ajustar la búsqueda o limpiar los filtros para ver más opciones."
                : "Próximamente nuevas incorporaciones. Si buscas algo específico, pídelo por WhatsApp."}
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Button
                type="button"
                variant="ghost"
                className="rounded-full bg-white/60 px-5 py-2.5 text-sm ring-1 ring-inset ring-black/8 transition duration-700 ease-luxe hover:bg-white"
                onClick={clearFilters}
              >
                {hasActiveFilters ? "Limpiar filtros" : "Ver todas las colecciones"}
              </Button>
              <button
                type="button"
                onClick={() => setIsFilterOpen(true)}
                className="rounded-full bg-ink-950 px-5 py-2.5 text-sm font-medium tracking-wide text-white transition duration-700 ease-luxe hover:bg-ink-900"
              >
                Ajustar filtros
              </button>
            </div>
          </div>
        </Surface>
      )}
    </div>
  )
}
