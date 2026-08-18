/**
 * Building oversight — the VP over each site and that site's program staff,
 * transcribed from the "Vice President / Building Oversight" org chart.
 *
 * VP is assigned per site here, not per cluster: the chart groups sites under a
 * VP directly, and those groupings do not line up with either the map clusters
 * or the procurement clusters. All 21 sites are covered, and a site may have
 * more than one VP.
 *
 * Several sites share one staff roster (Cedar/Schafer, Lindenguild/Silverleaf,
 * Amber/Leeward). Those carry a `groupLabel` and the same staff list, with the
 * chart's per-building notes preserved on the individual roles.
 */

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
  /**
   * A site can sit under more than one VP: the shelters answer to both the VP of
   * Shelter Services and the VP of Operations, which is what the (TV) / (TZ)
   * notes on their individual roles reflect.
   */
  vpIds: VpId[];
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
  // ── Shelters: Talisha Van Brackle (Shelter Services) + Taiesha Zachary
  //    (Operations) both oversee these four ─────────────────────────────────
  // The four shelters, i.e. every site outside the supportive-housing cluster
  // model. The (TZ) / (TV) notes on individual roles are verbatim from the
  // chart and are left alone.
  "laurel-hall": {
    vpIds: ["vp-talisha", "vp-taiesha"],
    staff: [
      { role: "PD", name: "Michael Wells", note: "TZ" },
      { role: "DPO", name: "Sheryl Lowe", note: "TV" },
      { role: "DSS", name: "Vacant" },
      { role: "Admin", name: "Christina Joly" },
    ],
  },
  "liberty-plaza": {
    vpIds: ["vp-talisha", "vp-taiesha"],
    staff: [
      { role: "PD", name: "Shawna Scott" },
      { role: "DPO", name: "Adedeji Adewusi" },
      { role: "DSS", name: "Jocelyn Berrios" },
      { role: "Admin", name: "Brandy Marshall" },
    ],
  },
  // The chart lists this one by its street, Stillwell Avenue.
  "hudson-bay": {
    vpIds: ["vp-talisha", "vp-taiesha"],
    alsoKnownAs: "Stillwell Avenue",
    staff: [
      { role: "DPO", name: "Vacant" },
      { role: "PD", name: "Tasha Williams" },
      { role: "DSS", name: "Vacant" },
      { role: "Admin", name: "Vacant" },
    ],
  },
  "rockaway-terrace": {
    vpIds: ["vp-talisha", "vp-taiesha"],
    staff: [
      { role: "DPO", name: "Shaquille Shepard" },
      { role: "DSS", name: "Shannon Pierre" },
      { role: "PD", name: "Rosemary Gordon", note: "TZ" },
      { role: "Admin", name: "Margarita Cruz" },
    ],
  },

  // ── Jonathan Castro ─────────────────────────────────────────────────────
  "savanna-hall": {
    vpIds: ["vp-jonathan"],
    staff: [
      { role: "SPD", name: "Yolanda Jones" },
      { role: "PD", name: "Vacant" },
      { role: "APD", name: "Peteso Barlee" },
      { role: "PA", name: "Lavon Edwards" },
    ],
  },
  "lindenguild-hall": {
    vpIds: ["vp-jonathan"],
    groupLabel: "Lindenguild Hall / Silverleaf Hall",
    staff: LINDENGUILD_SILVERLEAF,
  },
  "silverleaf-hall": {
    vpIds: ["vp-jonathan"],
    groupLabel: "Lindenguild Hall / Silverleaf Hall",
    staff: LINDENGUILD_SILVERLEAF,
  },
  "vicinitas-hall": {
    vpIds: ["vp-jonathan"],
    staff: [
      { role: "PD", name: "KC Hunt" },
      { role: "APD", name: "Jazmyne Nichols" },
      { role: "PA", name: "Vacant" },
    ],
  },
  "audubon-hall": {
    vpIds: ["vp-jonathan"],
    staff: [
      { role: "PD", name: "Carlos Castro" },
      { role: "APD", name: "Ashley Warren" },
      { role: "PA", name: "Franchesca Monegro" },
    ],
  },

  // ── Andrea Dogostiano ───────────────────────────────────────────────────
  "cedar-hall": {
    vpIds: ["vp-andrea"],
    groupLabel: "Cedar Hall / Schafer Hall",
    staff: CEDAR_SCHAFER,
  },
  "schafer-hall": {
    vpIds: ["vp-andrea"],
    groupLabel: "Cedar Hall / Schafer Hall",
    staff: CEDAR_SCHAFER,
  },
  "prospero-hall": {
    vpIds: ["vp-andrea"],
    staff: [
      { role: "PD", name: "James Fritts" },
      { role: "APD", name: "Phyllis Ferrara" },
    ],
  },
  "jasper-hall": {
    vpIds: ["vp-andrea"],
    staff: [
      { role: "PD", name: "Tamika Coates" },
      { role: "APD", name: "Vacant" },
      { role: "PA", name: "Ivy Isaac" },
    ],
  },
  "stardom-hall": {
    vpIds: ["vp-andrea"],
    staff: [{ role: "PD", name: "Cyril Jacobs" }],
  },
  "amber-hall": {
    vpIds: ["vp-andrea"],
    groupLabel: "Amber Hall / Leeward Hall",
    staff: AMBER_LEEWARD,
  },
  "leeward-hall": {
    vpIds: ["vp-andrea"],
    groupLabel: "Amber Hall / Leeward Hall",
    staff: AMBER_LEEWARD,
  },

  // ── Portia Linton-Blake ─────────────────────────────────────────────────
  "huntersmoon-hall": {
    vpIds: ["vp-portia"],
    staff: [
      { role: "PD", name: "Michelle Perez" },
      { role: "APD", name: "Samuel Asante" },
      { role: "PA", name: "Vacant" },
    ],
  },
  "euclid-glenmore": {
    vpIds: ["vp-portia"],
    staff: [
      { role: "PD", name: "Ebonie Mickens" },
      { role: "APD", name: "Vacant" },
      { role: "PA", name: "Vacant" },
    ],
  },
  "clover-hall": {
    vpIds: ["vp-portia"],
    staff: [
      { role: "PD", name: "Niesha Sergeant" },
      { role: "APD", name: "Eugene Brown" },
      { role: "PA", name: "Regina Azzara" },
    ],
  },
  "rustin-house": {
    vpIds: ["vp-portia"],
    staff: [
      { role: "PD", name: "John Lim" },
      { role: "APD", name: "Colette Garcia" },
      { role: "PA", name: "Jackie Crisp" },
    ],
  },
  "hunterfly-trace": {
    vpIds: ["vp-portia"],
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

/** Sites a VP currently oversees, per the seed data. */
export function siteIdsForVp(id: VpId): string[] {
  return Object.entries(SITE_TEAM)
    .filter(([, team]) => team.vpIds.includes(id))
    .map(([siteId]) => siteId);
}
