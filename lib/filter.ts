import { isOffice, type Place, type Site } from "./sites";

export type BoroughFilter =
  "All" | "Bronx" | "Manhattan" | "Brooklyn" | "Queens";

export function matchesQuery(place: Place, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [place.name, place.address, place.city, place.zip];
  if (isOffice(place)) {
    // So "admin", "office" and the floor are all searchable.
    haystack.push(place.label, place.floor, "office");
  } else {
    haystack.push(place.borough);
  }

  return haystack.some((field) => field.toLowerCase().includes(q));
}

export function filterSites(
  sites: Site[],
  query: string,
  borough: BoroughFilter,
) {
  return sites.filter(
    (site) =>
      (borough === "All" || site.borough === borough) &&
      matchesQuery(site, query),
  );
}
