/** Only coordinates are needed, so this works for sites and the office alike. */
type Destination = { lat: number; lng: number };

export type MapsProvider = "apple" | "google";

/** Chooser order. Apple first because it is the platform default on iPhones. */
export const MAPS_PROVIDERS: readonly MapsProvider[] = ["apple", "google"];

export const PROVIDER_LABELS: Record<MapsProvider, string> = {
  apple: "Apple Maps",
  google: "Google Maps",
};

/** iPadOS 13+ reports "MacIntel", so the Mac check covers it too. */
function prefersAppleMaps() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod|Macintosh/.test(ua) ||
    /Mac/.test(navigator.platform ?? "")
  );
}

/**
 * What to use before anyone has chosen. Guessing from the platform is right
 * far more often than not, and it means the button works on the first tap
 * without a settings trip.
 */
export function platformDefaultProvider(): MapsProvider {
  return prefersAppleMaps() ? "apple" : "google";
}

export function directionsUrl(place: Destination, provider: MapsProvider) {
  const coords = `${place.lat},${place.lng}`;
  return provider === "apple"
    ? `https://maps.apple.com/?daddr=${coords}`
    : `https://www.google.com/maps/dir/?api=1&destination=${coords}`;
}

export function openDirections(place: Destination, provider: MapsProvider) {
  window.open(directionsUrl(place, provider), "_blank", "noopener,noreferrer");
}

/*
 * The chosen provider, as a tiny observable store.
 *
 * A store rather than component state because the choice outlives any one
 * panel: the map's compact panel and the in-depth view can both be mounted, and
 * picking Google in one must not leave the other still saying Apple. Reads go
 * through useSyncExternalStore (see useMapsProvider), which also handles the
 * server snapshot — the platform default, since there is no navigator there.
 */

const STORAGE_KEY = "lantern-maps:directions-provider";

const listeners = new Set<() => void>();

/**
 * Carries the choice when localStorage is unavailable (private browsing), so it
 * still holds for the rest of the session even though it cannot be remembered.
 */
let sessionProvider: MapsProvider | null = null;

function isProvider(value: unknown): value is MapsProvider {
  return value === "apple" || value === "google";
}

/** localStorage throws in some private-browsing modes; a refusal is not fatal. */
function readStored(): MapsProvider | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isProvider(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function subscribeProvider(onChange: () => void) {
  listeners.add(onChange);
  // `storage` only fires in *other* tabs, which is exactly the cross-tab case.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Returns a primitive, so it is safe to call on every render — which
 * useSyncExternalStore does. Nothing is memoised: a stale cache would miss a
 * change made in another tab.
 */
export function getProvider(): MapsProvider {
  // Stored first, so a change made in another tab wins over this one's session
  // value — last write across tabs is the one that counts.
  return readStored() ?? sessionProvider ?? platformDefaultProvider();
}

export function getServerProvider(): MapsProvider {
  return platformDefaultProvider();
}

export function setProvider(provider: MapsProvider) {
  sessionProvider = provider;
  try {
    window.localStorage.setItem(STORAGE_KEY, provider);
  } catch {
    // Not remembered for next time, but sessionProvider keeps it for this one.
  }
  listeners.forEach((listener) => listener());
}
