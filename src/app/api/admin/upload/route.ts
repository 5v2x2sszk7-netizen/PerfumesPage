import { processUpload } from "@/lib/uploads/processUpload"

export const runtime = "nodejs"

export async function POST(req: Request) {
  return processUpload(req, {
    maxSizeBytes: 6 * 1024 * 1024,
    baseNameFallback: "image",
    maxDim: 1400,
    quality: 82
  })
}
