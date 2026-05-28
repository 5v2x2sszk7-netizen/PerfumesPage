import type { Draft, ReviewDraft } from "@/lib/admin/types"
import { useCallback, useEffect, useState } from "react"
import type { Dispatch, SetStateAction } from "react"

export function useUploads({
  setBusy,
  setError,
  setDraft,
  setReviewDraft
}: {
  setBusy: Dispatch<SetStateAction<boolean>>
  setError: Dispatch<SetStateAction<string | null>>
  setDraft: Dispatch<SetStateAction<Draft>>
  setReviewDraft: Dispatch<SetStateAction<ReviewDraft>>
}) {
  const [uploading, setUploading] = useState(false)
  const [reviewUploading, setReviewUploading] = useState(false)
  const [uploadedPath, setUploadedPath] = useState<string | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)
  const [reviewUploadedPath, setReviewUploadedPath] = useState<string | null>(null)
  const [reviewSelectedFileName, setReviewSelectedFileName] = useState<string | null>(null)
  const [reviewLocalPreviewUrl, setReviewLocalPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
    }
  }, [localPreviewUrl])

  useEffect(() => {
    return () => {
      if (reviewLocalPreviewUrl) URL.revokeObjectURL(reviewLocalPreviewUrl)
    }
  }, [reviewLocalPreviewUrl])

  const resetProductUpload = useCallback(() => {
    setUploadedPath(null)
    setSelectedFileName(null)
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
    setLocalPreviewUrl(null)
  }, [localPreviewUrl])

  const resetReviewUpload = useCallback(() => {
    setReviewUploadedPath(null)
    setReviewSelectedFileName(null)
    if (reviewLocalPreviewUrl) URL.revokeObjectURL(reviewLocalPreviewUrl)
    setReviewLocalPreviewUrl(null)
  }, [reviewLocalPreviewUrl])

  const onUpload = useCallback(
    async (file: File) => {
      setSelectedFileName(file.name || null)
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
      setLocalPreviewUrl(URL.createObjectURL(file))
      setBusy(true)
      setUploading(true)
      setError(null)
      try {
        const form = new FormData()
        form.append("file", file)
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: form
        })
        if (!res.ok) {
          const json = await res.json().catch(() => null)
          throw new Error(json?.error || "Upload failed")
        }
        const json = (await res.json()) as { path: string }
        setUploadedPath(json.path)
        setDraft((d) => ({ ...d, imageSrc: json.path }))
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error")
      } finally {
        setBusy(false)
        setUploading(false)
      }
    },
    [localPreviewUrl, setBusy, setDraft, setError]
  )

  const onUploadReview = useCallback(
    async (file: File) => {
      setReviewSelectedFileName(file.name || null)
      if (reviewLocalPreviewUrl) URL.revokeObjectURL(reviewLocalPreviewUrl)
      setReviewLocalPreviewUrl(URL.createObjectURL(file))
      setBusy(true)
      setReviewUploading(true)
      setError(null)
      try {
        const form = new FormData()
        form.append("file", file)
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: form
        })
        if (!res.ok) {
          const json = await res.json().catch(() => null)
          throw new Error(json?.error || "Upload failed")
        }
        const json = (await res.json()) as { path: string }
        setReviewUploadedPath(json.path)
        setReviewDraft((d) => ({ ...d, imageSrc: json.path }))
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error")
      } finally {
        setBusy(false)
        setReviewUploading(false)
      }
    },
    [reviewLocalPreviewUrl, setBusy, setReviewDraft, setError]
  )

  return {
    uploading,
    uploadedPath,
    selectedFileName,
    localPreviewUrl,
    reviewUploading,
    reviewUploadedPath,
    reviewSelectedFileName,
    reviewLocalPreviewUrl,
    onUpload,
    onUploadReview,
    resetProductUpload,
    resetReviewUpload
  }
}
