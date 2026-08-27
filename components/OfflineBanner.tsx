"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOffline } from "next/offline";

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getOnline() {
  return navigator.onLine;
}

/** Assume online while rendering on the server; the client corrects it. */
function getOnlineOnServer() {
  return true;
}

/**
 * Tells the user the network is gone, because on a map the symptom is
 * ambiguous: tiles for an area you have not visited simply stay blank, which
 * looks like a broken app rather than a missing connection.
 *
 * Two signals, because each covers the other's blind spot:
 *
 *   `useOffline` (enabled by `experimental.useOffline` in next.config.ts) also
 *   counts a *failed request* as offline, which catches wifi with no route out
 *   — where navigator.onLine still cheerfully reports true. It polls to confirm
 *   recovery rather than trusting the `online` event.
 *
 *   `navigator.onLine` catches the launch-while-offline case, which the hook
 *   cannot: it starts at false, and a page served entirely from the service
 *   worker fires no `offline` event and fails no request for it to notice.
 */
export default function OfflineBanner() {
  const detectedOffline = useOffline();
  const online = useSyncExternalStore(
    subscribeOnline,
    getOnline,
    getOnlineOnServer,
  );
  const isOffline = detectedOffline || !online;

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          key="offline"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.16 } }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="flex items-center gap-2.5 rounded-full border border-hairline bg-paper/95 px-4 py-2.5 shadow-float backdrop-blur-sm"
        >
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full bg-bronx"
          />
          <span className="text-[13px] text-ink-soft">
            <span className="text-ink">Offline</span> · sites and visited map
            areas still work
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
