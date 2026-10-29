import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Static export, because Azure Static Web Apps serves the site from a folder
   * of files and runs the API as managed Functions beside it. Every route here
   * was already prerendered, so nothing is lost by saying so explicitly — and
   * it keeps the deploy to plain assets plus `api/`, with no Node server to
   * operate.
   *
   * Two consequences, both handled:
   *   - `headers()` is ignored under export, so the service-worker and icon
   *     headers moved to staticwebapp.config.json.
   *   - the default image loader needs a server, hence `unoptimized` below.
   */
  output: "export",

  images: {
    /*
     * Site photos are local static files that ship with the build (see
     * public/photos), so there is nothing for an optimizer to fetch and
     * nothing to gain from one. This also leaves them as ordinary files the
     * service worker can cache like any other asset.
     */
    unoptimized: true,
  },

  experimental: {
    // Powers the `useOffline` hook in components/OfflineBanner.tsx.
    useOffline: true,
  },
};

export default nextConfig;
