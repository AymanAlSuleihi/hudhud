import type { NextConfig } from "next"

const backendOrigin = (
  process.env.HUDHUD_PROXY_TARGET ??
  process.env.HUDHUD_INTERNAL_API_ORIGIN ??
  process.env.NEXT_PUBLIC_BACKEND_ORIGIN ??
  "http://localhost:8081"
).replace(/\/$/, "")

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: {
    // The legacy frontend still carries substantial lint debt.
    // Keep build validation focused on compilation and type-checking during migration.
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${backendOrigin}/api/:path*`,
        },
        {
          source: "/public/:path*",
          destination: `${backendOrigin}/public/:path*`,
        },
      ],
    }
  },
}

export default nextConfig