import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const nextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1", "0.0.0.0"],
  turbopack: {
    root: __dirname
  },
  images: {
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowSVG: false
  }
}

export default nextConfig
