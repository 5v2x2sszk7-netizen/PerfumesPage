"use client"

import { cn } from "@/lib/cn"
import type { ReactNode, RefObject } from "react"
import { useRef } from "react"

type Props = {
  children: ReactNode
  onSelect: (files: FileList) => void
  accept?: string
  multiple?: boolean
  disabled?: boolean
  className?: string
  inputRef?: RefObject<HTMLInputElement | null>
}

export function UploadButton({ children, onSelect, accept, multiple, disabled, className, inputRef }: Props) {
  const internalRef = useRef<HTMLInputElement | null>(null)
  const ref = inputRef ?? internalRef

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const files = e.currentTarget.files
          if (files && files.length) onSelect(files)
          e.currentTarget.value = ""
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => ref.current?.click()}
        className={cn(
          "inline-flex h-11 w-full min-w-thumb select-none items-center justify-center gap-2 whitespace-nowrap rounded-full bg-antiqueGold px-5 text-sm font-medium tracking-wide text-white shadow-sm ring-1 ring-black/8 transition hover:bg-antiqueGoldDark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-antiqueGold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.98] hover:shadow-cta-hover disabled:pointer-events-none disabled:opacity-50 sm:w-auto",
          className
        )}
      >
        {children}
      </button>
    </>
  )
}
