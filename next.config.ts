import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * A real Node server, bundled into `.next/standalone` with only the
   * dependencies it actually needs. That is what runs on App Service.
   *
   * The site is hosted rather than exported because content is edited live:
   * the server reads the current snapshot and renders it, so a visitor gets
   * today's org chart in the HTML instead of the build's and a correction a
   * moment later. It also means the content API and the sign-in check run
   * here, next to the data, rather than as a separate Functions app.
   */
  output: "standalone",

  images: {
    /*
     * Site photos are local files that ship with the build, so there is
     * nothing for an optimizer to fetch. Leaving this on also keeps `sharp`
     * out of the server image.
     */
    unoptimized: true,
  },

  experimental: {
    // Powers the `useOffline` hook in components/OfflineBanner.tsx.
    useOffline: true,
    /*
     * Lets /manage answer with a real 401 or 403 instead of a 200 page that
     * says "no". The status is what a monitor, a cache or a script sees, and
     * it is what the earlier Static Web Apps deployment returned.
     */
    authInterrupts: true,
  },

  async headers() {
    return [
      {
        /*
         * The worker must never be served from a cache, or a deploy can go
         * unnoticed for as long as the old copy stays fresh.
         */
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
      {
        // Content is editable, so nothing that carries it may be cached.
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
      {
        source: "/icons/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
