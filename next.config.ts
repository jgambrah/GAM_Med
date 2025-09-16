
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    allowedDevOrigins: [
      "https://6000-firebase-studio-1754053472741.cluster-ikslh4rdsnbqsvu5nw3v4dqjj2.cloudworkstations.dev",
    ],
  },
}

export default nextConfig
