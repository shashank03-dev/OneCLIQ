import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    const script = [
      { key: "Content-Type", value: "text/plain; charset=utf-8" },
      { key: "Cache-Control", value: "public, max-age=300" },
    ];
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/install", headers: script },
      { source: "/install.sh", headers: script },
      { source: "/install.ps1", headers: script },
    ];
  },
  /** One install URL: PowerShell (`irm …/install | iex`) gets the Windows script, everything else the shell script. */
  async rewrites() {
    return [
      { source: "/install", has: [{ type: "header", key: "user-agent", value: ".*PowerShell.*" }], destination: "/install.ps1" },
      { source: "/install", destination: "/install.sh" },
    ];
  },
};

export default nextConfig;
