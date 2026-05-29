"use client"

import { cn } from "@/lib/cn"

export function StarRatingPicker({
  value,
  hoverValue,
  onChange,
  onHoverChange,
  max = 5,
  className,
  buttonClassName = "inline-flex h-6 w-6 items-center justify-center text-xl leading-none transition",
  activeClassName = "text-antiqueGold",
  inactiveClassName = "text-ink-400 hover:text-antiqueGold",
  ariaLabel = "Calificación en estrellas"
}: {
  value: number | null
  hoverValue: number | null
  onChange: (next: number | null) => void
  onHoverChange: (next: number | null) => void
  max?: number
  className?: string
  buttonClassName?: string
  activeClassName?: string
  inactiveClassName?: string
  ariaLabel?: string
}) {
  const visibleValue = hoverValue ?? value

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="radiogroup"
      aria-label={ariaLabel}
      onMouseLeave={() => onHoverChange(null)}
    >
      {Array.from({ length: max }).map((_, i) => {
        const starValue = i + 1
        const active = Boolean(visibleValue && starValue <= visibleValue)
        return (
          <button
            key={starValue}
            type="button"
            role="radio"
            aria-checked={value === starValue}
            aria-label={`${starValue} estrellas`}
            onMouseEnter={() => onHoverChange(starValue)}
            onFocus={() => onHoverChange(starValue)}
            onBlur={() => onHoverChange(null)}
            onClick={() => onChange(value === starValue ? null : starValue)}
            className={cn(buttonClassName, active ? activeClassName : inactiveClassName)}
          >
            {active ? "★" : "☆"}
          </button>
        )
      })}
    </div>
  )
}
