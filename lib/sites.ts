export type Borough = "Bronx" | "Manhattan" | "Brooklyn" | "Queens";

/**
 * Shelters are deliberately outside the cluster model — they carry
 * `cluster: null` and are grouped on their own in cluster views.
 */
export type SiteType = "Supportive Housing" | "Shelter";

export type ClusterId = 1 | 2 | 3 | 4;

export type Site = {
  id: string;
  name: string;
  borough: Borough;
  address: string;
  city: string;
  zip: string;
  lat: number;
  lng: number;
  type: SiteType;
  /** Cluster assignment; null for shelters, which aren't part of the model. */
  cluster: ClusterId | null;
  /**
   * Contract/program lines operating at this building, e.g. Huntersmoon runs
   * both DOHMH and HASA. Every program at a building shares its cluster.
   */
  programs?: string[];
  /**
   * Path to a LOCAL static image, e.g. "/photos/amber-hall.jpg" for a file in
   * `public/photos/`. Never a remote URL — nothing in this app calls an external
   * image service. `null` renders the branded placeholder instead.
   */
  photo: string | null;
};

export const BOROUGHS: Borough[] = ["Bronx", "Manhattan", "Brooklyn", "Queens"];

export const BOROUGH_COLORS: Record<
  Borough,
  { base: string; soft: string; ring: string }
> = {
  Bronx: { base: "#C2632E", soft: "#F4E2D5", ring: "#C2632E33" },
  Manhattan: { base: "#2F7D5F", soft: "#DCEBE1", ring: "#2F7D5F33" },
  Brooklyn: { base: "#6B5BA8", soft: "#E4E0F1", ring: "#6B5BA833" },
  Queens: { base: "#2E6E9E", soft: "#D8E6F0", ring: "#2E6E9E33" },
};

export const CLUSTERS: ClusterId[] = [1, 2, 3, 4];

/**
 * One shared colour per cluster, keyed to the blue / orange / yellow / green of
 * the source sheet but pulled toward this app's warm palette so they stay
 * legible on cream (raw highlighter yellow is unreadable here).
 */
export const CLUSTER_COLORS: Record<ClusterId, { base: string; soft: string }> =
  {
    1: { base: "#4A7FB5", soft: "#DEE9F4" },
    2: { base: "#D98324", soft: "#FAE6CE" },
    3: { base: "#B08900", soft: "#F5EBC4" },
    4: { base: "#5B9E5B", soft: "#DEEDDE" },
  };

/** Shelters sit outside the cluster model, so they read as neutral. */
export const SHELTER_COLORS = { base: "#8A7F70", soft: "#EAE3D8" };

export function clusterLabel(cluster: ClusterId) {
  return `Cluster ${cluster}`;
}

// Coordinates geocoded once via Nominatim against the full street address, then
// frozen here. Nothing geocodes at runtime.
export const SITES: Site[] = [
  // ── Bronx (8) ────────────────────────────────────────────────────────────
  {
    id: "amber-hall",
    name: "Amber Hall",
    borough: "Bronx",
    address: "1385 Fulton Avenue",
    city: "Bronx, NY",
    zip: "10456",
    lat: 40.834354,
    lng: -73.90226,
    photo: null,
    type: "Supportive Housing",
    cluster: 3,
  },
  {
    id: "cedar-hall",
    name: "Cedar Hall",
    borough: "Bronx",
    address: "745 Fox Street",
    city: "Bronx, NY",
    zip: "10456",
    lat: 40.81538,
    lng: -73.898759,
    photo: null,
    type: "Supportive Housing",
    cluster: 3,
  },
  {
    id: "hudson-bay",
    name: "Hudson Bay",
    borough: "Bronx",
    address: "1682 Stillwell Avenue",
    city: "Bronx, NY",
    zip: "10461",
    lat: 40.855837,
    lng: -73.838736,
    photo: null,
    type: "Shelter",
    cluster: null,
  },
  {
    id: "jasper-hall",
    name: "Jasper Hall",
    borough: "Bronx",
    address: "863 Melrose Avenue",
    city: "Bronx, NY",
    zip: "10451",
    lat: 40.823902,
    lng: -73.91434,
    photo: null,
    type: "Supportive Housing",
    cluster: 3,
    programs: ["Families", "Young Adults"],
  },
  {
    id: "leeward-hall",
    name: "Leeward Hall",
    borough: "Bronx",
    address: "194 Brown Place",
    city: "Bronx, NY",
    zip: "10454",
    lat: 40.806792,
    lng: -73.920645,
    photo: null,
    type: "Supportive Housing",
    cluster: 3,
  },
  {
    id: "lindenguild-hall",
    name: "Lindenguild Hall",
    borough: "Bronx",
    address: "3859 Third Avenue",
    city: "Bronx, NY",
    zip: "10457",
    lat: 40.838556,
    lng: -73.90104,
    photo: null,
    type: "Supportive Housing",
    cluster: 4,
  },
  {
    id: "silverleaf-hall",
    name: "Silverleaf Hall",
    borough: "Bronx",
    address: "480 E 176th Street",
    city: "Bronx, NY",
    zip: "10457",
    lat: 40.845825,
    lng: -73.89855,
    photo: null,
    type: "Supportive Housing",
    cluster: 4,
  },
  {
    id: "vicinitas-hall",
    name: "Vicinitas Hall",
    borough: "Bronx",
    address: "507 E 176th Street",
    city: "Bronx, NY",
    zip: "10457",
    lat: 40.845535,
    lng: -73.897023,
    photo: null,
    type: "Supportive Housing",
    cluster: 4,
  },

  // ── Manhattan (7) ────────────────────────────────────────────────────────
  {
    id: "audubon-hall",
    name: "Audubon Hall",
    borough: "Manhattan",
    address: "440 West 163rd Street",
    city: "New York, NY",
    zip: "10032",
    lat: 40.835911,
    lng: -73.938576,
    photo: null,
    type: "Supportive Housing",
    cluster: 4,
  },
  {
    id: "huntersmoon-hall",
    name: "Huntersmoon Hall",
    borough: "Manhattan",
    address: "2612 Broadway",
    city: "New York, NY",
    zip: "10025",
    lat: 40.796168,
    lng: -73.970222,
    photo: null,
    type: "Supportive Housing",
    cluster: 1,
    programs: ["DOHMH", "HASA"],
  },
  {
    id: "prospero-hall",
    name: "Prospero Hall",
    borough: "Manhattan",
    address: "100 E 118th Street",
    city: "New York, NY",
    zip: "10035",
    lat: 40.800481,
    lng: -73.942196,
    photo: null,
    type: "Supportive Housing",
    cluster: 1,
  },
  {
    id: "rustin-house",
    name: "Rustin House",
    borough: "Manhattan",
    address: "319 W 94th Street",
    city: "New York, NY",
    zip: "10025",
    lat: 40.794646,
    lng: -73.975245,
    photo: null,
    type: "Supportive Housing",
    cluster: 1,
    programs: ["NY/NY", "HSN"],
  },
  {
    id: "savanna-hall",
    name: "Savanna Hall",
    borough: "Manhattan",
    address: "444 West 163rd Street",
    city: "New York, NY",
    zip: "10032",
    lat: 40.835994,
    lng: -73.938865,
    photo: null,
    type: "Supportive Housing",
    cluster: 4,
  },
  {
    id: "schafer-hall",
    name: "Schafer Hall",
    borough: "Manhattan",
    address: "117 E 118th Street",
    city: "New York, NY",
    zip: "10035",
    lat: 40.800371,
    lng: -73.941424,
    photo: null,
    type: "Supportive Housing",
    cluster: 1,
    programs: ["HUD", "NYSSHP"],
  },
  {
    id: "stardom-hall",
    name: "Stardom Hall",
    borough: "Manhattan",
    address: "330 W 51st Street",
    city: "New York, NY",
    zip: "10019",
    lat: 40.763308,
    lng: -73.987117,
    photo: null,
    type: "Supportive Housing",
    cluster: 2,
  },

  // ── Brooklyn (3) ─────────────────────────────────────────────────────────
  {
    id: "clover-hall",
    name: "Clover Hall",
    borough: "Brooklyn",
    address: "333 Kosciuszko Street",
    city: "Brooklyn, NY",
    zip: "11221",
    lat: 40.692032,
    lng: -73.9413,
    photo: null,
    type: "Supportive Housing",
    cluster: 2,
  },
  {
    id: "euclid-glenmore",
    name: "Euclid-Glenmore",
    borough: "Brooklyn",
    address: "437 Euclid Avenue",
    city: "Brooklyn, NY",
    zip: "11208",
    lat: 40.676307,
    lng: -73.87192,
    photo: null,
    type: "Supportive Housing",
    cluster: 2,
  },
  {
    // Source ZIP was 11223 (Gravesend); 403 Howard Ave is in Brownsville, 11233.
    id: "hunterfly-trace",
    name: "Hunterfly Trace",
    borough: "Brooklyn",
    address: "403 Howard Avenue",
    city: "Brooklyn, NY",
    zip: "11233",
    lat: 40.674092,
    lng: -73.91938,
    photo: null,
    type: "Supportive Housing",
    cluster: 2,
  },

  // ── Queens (3) ───────────────────────────────────────────────────────────
  {
    id: "laurel-hall",
    name: "Laurel Hall",
    borough: "Queens",
    address: "85-15 101st Avenue",
    city: "Ozone Park, NY",
    zip: "11416",
    lat: 40.682282,
    lng: -73.853969,
    photo: null,
    type: "Shelter",
    cluster: null,
  },
  {
    id: "liberty-plaza",
    name: "Liberty Plaza",
    borough: "Queens",
    address: "144-20 Liberty Avenue",
    city: "Jamaica, NY",
    zip: "11435",
    lat: 40.692793,
    lng: -73.808036,
    photo: null,
    type: "Shelter",
    cluster: null,
  },
  {
    // Source ZIP was 11691 (Far Rockaway); 4317 Rockaway Beach Blvd is in
    // Arverne, 11692.
    id: "rockaway-terrace",
    name: "Rockaway Terrace",
    borough: "Queens",
    address: "4317 Rockaway Beach Blvd",
    city: "Arverne, NY",
    zip: "11692",
    lat: 40.593412,
    lng: -73.775143,
    photo: null,
    type: "Shelter",
    cluster: null,
  },
];

export const SITES_BY_ID = new Map(SITES.map((s) => [s.id, s]));

/**
 * The admin office. Deliberately NOT part of `SITES`: it isn't supportive
 * housing, so it must stay out of the site count and the borough tallies.
 */
export type Office = {
  id: string;
  kind: "office";
  name: string;
  /** Short badge word shown on the marker, legend and detail panel. */
  label: string;
  address: string;
  floor: string;
  city: string;
  zip: string;
  lat: number;
  lng: number;
  photo: string | null;
};

/** Deep ink, distinct from all four borough hues. */
export const OFFICE_COLORS = { base: "#33291f", soft: "#efe7d9" };

export const MAIN_OFFICE: Office = {
  id: "main-office",
  kind: "office",
  name: "Main Office",
  label: "Admin",
  address: "575 8th Avenue",
  floor: "Floor 15",
  city: "New York, NY",
  zip: "10018",
  lat: 40.754975,
  lng: -73.991662,
  photo: null,
};

export type Place = Site | Office;

export function isOffice(place: Place): place is Office {
  return (place as Office).kind === "office";
}

export const PLACES_BY_ID = new Map<string, Place>([
  ...SITES.map((s) => [s.id, s] as [string, Place]),
  [MAIN_OFFICE.id, MAIN_OFFICE],
]);

export function fullAddress(place: Place) {
  const street = isOffice(place)
    ? `${place.address}, ${place.floor}`
    : place.address;
  return `${street}, ${place.city} ${place.zip}`;
}

export function countByBorough(sites: Site[]): Record<Borough, number> {
  const counts = { Bronx: 0, Manhattan: 0, Brooklyn: 0, Queens: 0 };
  for (const s of sites) counts[s.borough] += 1;
  return counts;
}

export function countByCluster(sites: Site[]): Record<ClusterId, number> {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<ClusterId, number>;
  for (const s of sites) if (s.cluster) counts[s.cluster] += 1;
  return counts;
}

export function shelterCount(sites: Site[]) {
  return sites.filter((s) => s.type === "Shelter").length;
}

/** Colour a site takes in cluster mode: its cluster's, or neutral if a shelter. */
export function clusterColorFor(site: Site) {
  return site.cluster ? CLUSTER_COLORS[site.cluster] : SHELTER_COLORS;
}

/** Monogram shown when a place has no local photo yet. */
export function siteInitials(site: Place) {
  return site.name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}
