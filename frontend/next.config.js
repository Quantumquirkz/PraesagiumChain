/** @type {import('next').NextConfig} */
const path = require("path");
const { loadEnvConfig } = require("@next/env");

// Single .env at repo root (backend + frontend)
loadEnvConfig(path.join(__dirname, ".."));

const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: process.env.NODE_ENV !== "development",
  skipWaiting: true,
  buildExcludes: [/middleware-manifest\.json$/],
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
    return [
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
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
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
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
    turbo: {
      resolveAlias: {
        "@react-native-async-storage/async-storage": "./empty-module.js",
        "pino-pretty": "./empty-module.js",
        fs: "./empty-module.js",
        net: "./empty-module.js",
        tls: "./empty-module.js",
      },
    },
  },
  webpack(config, { dev, isServer }) {
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
      config.watchOptions.aggregateTimeout = 1200;
    }
    return config;
  },
};

// Solo aplicar PWA en producción para evitar errores de webpack en desarrollo
module.exports =
  process.env.NODE_ENV === "production" ? withPWA(nextConfig) : nextConfig;
