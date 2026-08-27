"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * `beforeinstallprompt` is Chromium-only and not in the DOM lib, so the parts
 * used here are typed locally rather than widening the global Event type.
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "lantern-maps:install-dismissed";

/*
 * Everything the prompt needs to know about the platform is read through
 * useSyncExternalStore rather than an effect. That keeps the server snapshot
 * (always `false`, so nothing renders until hydration) separate from the live
 * browser value, and avoids a render pass that exists only to apply what could
 * have been read directly.
 *
 * Each subscribe/getSnapshot pair is module-scoped because these must be stable
 * references across renders.
 */

function getFalse() {
  return false;
}

/** Nothing to subscribe to: the user agent does not change mid-session. */
function subscribeNever() {
  return () => {};
}

const STANDALONE_QUERIES = [
  "(display-mode: standalone)",
  "(display-mode: minimal-ui)",
];

function subscribeDisplayMode(onChange: () => void) {
  const queries = STANDALONE_QUERIES.map((query) => window.matchMedia(query));
  queries.forEach((query) => query.addEventListener("change", onChange));
  return () =>
    queries.forEach((query) => query.removeEventListener("change", onChange));
}

/** display-mode is the reliable "already installed" signal; navigator.standalone covers older iOS. */
function getStandalone() {
  return (
    STANDALONE_QUERIES.some((query) => window.matchMedia(query).matches) ||
    // Non-standard and iOS-only, hence the cast rather than a lib change.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function getIosEligible() {
  const ua = navigator.userAgent;
  // iPadOS reports as a Mac, so a touch-capable "Mac" counts as iOS here.
  const isIosDevice =
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  // Every iOS browser is WebKit, but only Safari can add to the home screen.
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIosDevice && isSafari;
}

/** `storage` only fires in *other* tabs, which is exactly the cross-tab case. */
function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/** localStorage throws in some private-browsing modes; a refusal is not an error. */
function getDismissed() {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberDismissed() {
  try {
    window.localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Nothing to do — the prompt reappears next session, which is acceptable.
  }
}

/**
 * Offers to install Lantern Maps to the home screen.
 *
 * Two paths, because there is no single cross-browser one:
 *
 *   Chromium fires `beforeinstallprompt`, which can be deferred and replayed
 *   from a real button, so the install happens in one tap.
 *
 *   iOS Safari fires nothing and exposes no install API, so the only honest
 *   thing to offer is the Share → Add to Home Screen instruction.
 *
 * Anywhere else (desktop Firefox, say) neither applies and nothing is shown
 * rather than pointing at a menu item that may not exist.
 */
export default function InstallPrompt() {
  const standalone = useSyncExternalStore(
    subscribeDisplayMode,
    getStandalone,
    getFalse,
  );
  const iosEligible = useSyncExternalStore(
    subscribeNever,
    getIosEligible,
    getFalse,
  );
  const persistedDismissal = useSyncExternalStore(
    subscribeStorage,
    getDismissed,
    getFalse,
  );

  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  // Writing localStorage does not fire `storage` in the same tab, so the
  // dismissal is also held here to hide the pill immediately.
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      // Keep the browser's own mini-infobar from firing; the pill below
      // replaces it and can be dismissed for good.
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    }

    // display-mode does not always flip in the tab that installed, so this is
    // tracked separately rather than relying on the media query alone.
    function onInstalled() {
      setInstalled(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // The event is single-use either way, so drop it. A dismissal here is only
    // remembered for the session — the user may just not want it right now.
    setDeferred(null);
    if (outcome === "dismissed") setDismissed(true);
  }, [deferred]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setShowIosHint(false);
    rememberDismissed();
  }, []);

  const visible =
    !standalone &&
    !installed &&
    !dismissed &&
    !persistedDismissal &&
    (deferred !== null || iosEligible);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="install"
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.16 } }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="w-full max-w-[22rem] rounded-2xl border border-hairline bg-paper/95 p-3.5 shadow-float backdrop-blur-sm"
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-ink"
            >
              <svg width="20" height="20" viewBox="0 0 32 32">
                <path
                  d="M12.6 7.4a3.4 3.4 0 0 1 6.8 0"
                  fill="none"
                  stroke="#F7F2E9"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <rect
                  x="9.8"
                  y="7.6"
                  width="12.4"
                  height="2.6"
                  rx="1.1"
                  fill="#F7F2E9"
                />
                <path
                  d="M11.4 10.9h9.2l1.5 10.2a1 1 0 0 1-1 1.1H10.9a1 1 0 0 1-1-1.1z"
                  fill="#F7F2E9"
                />
                <circle cx="16" cy="16" r="2.9" fill="#C2632E" />
                <rect
                  x="9.4"
                  y="22.6"
                  width="13.2"
                  height="2.6"
                  rx="1.1"
                  fill="#F7F2E9"
                />
              </svg>
            </span>

            <div className="min-w-0 flex-1">
              <p className="eyebrow">Install</p>
              <p className="mt-1 text-[13px] leading-snug text-ink-soft">
                Add <span className="text-ink">Lantern Maps</span> to your home
                screen for full-screen access and offline use.
              </p>

              <div className="mt-2.5 flex items-center gap-2">
                {deferred ? (
                  <button
                    type="button"
                    onClick={install}
                    className="h-9 rounded-full bg-ink px-4 text-[13px] text-cream transition-colors duration-200 hover:bg-ink/90"
                  >
                    Install
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-expanded={showIosHint}
                    onClick={() => setShowIosHint((open) => !open)}
                    className="h-9 rounded-full bg-ink px-4 text-[13px] text-cream transition-colors duration-200 hover:bg-ink/90"
                  >
                    How
                  </button>
                )}
                <button
                  type="button"
                  onClick={dismiss}
                  className="h-9 rounded-full border border-hairline px-3.5 text-[13px] text-ink-soft transition-colors duration-200 hover:text-ink"
                >
                  Not now
                </button>
              </div>

              <AnimatePresence initial={false}>
                {showIosHint && (
                  <motion.p
                    key="ios-hint"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
                    className="overflow-hidden text-[13px] leading-snug text-ink-soft"
                  >
                    <span className="mt-2.5 block border-t border-hairline pt-2.5">
                      Tap <span className="text-ink">Share</span> in the Safari
                      toolbar, then{" "}
                      <span className="text-ink">Add to Home Screen</span>.
                    </span>
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
