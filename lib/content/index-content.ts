import { type ClusterId, type Office, type Place, type Site } from "@/lib/sites";
import type { CoverageClusterId, Person, PersonId } from "@/lib/coverage";
import type { SiteTeam, Vp, VpId } from "@/lib/oversight";
import type { Contract, ContentSnapshot } from "./types";

/**
 * The lookups the app used to get from module-level constants, rebuilt over a
 * snapshot instead.
 *
 * They are the same functions by behaviour — `vpIdsForSite` still inherits from
 * the cluster, `siteIdsForVp` is still derived from that rather than stored —
 * so a VP cannot end up overseeing a site its cluster disagrees about, however
 * the content was edited. The difference is only where the data comes from.
 *
 * Building these once per snapshot keeps the per-site lookups O(1) rather than
 * scanning arrays on every render of 21 cards.
 */
export type ContentIndex = {
  snapshot: ContentSnapshot;

  sites: Site[];
  mainOffice: Office;
  sitesById: Map<string, Site>;
  placesById: Map<string, Place>;

  vpById: (id: VpId | null) => Vp | null;
  vpIdsForSite: (siteId: string) => VpId[];
  siteIdsForVp: (id: VpId) => string[];
  teamForSite: (siteId: string) => SiteTeam | null;
  contractForSite: (siteId: string) => Contract | null;

  personById: (id: PersonId | null) => Person | null;
  coverageClusterFor: (siteId: string) => CoverageClusterId | null;
  grantAnalystFor: (siteId: string) => string | null;
  siteIdsInCoverageCluster: (id: CoverageClusterId) => string[];
};

export function buildContentIndex(snapshot: ContentSnapshot): ContentIndex {
  const sitesById = new Map(snapshot.sites.map((s) => [s.id, s]));
  const placesById = new Map<string, Place>([
    ...snapshot.sites.map((s) => [s.id, s] as const),
    [snapshot.mainOffice.id, snapshot.mainOffice],
  ]);
  const vpsById = new Map(snapshot.vps.map((v) => [v.id, v]));
  const peopleById = new Map(snapshot.procurementPeople.map((p) => [p.id, p]));

  const vpIdsForSite = (siteId: string): VpId[] => {
    const site = sitesById.get(siteId);
    if (!site) return [];
    return site.cluster
      ? [snapshot.clusterVps[site.cluster as ClusterId]]
      : [...snapshot.shelterVps];
  };

  // Precomputed, because the Coverage view asks this for every VP card.
  const sitesByVp = new Map<VpId, string[]>();
  for (const site of snapshot.sites) {
    for (const vpId of vpIdsForSite(site.id)) {
      const list = sitesByVp.get(vpId);
      if (list) list.push(site.id);
      else sitesByVp.set(vpId, [site.id]);
    }
  }

  const sitesByCoverageCluster = new Map<CoverageClusterId, string[]>();
  for (const [siteId, cluster] of Object.entries(snapshot.siteCoverageCluster)) {
    const list = sitesByCoverageCluster.get(cluster);
    if (list) list.push(siteId);
    else sitesByCoverageCluster.set(cluster, [siteId]);
  }

  return {
    snapshot,
    sites: snapshot.sites,
    mainOffice: snapshot.mainOffice,
    sitesById,
    placesById,

    vpById: (id) => (id ? (vpsById.get(id) ?? null) : null),
    vpIdsForSite,
    siteIdsForVp: (id) => sitesByVp.get(id) ?? [],
    teamForSite: (siteId) => snapshot.siteTeams[siteId] ?? null,
    contractForSite: (siteId) => snapshot.siteContracts[siteId] ?? null,

    personById: (id) => (id ? (peopleById.get(id) ?? null) : null),
    coverageClusterFor: (siteId) => snapshot.siteCoverageCluster[siteId] ?? null,
    grantAnalystFor: (siteId) => snapshot.siteGrantAnalyst[siteId] ?? null,
    siteIdsInCoverageCluster: (id) => sitesByCoverageCluster.get(id) ?? [],
  };
}
