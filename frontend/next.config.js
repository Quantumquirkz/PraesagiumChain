/** @type {import('next').NextConfig} */
const path = require("path");
const { loadEnvConfig } = require("@next/env");

// Single .env at repo root (backend + frontend)
loadEnvConfig(path.join(__dirname, ".."));

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  workboxOptions: {
    exclude: [/middleware-manifest\.json$/],
  },
});

const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/health",
        destination: `${backendUrl}/health`,
      },
    ];
  },
  async headers() {
    const base = [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=3600",
          },
        ],
      },
    ];
    // Long-lived cache for hashed assets — production only. In development, caching
    // /_next/static causes stale chunk URLs and ChunkLoadError / timeouts after HMR.
    if (process.env.NODE_ENV === "production") {
      base.push({
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      });
    }
    return base;
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  turbopack: {
    resolveAlias: {
      "@react-native-async-storage/async-storage": "./empty-module.js",
      "pino-pretty": "./empty-module.js",
      fs: "./empty-module.js",
      net: "./empty-module.js",
      tls: "./empty-module.js",
    },
  },
  webpack(config, { dev, isServer }) {
    // Dependencias opcionales de node que no existen en el entorno browser/Next.js
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
      fs: false,
      net: false,
      tls: false,
    };
    if (dev && !isServer) {
      config.infrastructureLogging = { level: "error" };
      config.watchOptions = config.watchOptions || {};
      config.watchOptions.aggregateTimeout = 800;
    }
    return config;
  },
};

module.exports = withPWA(nextConfig);
