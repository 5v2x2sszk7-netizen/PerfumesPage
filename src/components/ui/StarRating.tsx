import { cn } from "@/lib/cn"

export function StarRating({
  value,
  max = 5,
  className,
  starClassName,
  ariaLabel
}: {
  value: number
  max?: number
  className?: string
  starClassName?: string
  ariaLabel?: string
}) {
  const clamped = Math.max(0, Math.min(max, Math.round(value)))
  const label = ariaLabel ?? `${clamped} de ${max}`

  return (
    <div className={cn("flex items-center gap-1", className)} role="img" aria-label={label}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={starClassName}>
          {i < clamped ? "★" : "☆"}
        </span>
      ))}
    </div>
  )
}
