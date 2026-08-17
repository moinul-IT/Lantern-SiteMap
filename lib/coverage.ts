/**
 * Procurement coverage — the Procurement Team Member assigned to each cluster,
 * inherited by every site in it, plus each site's Grant Analyst.
 *
 * Only the procurement and Grant Analyst columns of the source org chart are
 * modelled. The VP column and the "PD" column were reported as inaccurate and
 * are deliberately not represented here.
 *
 * IMPORTANT: these procurement clusters are NOT the map clusters in `sites.ts`.
 * The procurement chart groups all 21 sites (shelters included) into three
 * clusters of seven; the map clusters group only the 17 supportive-housing sites
 * into four. 18 of 21 sites land differently, so they stay separate dimensions.
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
  PROCUREMENT_PEOPLE.map((p) => [p.id, p]),
);

/** Procurement leadership shown above the per-cluster assignments. */
export const PROCUREMENT_LEADERSHIP: PersonId[] = [
  "pr-kanan",
  "pr-shana",
  "pr-collin",
];

export const COVERAGE_CLUSTERS: CoverageCluster[] = [
  { id: 1, name: "Procurement Cluster 1" },
  { id: 2, name: "Procurement Cluster 2" },
  { id: 3, name: "Procurement Cluster 3" },
];

export type Assignment = {
  procurementId: PersonId | null;
};

/** Seed state, straight from the org chart's procurement analysts. */
export const SEED_ASSIGNMENTS: Record<CoverageClusterId, Assignment> = {
  1: { procurementId: "pr-shatoria" },
  2: { procurementId: "pr-desiree" },
  3: { procurementId: "pr-sertso" },
};

/** Site id → procurement cluster, matched on street address in the org chart. */
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
 * Grant Analyst per site. This is genuinely per-site, not per-cluster: Cluster 1
 * is six Ashraya and one Wei, Cluster 2 five Anel and two Wei, so it cannot be
 * folded into the cluster assignment.
 */
export const SITE_GRANT_ANALYST: Record<string, string> = {
  "rockaway-terrace": "Ashraya",
  "stardom-hall": "Ashraya",
  "vicinitas-hall": "Ashraya",
  "huntersmoon-hall": "Wei",
  "lindenguild-hall": "Ashraya",
  "prospero-hall": "Ashraya",
  "schafer-hall": "Ashraya",

  "amber-hall": "Anel",
  "audubon-hall": "Anel",
  "cedar-hall": "Anel",
  "liberty-plaza": "Wei",
  "savanna-hall": "Anel",
  "leeward-hall": "Wei",
  "jasper-hall": "Wei",

  "clover-hall": "Ashraya",
  "euclid-glenmore": "Anel",
  "laurel-hall": "Anel",
  "hudson-bay": "Anel",
  "rustin-house": "Anel",
  "hunterfly-trace": "Ashraya",
  "silverleaf-hall": "Anel",
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

export function grantAnalystFor(siteId: string): string | null {
  return SITE_GRANT_ANALYST[siteId] ?? null;
}

/** Site ids belonging to a procurement cluster — used by the admin counts. */
export function siteIdsInCoverageCluster(id: CoverageClusterId): string[] {
  return Object.entries(SITE_COVERAGE_CLUSTER)
    .filter(([, cluster]) => cluster === id)
    .map(([siteId]) => siteId);
}
