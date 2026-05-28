const nextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1", "0.0.0.0"],
  images: {
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowSVG: false
  }
}

export default nextConfig
