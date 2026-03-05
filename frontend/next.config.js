/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  // Excluye rutas de API del service worker
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
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  webpack(config) {
    // Dependencias opcionales de node que no existen en el entorno browser/Next.js
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

module.exports = withPWA(nextConfig);
