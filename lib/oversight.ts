/**
 * Building oversight — the VP over each site and that site's program staff,
 * transcribed from the "Vice President / Building Oversight" org chart.
 *
 * VP is assigned PER MAP CLUSTER — one VP each, and `CLUSTER_VPS` is typed so a
 * cluster cannot hold two. Sites inherit their cluster's VP, so a reassignment
 * moves the whole cluster at once and the assignment cannot drift site by site.
 *
 * The four shelters sit outside the cluster model (`cluster: null`) and answer to
 * both shelter VPs, which is the one case that needs more than one.
 *
 * Program staff and the Grant Analyst stay per site — they genuinely vary within
 * a cluster.
 *
 * Several sites share one staff roster (Cedar/Schafer, Lindenguild/Silverleaf,
 * Amber/Leeward). Those carry a `groupLabel` and the same staff list, with the
 * chart's per-building notes preserved on the individual roles.
 */

import { SITES_BY_ID, type ClusterId } from "./sites";

export type VpId = string;

export type Vp = {
  id: VpId;
  name: string;
  title: string;
  /** Portfolio name where the chart gives one. */
  department?: string;
};

export const VPS: Vp[] = [
  {
    id: "vp-talisha",
    name: "Talisha Van Brackle",
    title: "Vice President",
    department: "Shelter Services",
  },
  {
    id: "vp-taiesha",
    name: "Taiesha Zachary",
    title: "Vice President",
    department: "Operations",
  },
  { id: "vp-jonathan", name: "Jonathan Castro", title: "Vice President" },
  { id: "vp-andrea", name: "Andrea Dogostiano", title: "Vice President" },
  { id: "vp-portia", name: "Portia Linton-Blake", title: "Vice President" },
  { id: "vp-sasha", name: "Sasha Callam", title: "Vice President" },
];

export const VPS_BY_ID = new Map<VpId, Vp>(VPS.map((v) => [v.id, v]));

/** Above the VPs on the chart. */
export const PROGRAM_LEADERSHIP = [
  { name: "Vacant", title: "Chief Program Officer" },
  { name: "Chinetta Mitchell", title: "Deputy Chief Program Officer" },
];

export type StaffRole = "SPD" | "PD" | "APD" | "PA" | "DPO" | "DSS" | "Admin";

/**
 * The chart only prints initials. PD is inferred from the SPD/APD family;
 * DSS and Admin are still unexpanded, so they show as-is rather than guessed.
 */
export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  SPD: "Senior Program Director",
  PD: "Program Director",
  APD: "Assistant Program Director",
  PA: "Program Assistant",
  DPO: "Director of Program Operations",
  DSS: "DSS",
  Admin: "Admin",
};

export type StaffEntry = {
  role: StaffRole;
  name: string;
  /** Verbatim parenthetical from the chart, e.g. "Lindenguild" or "TZ". */
  note?: string;
};

export type SiteTeam = {
  /** Set only when one roster genuinely covers more than one building. */
  groupLabel?: string;
  /** The chart's own name for the building, where it differs from ours. */
  alsoKnownAs?: string;
  staff: StaffEntry[];
};

const CEDAR_SCHAFER: StaffEntry[] = [
  { role: "PD", name: "Trevor Griffiths" },
  { role: "APD", name: "Richard Boykins" },
];

const LINDENGUILD_SILVERLEAF: StaffEntry[] = [
  { role: "SPD", name: "Yolanda Jones" },
  { role: "PD", name: "Claudette Stubbs", note: "Lindenguild" },
  { role: "APD", name: "Vacant" },
  { role: "PA", name: "Ayesha Delk", note: "Silverleaf Hall" },
];

const AMBER_LEEWARD: StaffEntry[] = [
  { role: "SPD", name: "Anthony Mercedes", note: "Leeward" },
  { role: "APD", name: "Jessica Williams" },
  { role: "PA", name: "Rasheeda Richardson" },
];

export const SITE_TEAM: Record<string, SiteTeam> = {
  // ── Shelters ────────────────────────────────────────────────────────────
  // The four shelters, i.e. every site outside the supportive-housing cluster
  // model. The (TZ) / (TV) notes on individual roles are verbatim from the
  // chart and are left alone.
  "laurel-hall": {
    staff: [
      { role: "PD", name: "Michael Wells", note: "TZ" },
      { role: "DPO", name: "Sheryl Lowe", note: "TV" },
      { role: "DSS", name: "Vacant" },
      { role: "Admin", name: "Christina Joly" },
    ],
  },
  "liberty-plaza": {
    staff: [
      { role: "PD", name: "Shawna Scott" },
      { role: "DPO", name: "Adedeji Adewusi" },
      { role: "DSS", name: "Jocelyn Berrios" },
      { role: "Admin", name: "Brandy Marshall" },
    ],
  },
  // The chart lists this one by its street, Stillwell Avenue.
  "hudson-bay": {
    alsoKnownAs: "Stillwell Avenue",
    staff: [
      { role: "DPO", name: "Vacant" },
      { role: "PD", name: "Tasha Williams" },
      { role: "DSS", name: "Vacant" },
      { role: "Admin", name: "Vacant" },
    ],
  },
  "rockaway-terrace": {
    staff: [
      { role: "DPO", name: "Shaquille Shepard" },
      { role: "DSS", name: "Shannon Pierre" },
      { role: "PD", name: "Rosemary Gordon", note: "TZ" },
      { role: "Admin", name: "Margarita Cruz" },
    ],
  },

  // ── Supportive housing ──────────────────────────────────────────────────
  "savanna-hall": {
    staff: [
      { role: "SPD", name: "Yolanda Jones" },
      { role: "PD", name: "Vacant" },
      { role: "APD", name: "Peteso Barlee" },
      { role: "PA", name: "Lavon Edwards" },
    ],
  },
  "lindenguild-hall": {
    groupLabel: "Lindenguild Hall / Silverleaf Hall",
    staff: LINDENGUILD_SILVERLEAF,
  },
  "silverleaf-hall": {
    groupLabel: "Lindenguild Hall / Silverleaf Hall",
    staff: LINDENGUILD_SILVERLEAF,
  },
  "vicinitas-hall": {
    staff: [
      { role: "PD", name: "KC Hunt" },
      { role: "APD", name: "Jazmyne Nichols" },
      { role: "PA", name: "Vacant" },
    ],
  },
  "audubon-hall": {
    staff: [
      { role: "PD", name: "Carlos Castro" },
      { role: "APD", name: "Ashley Warren" },
      { role: "PA", name: "Franchesca Monegro" },
    ],
  },

  "cedar-hall": {
    groupLabel: "Cedar Hall / Schafer Hall",
    staff: CEDAR_SCHAFER,
  },
  "schafer-hall": {
    groupLabel: "Cedar Hall / Schafer Hall",
    staff: CEDAR_SCHAFER,
  },
  "prospero-hall": {
    staff: [
      { role: "PD", name: "James Fritts" },
      { role: "APD", name: "Phyllis Ferrara" },
    ],
  },
  "jasper-hall": {
    staff: [
      { role: "PD", name: "Tamika Coates" },
      { role: "APD", name: "Vacant" },
      { role: "PA", name: "Ivy Isaac" },
    ],
  },
  "stardom-hall": {
    staff: [{ role: "PD", name: "Cyril Jacobs" }],
  },
  "amber-hall": {
    groupLabel: "Amber Hall / Leeward Hall",
    staff: AMBER_LEEWARD,
  },
  "leeward-hall": {
    groupLabel: "Amber Hall / Leeward Hall",
    staff: AMBER_LEEWARD,
  },

  "huntersmoon-hall": {
    staff: [
      { role: "PD", name: "Michelle Perez" },
      { role: "APD", name: "Samuel Asante" },
      { role: "PA", name: "Vacant" },
    ],
  },
  "euclid-glenmore": {
    staff: [
      { role: "PD", name: "Ebonie Mickens" },
      { role: "APD", name: "Vacant" },
      { role: "PA", name: "Vacant" },
    ],
  },
  "clover-hall": {
    staff: [
      { role: "PD", name: "Niesha Sergeant" },
      { role: "APD", name: "Eugene Brown" },
      { role: "PA", name: "Regina Azzara" },
    ],
  },
  "rustin-house": {
    staff: [
      { role: "PD", name: "John Lim" },
      { role: "APD", name: "Colette Garcia" },
      { role: "PA", name: "Jackie Crisp" },
    ],
  },
  "hunterfly-trace": {
    staff: [
      { role: "PD", name: "Paul Amoah" },
      { role: "PA", name: "Rubin Tejada" },
    ],
  },
};

/** Funding contract per site, from the DOHMH / HASA lists on the chart. */
export const SITE_CONTRACT: Record<string, "DOHMH" | "HASA"> = {
  "cedar-hall": "DOHMH",
  "hunterfly-trace": "DOHMH",
  "jasper-hall": "DOHMH",
  "lindenguild-hall": "DOHMH",
  "prospero-hall": "DOHMH",
  "vicinitas-hall": "DOHMH",
  "euclid-glenmore": "DOHMH",

  "amber-hall": "HASA",
  "audubon-hall": "HASA",
  "clover-hall": "HASA",
  "huntersmoon-hall": "HASA",
  "stardom-hall": "HASA",
  "leeward-hall": "HASA",
};

export function teamForSite(siteId: string): SiteTeam | null {
  return SITE_TEAM[siteId] ?? null;
}

export function vpById(id: VpId | null): Vp | null {
  return id ? (VPS_BY_ID.get(id) ?? null) : null;
}

export function contractForSite(siteId: string) {
  return SITE_CONTRACT[siteId] ?? null;
}

/**
 * One VP per map cluster. The value is a single VpId, not a list, so a second VP
 * on a cluster is a type error rather than something to police by hand.
 */
export const CLUSTER_VPS: Record<ClusterId, VpId> = {
  1: "vp-sasha",
  2: "vp-portia",
  3: "vp-andrea",
  4: "vp-jonathan",
};

/** The shelters are outside the cluster model and answer to both of these. */
export const SHELTER_VPS: VpId[] = ["vp-talisha", "vp-taiesha"];

/** A site's VPs, inherited from its cluster. */
export function vpIdsForSite(siteId: string): VpId[] {
  const site = SITES_BY_ID.get(siteId);
  if (!site) return [];
  return site.cluster ? [CLUSTER_VPS[site.cluster]] : [...SHELTER_VPS];
}

/** Sites a VP oversees, derived from the cluster assignments above. */
export function siteIdsForVp(id: VpId): string[] {
  return [...SITES_BY_ID.values()]
    .filter((site) => vpIdsForSite(site.id).includes(id))
    .map((site) => site.id);
}
