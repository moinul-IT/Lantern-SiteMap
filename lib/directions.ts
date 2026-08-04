/** Only coordinates are needed, so this works for sites and the office alike. */
type Destination = { lat: number; lng: number };

/** iPadOS 13+ reports "MacIntel", so the Mac check covers it too. */
function prefersAppleMaps() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod|Macintosh/.test(ua) ||
    /Mac/.test(navigator.platform ?? "")
  );
}

export function directionsUrl(place: Destination) {
  const coords = `${place.lat},${place.lng}`;
  return prefersAppleMaps()
    ? `https://maps.apple.com/?daddr=${coords}`
    : `https://www.google.com/maps/dir/?api=1&destination=${coords}`;
}

export function openDirections(place: Destination) {
  window.open(directionsUrl(place), "_blank", "noopener,noreferrer");
}
