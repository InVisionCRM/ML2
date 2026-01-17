import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname, // ensure correct workspace root
  },
  transpilePackages: ['@rainbow-me/rainbowkit', 'wagmi', 'viem'],
  typescript: {
    // Bypass TypeScript errors during build
    ignoreBuildErrors: true,
  },
  // ESLint configuration moved to eslint.config.mjs
};

export default nextConfig;

