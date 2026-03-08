import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma binaries can cause the Serverless Function size to exceed Vercel's 250MB uncompressed limit.
  // This tells Next.js to not bundle these large engines into every API route.
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('@prisma/client');
    }
    return config;
  },
};

export default nextConfig;
