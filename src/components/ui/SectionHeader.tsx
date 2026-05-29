import { cn } from "@/lib/cn"
import type { ReactNode } from "react"

export function SectionHeader({
  kicker,
  title,
  description,
  className,
  kickerClassName,
  titleClassName,
  descriptionClassName
}: {
  kicker: ReactNode
  title: ReactNode
  description?: ReactNode
  className?: string
  kickerClassName?: string
  titleClassName?: string
  descriptionClassName?: string
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <p className={cn("text-xs tracking-section text-ink-500", kickerClassName)}>{kicker}</p>
      <div className={cn("font-display text-3xl leading-display text-ink-950 sm:text-4xl", titleClassName)}>
        {title}
      </div>
      {description ? (
        <div className={cn("max-w-2xl text-sm leading-body text-ink-700", descriptionClassName)}>{description}</div>
      ) : null}
    </div>
  )
}

