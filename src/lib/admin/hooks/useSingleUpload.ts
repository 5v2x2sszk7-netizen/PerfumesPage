import { useCallback, useEffect, useState } from "react"
import type { Dispatch, SetStateAction } from "react"

type UploadState = {
  uploading: boolean
  uploadedPath: string | null
  selectedFileName: string | null
  localPreviewUrl: string | null
}

export function useSingleUpload({
  endpoint,
  setBusy,
  setError,
  onUploaded
}: {
  endpoint: string
  setBusy: Dispatch<SetStateAction<boolean>>
  setError: Dispatch<SetStateAction<string | null>>
  onUploaded: (path: string) => void
}) {
  const [state, setState] = useState<UploadState>({
    uploading: false,
    uploadedPath: null,
    selectedFileName: null,
    localPreviewUrl: null
  })

  useEffect(() => {
    return () => {
      if (state.localPreviewUrl) URL.revokeObjectURL(state.localPreviewUrl)
    }
  }, [state.localPreviewUrl])

  const resetUpload = useCallback(() => {
    setState((prev) => {
      if (prev.localPreviewUrl) URL.revokeObjectURL(prev.localPreviewUrl)
      return { uploading: false, uploadedPath: null, selectedFileName: null, localPreviewUrl: null }
    })
  }, [])

  const onUpload = useCallback(
    async (file: File) => {
      setState((prev) => {
        if (prev.localPreviewUrl) URL.revokeObjectURL(prev.localPreviewUrl)
        return {
          ...prev,
          selectedFileName: file.name || null,
          localPreviewUrl: URL.createObjectURL(file),
          uploading: true
        }
      })
      setBusy(true)
      setError(null)
      try {
        const form = new FormData()
        form.append("file", file)
        const res = await fetch(endpoint, { method: "POST", body: form })
        if (!res.ok) {
          const json = await res.json().catch(() => null)
          throw new Error(json?.error || "Upload failed")
        }
        const json = (await res.json()) as { path: string }
        setState((prev) => ({ ...prev, uploadedPath: json.path }))
        onUploaded(json.path)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error")
      } finally {
        setBusy(false)
        setState((prev) => ({ ...prev, uploading: false }))
      }
    },
    [endpoint, onUploaded, setBusy, setError]
  )

  return { ...state, onUpload, resetUpload }
}
