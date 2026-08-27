"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/** Paths the worker is willing to cache; anything else is not worth sending. */
const WARMABLE = ["/_next/static/", "/icons/", "/photos/"];

/**
 * Hand the worker the assets this page loaded before the worker existed.
 *
 * On a first-ever visit the worker installs *during* the load, so the hashed
 * chunks, CSS and fonts were all fetched before it could intercept them. Left
 * alone, the next offline launch would get the cached "/" document and then
 * fail every script it asks for. Performance entries are used rather than a
 * hardcoded list because they include the lazily-imported map and detail
 * chunks, which no build-time manifest would capture.
 */
function warmServiceWorkerCache() {
  const worker = navigator.serviceWorker.controller;
  if (!worker) return;

  const urls = performance
    .getEntriesByType("resource")
    .map((entry) => entry.name)
    .filter((url) => {
      try {
        const { origin, pathname } = new URL(url);
        return (
          origin === window.location.origin &&
          WARMABLE.some((prefix) => pathname.startsWith(prefix))
        );
      } catch {
        return false;
      }
    });

  if (urls.length) worker.postMessage({ type: "WARM_CACHE", urls });
}

/**
 * Registers the service worker and, when a new one is waiting, offers a reload.
 *
 * Nothing activates silently. A service worker that takes over mid-session
 * swaps the hashed JS chunks the running page is still asking for, so the new
 * version is only applied when the user asks for it.
 */
export default function ServiceWorkerRegistrar() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  // A `controllerchange` also fires the first time a worker claims this page,
  // which must not reload it — only a reload we asked for should.
  const reloading = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Dev only ever serves unhashed chunk URLs, so the cache-first rule for
    // /_next/static would pin stale code across an edit. The worker is a
    // production concern; `next dev` stays uncached.
    if (process.env.NODE_ENV !== "production") return;

    let registration: ServiceWorkerRegistration | undefined;

    /** A worker is only an *update* if one was already controlling the page. */
    function trackInstalling(worker: ServiceWorker) {
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          setWaiting(worker);
        }
      });
    }

    navigator.serviceWorker
      // updateViaCache: "none" keeps the browser's HTTP cache out of the
      // update check, so a new sw.js is always noticed.
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        registration = reg;
        if (reg.waiting && navigator.serviceWorker.controller) {
          setWaiting(reg.waiting);
        }
        if (reg.installing) trackInstalling(reg.installing);
        reg.addEventListener("updatefound", () => {
          if (reg.installing) trackInstalling(reg.installing);
        });
      })
      .catch((error) => {
        // A failed registration costs offline support, not the app.
        console.error("Service worker registration failed:", error);
      });

    // Deliberately late: long enough for the worker to have claimed this page
    // and for the lazily-imported map chunk to have loaded, so the warm-up sees
    // the full asset list. Everything it reports is already cached on a repeat
    // visit, where this costs one cache lookup per entry and no network.
    const warmTimer = window.setTimeout(warmServiceWorkerCache, 4000);

    function onControllerChange() {
      if (!reloading.current) return;
      window.location.reload();
    }
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    return () => {
      window.clearTimeout(warmTimer);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
      void registration;
    };
  }, []);

  const applyUpdate = useCallback(() => {
    if (!waiting) return;
    reloading.current = true;
    setWaiting(null);
    waiting.postMessage("SKIP_WAITING");
  }, [waiting]);

  return (
    <AnimatePresence>
      {waiting && (
        <motion.div
          key="update"
          role="status"
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.16 } }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="flex items-center gap-3 rounded-full border border-hairline bg-paper/95 py-2 pr-2 pl-4 shadow-float backdrop-blur-sm"
        >
          <span className="text-[13px] text-ink-soft">
            A new version is ready
          </span>
          <button
            type="button"
            onClick={applyUpdate}
            className="h-9 shrink-0 rounded-full bg-ink px-4 text-[13px] text-cream transition-colors duration-200 hover:bg-ink/90"
          >
            Reload
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
