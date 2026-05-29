import { processUpload } from "@/lib/uploads/processUpload"

export const runtime = "nodejs"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function POST(req: Request) {
  return processUpload(req, {
    maxSizeBytes: 2 * 1024 * 1024,
    baseNameFallback: "review",
    uploadSubdir: "reviews",
    maxDim: 1200,
    quality: 80,
    rateLimit: { keyPrefix: "reviews-upload", windowMs: 10 * 60 * 1000, max: 10 }
  })
}
