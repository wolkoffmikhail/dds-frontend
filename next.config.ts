import type { NextConfig } from "next"

const supabaseInternal = (process.env.SUPABASE_INTERNAL_URL || "http://192.168.0.22:8001").replace(/\/$/, "")

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/supabase/:path*",
        destination: `${supabaseInternal}/:path*`,
      },
    ]
  },
}

export default nextConfig
