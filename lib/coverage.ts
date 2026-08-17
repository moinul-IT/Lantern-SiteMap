/**
 * Procurement coverage — VP and Procurement Team Member per cluster, inherited
 * by every site in that cluster.
 *
 * IMPORTANT: the coverage clusters below are NOT the map clusters in `sites.ts`.
 * The procurement org chart groups all 21 sites (shelters included) into three
 * clusters of seven; the map clusters group only the 17 supportive-housing sites
 * into four. 18 of 21 sites land differently between the two, so they are kept
 * as separate dimensions rather than forced together.
 *
 * Everything here is plain data plus pure lookups. Live assignments live in
 * `CoverageProvider`, whose seed is `SEED_ASSIGNMENTS` — swap that provider's
 * seed and mutators for API calls and nothing else has to change.
 */

export type PersonId = string;

export type Person = {
  id: PersonId;
  name: string;
  title: string;
  /** Contact details are shown only when present — none are in the source. */
  email?: string;
  phone?: string;
};

export type CoverageClusterId = 1 | 2 | 3;

export type CoverageCluster = {
  id: CoverageClusterId;
  name: string;
};

/** Who may be assigned as a cluster VP. */
export const VP_PEOPLE: Person[] = [
  { id: "vp-talisha", name: "Talisha / Taiesha", title: "Vice President" },
  { id: "vp-andrea", name: "Andrea", title: "Vice President" },
  { id: "vp-johnathan", name: "Johnathan", title: "Vice President" },
  { id: "vp-portia", name: "Portia", title: "Vice President" },
];

/** Who may be assigned as a cluster Procurement Team Member. */
export const PROCUREMENT_PEOPLE: Person[] = [
  { id: "pr-shatoria", name: "Shatoria Powell", title: "Procurement Analyst" },
  { id: "pr-desiree", name: "Desiree DeJesus", title: "Procurement Analyst" },
  { id: "pr-sertso", name: "Sertso Mertsi", title: "Procurement Analyst" },
  { id: "pr-shana", name: "Shana Hogg", title: "Procurement Manager" },
  {
    id: "pr-collin",
    name: "Collin Falkowski",
    title: "Procurement Data Analyst",
  },
  {
    id: "pr-kanan",
    name: "Kanan Mammadov",
    title: "Senior Vice President of Procurement",
  },
];

export const PEOPLE_BY_ID = new Map<PersonId, Person>(
  [...VP_PEOPLE, ...PROCUREMENT_PEOPLE].map((p) => [p.id, p]),
);

/** Procurement leadership shown above the per-cluster assignments. */
export const PROCUREMENT_LEADERSHIP: PersonId[] = [
  "pr-kanan",
  "pr-shana",
  "pr-collin",
];

export const COVERAGE_CLUSTERS: CoverageCluster[] = [
  { id: 1, name: "Coverage Cluster 1" },
  { id: 2, name: "Coverage Cluster 2" },
  { id: 3, name: "Coverage Cluster 3" },
];

export type Assignment = {
  vpId: PersonId | null;
  procurementId: PersonId | null;
};

/**
 * Seed state. Procurement members come straight from the org chart. VPs are
 * deliberately left unassigned: the chart's VP column varies per site rather
 * than per cluster, so mapping it to a single VP per cluster would be a guess.
 */
export const SEED_ASSIGNMENTS: Record<CoverageClusterId, Assignment> = {
  1: { vpId: null, procurementId: "pr-shatoria" },
  2: { vpId: null, procurementId: "pr-desiree" },
  3: { vpId: null, procurementId: "pr-sertso" },
};

/** Site id → coverage cluster, matched on street address in the org chart. */
export const SITE_COVERAGE_CLUSTER: Record<string, CoverageClusterId> = {
  "rockaway-terrace": 1,
  "stardom-hall": 1,
  "vicinitas-hall": 1,
  "huntersmoon-hall": 1,
  "lindenguild-hall": 1,
  "prospero-hall": 1,
  "schafer-hall": 1,

  "amber-hall": 2,
  "audubon-hall": 2,
  "cedar-hall": 2,
  "liberty-plaza": 2,
  "savanna-hall": 2,
  "leeward-hall": 2,
  "jasper-hall": 2,

  "clover-hall": 3,
  "euclid-glenmore": 3,
  "laurel-hall": 3,
  "hudson-bay": 3,
  "rustin-house": 3,
  "hunterfly-trace": 3,
  "silverleaf-hall": 3,
};

/**
 * Per-site contacts from the "GA" and "PD" columns of the org chart. The source
 * uses those abbreviations without expanding them, so they are shown verbatim
 * rather than guessed at.
 */
export type SiteContacts = { ga: string; pd: string };

export const SITE_CONTACTS: Record<string, SiteContacts> = {
  "rockaway-terrace": { ga: "Ashraya", pd: "Rosemary Gordon" },
  "stardom-hall": { ga: "Ashraya", pd: "Cyril Jacobs" },
  "vicinitas-hall": { ga: "Ashraya", pd: "KC Hunt" },
  "huntersmoon-hall": { ga: "Wei", pd: "Michelle Perez" },
  "lindenguild-hall": { ga: "Ashraya", pd: "Claudette Stubbs" },
  "prospero-hall": { ga: "Ashraya", pd: "James Fritts" },
  "schafer-hall": { ga: "Ashraya", pd: "Trevor Griffith" },

  "amber-hall": { ga: "Anel", pd: "Anthony Mercedes" },
  "audubon-hall": { ga: "Anel", pd: "Carlos Castro" },
  "cedar-hall": { ga: "Anel", pd: "Trevor Griffith" },
  "liberty-plaza": { ga: "Wei", pd: "Shawna Scott" },
  "savanna-hall": { ga: "Anel", pd: "Yolanda Jones" },
  "leeward-hall": { ga: "Wei", pd: "Anthony Mercedes" },
  "jasper-hall": { ga: "Wei", pd: "Tamika Coates" },

  "clover-hall": { ga: "Ashraya", pd: "Niesha Sergeant" },
  "euclid-glenmore": { ga: "Anel", pd: "Ebonie Mickens" },
  "laurel-hall": { ga: "Anel", pd: "Michael Wells" },
  "hudson-bay": { ga: "Anel", pd: "Tasha Williams" },
  "rustin-house": { ga: "Anel", pd: "John Lim" },
  "hunterfly-trace": { ga: "Ashraya", pd: "Paul Amoah" },
  "silverleaf-hall": { ga: "Anel", pd: "Yolanda Jones" },
};

export function coverageClusterFor(siteId: string): CoverageClusterId | null {
  return SITE_COVERAGE_CLUSTER[siteId] ?? null;
}

export function coverageClusterName(id: CoverageClusterId) {
  return COVERAGE_CLUSTERS.find((c) => c.id === id)?.name ?? `Cluster ${id}`;
}

export function personById(id: PersonId | null): Person | null {
  return id ? (PEOPLE_BY_ID.get(id) ?? null) : null;
}

/** Site ids belonging to a coverage cluster — used by the admin counts. */
export function siteIdsInCoverageCluster(id: CoverageClusterId): string[] {
  return Object.entries(SITE_COVERAGE_CLUSTER)
    .filter(([, cluster]) => cluster === id)
    .map(([siteId]) => siteId);
}
