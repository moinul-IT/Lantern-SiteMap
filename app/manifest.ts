import type { MetadataRoute } from "next";

/**
 * Web app manifest. Next serves this at /manifest.webmanifest and injects the
 * <link rel="manifest"> automatically, so nothing in layout.tsx references it.
 *
 * Installed name is "Lantern Maps". `short_name` is what a launcher shows under
 * the icon, where anything past ~12 characters is truncated — "Lantern Maps" is
 * exactly 12, so it survives whole.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    // A stable id keeps this the same installed app across start_url changes.
    id: "/",
    name: "Lantern Maps",
    short_name: "Lantern Maps",
    description:
      "Internal map of Lantern Community Services supportive-housing sites across the Bronx, Manhattan, Brooklyn and Queens.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // minimal-ui keeps a reload affordance on browsers that honour it; browser
    // is the last resort so an install never fails outright.
    display_override: ["standalone", "minimal-ui", "browser"],
    // The explorer is built for portrait and landscape alike, so don't lock it.
    orientation: "any",
    // Matches --color-cream, so the splash screen is the same paper the map
    // sits on rather than a white flash.
    background_color: "#f7f2e9",
    theme_color: "#f7f2e9",
    lang: "en-US",
    dir: "ltr",
    categories: ["business", "productivity", "utilities"],
    icons: [
      // SVG first: browsers that take it get one crisp icon at every size.
      {
        src: "/icons/icon.svg",
        type: "image/svg+xml",
        sizes: "any",
        purpose: "any",
      },
      { src: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { src: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
      // Maskable icons are a separate entry, never a `purpose` added to the
      // ones above: a launcher that crops to a circle would clip the mark.
      {
        src: "/icons/maskable-192.png",
        type: "image/png",
        sizes: "192x192",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        type: "image/png",
        sizes: "512x512",
        purpose: "maskable",
      },
    ],
  };
}
