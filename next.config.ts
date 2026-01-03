import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable Turbopack (Next.js 16 default)
  turbopack: {},
  // Exclude extension from output file tracing
  outputFileTracingExcludes: {
    '*': ['./extension/**/*'],
  },
};

export default nextConfig;
