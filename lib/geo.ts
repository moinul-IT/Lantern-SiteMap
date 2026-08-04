const EARTH_RADIUS_MI = 3958.7613;

/** Anything with coordinates — a housing site or the admin office. */
export type Located = { id: string; lat: number; lng: number };

export function haversineMiles(a: Located, b: Located) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(h));
}

/** Under ~0.2 mi reads as feet, rounded to the nearest 50. */
export function formatDistance(miles: number) {
  if (miles < 0.2) {
    const feet = Math.round((miles * 5280) / 50) * 50;
    return `${Math.max(feet, 50)} ft`;
  }
  return `${miles.toFixed(1)} mi`;
}

export type Neighbour<T extends Located = Located> = { site: T; miles: number };

export function nearestSites<T extends Located>(
  target: Located,
  pool: T[],
  limit: number,
): Neighbour<T>[] {
  return pool
    .filter((s) => s.id !== target.id)
    .map((site) => ({ site, miles: haversineMiles(target, site) }))
    .sort((a, b) => a.miles - b.miles)
    .slice(0, limit);
}

export function closestSite<T extends Located>(
  target: Located,
  pool: T[],
): Neighbour<T> | null {
  return nearestSites(target, pool, 1)[0] ?? null;
}
