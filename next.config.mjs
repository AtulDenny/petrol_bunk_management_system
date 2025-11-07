import path from "path";
// Use process.cwd() to robustly point to the project root in hosted builds
const PROJECT_ROOT = process.cwd();

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  webpack: (config, { dev, isServer }) => {
    // Disable cache in development
    if (dev) {
      config.cache = false;
    }
    // Resolve "@" alias to project root so imports like "@/lib/utils" work in all environments
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": PROJECT_ROOT,
    };
    return config;
  },
}

export default nextConfig
