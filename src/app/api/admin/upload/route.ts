import { requireAdmin } from "@/lib/adminAuth"
import { processUpload } from "@/lib/uploads/processUpload"

export async function POST(req: Request) {
  const unauthorized = requireAdmin(req)
  if (unauthorized) return unauthorized

  return processUpload(req, {
    maxSizeBytes: 6 * 1024 * 1024,
    baseNameFallback: "image",
    maxDim: 1400,
    quality: 82
  })
}
