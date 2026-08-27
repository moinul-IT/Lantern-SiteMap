import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import PwaChrome from "@/components/PwaChrome";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Netlify exposes the deploy URL as URL; falls back to localhost in dev.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.URL ??
  "http://localhost:3000";

const description =
  "Internal map of Lantern Community Services supportive-housing sites across the Bronx, Manhattan, Brooklyn and Queens — see which sites are near each other at a glance.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Lantern Maps",
    template: "%s · Lantern Maps",
  },
  description,
  applicationName: "Lantern Maps",
  // Internal staff tool: it should never turn up in search results.
  robots: { index: false, follow: false, nocache: true },
  openGraph: {
    type: "website",
    siteName: "Lantern Maps",
    title: "Lantern Maps",
    description,
    url: siteUrl,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lantern Maps",
    description,
  },
  formatDetection: { telephone: false, address: false, email: false },
  /**
   * Installed-app behaviour on iOS, which reads none of the web app manifest.
   * `title` is the home-screen label; "black-translucent" runs the map under
   * the status bar, which is what the safe-area insets already account for.
   * The <link rel="manifest"> itself is emitted by app/manifest.ts.
   */
  appleWebApp: {
    capable: true,
    title: "Lantern Maps",
    statusBarStyle: "black-translucent",
  },
};

/**
 * `viewportFit: "cover"` is what makes env(safe-area-inset-*) resolve to real
 * values on notched phones — without it every inset is 0. Zooming is left
 * enabled deliberately (blocking it is an accessibility failure).
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f2e9",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden overscroll-none">
        {children}
        <PwaChrome />
      </body>
    </html>
  );
}
