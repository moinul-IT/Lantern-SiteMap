import type { ClusterId, Office, Site } from "@/lib/sites";
import type {
  Assignment,
  CoverageClusterId,
  Person,
  PersonId,
} from "@/lib/coverage";
import type { SiteTeam, Vp, VpId } from "@/lib/oversight";

/** Contract lines the chart recognises. */
export type Contract = "DOHMH" | "HASA";

export type Leader = { name: string; title: string };

/**
 * Everything a content manager can change, in one document.
 *
 * The split is deliberate: this holds *content* — people, assignments,
 * addresses, the org chart — and nothing else. Borough and cluster colours,
 * role labels and the map style stay in code, because they are design
 * decisions rather than records someone maintains.
 *
 * `version` increases on every save. The client keeps whichever snapshot has
 * the higher one, so a slow response can never overwrite fresher content that
 * arrived first.
 */
export type ContentSnapshot = {
  version: number;
  updatedAt: string;

  // ── Sites ────────────────────────────────────────────────────────────────
  sites: Site[];
  mainOffice: Office;

  // ── Building oversight ───────────────────────────────────────────────────
  vps: Vp[];
  clusterVps: Record<ClusterId, VpId>;
  shelterVps: VpId[];
  siteTeams: Record<string, SiteTeam>;
  siteContracts: Record<string, Contract>;
  programLeadership: Leader[];

  // ── Procurement coverage ─────────────────────────────────────────────────
  procurementPeople: Person[];
  procurementLeadership: PersonId[];
  coverageAssignments: Record<CoverageClusterId, Assignment>;
  siteCoverageCluster: Record<string, CoverageClusterId>;
  siteGrantAnalyst: Record<string, string>;
};

/**
 * Shallow structural check, used on anything arriving over the network.
 *
 * Not a full schema validation — it is here to reject a truncated or wrong-shaped
 * response (an HTML error page, a half-written document) before it replaces
 * working content on screen. A snapshot missing its sites would empty the map.
 */
export function isContentSnapshot(value: unknown): value is ContentSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Partial<ContentSnapshot>;
  return (
    typeof c.version === "number" &&
    Array.isArray(c.sites) &&
    c.sites.length > 0 &&
    typeof c.mainOffice === "object" &&
    c.mainOffice !== null &&
    Array.isArray(c.vps) &&
    typeof c.siteTeams === "object" &&
    c.siteTeams !== null &&
    typeof c.siteCoverageCluster === "object" &&
    c.siteCoverageCluster !== null
  );
}
