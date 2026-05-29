"use client"

import { cn } from "@/lib/cn"
import { Button } from "@/components/ui/Button"
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
      <Button
        type="button"
        variant="gold"
        disabled={disabled}
        onClick={() => ref.current?.click()}
        className={cn(
          "h-11 w-full min-w-thumb select-none whitespace-nowrap shadow-sm transition duration-luxe-fast ease-luxe hover:shadow-cta-hover active:scale-[0.98] disabled:pointer-events-none sm:w-auto",
          className
        )}
      >
        {children}
      </Button>
    </>
  )
}
