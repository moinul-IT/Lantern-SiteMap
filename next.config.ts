import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Powers the `useOffline` hook in components/OfflineBanner.tsx, and keeps a
    // navigation or Server Action issued with no network pending until the
    // connection returns instead of throwing.
    useOffline: true,
  },
  async headers() {
    return [
      {
        // The worker must never be served from the HTTP cache, or a deploy can
        // go unnoticed for as long as the old copy stays fresh. Netlify serves
        // /sw.js straight from its CDN, so netlify.toml repeats this — these
        // headers only apply to `next start`.
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          // The worker loads nothing but same-origin code.
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
