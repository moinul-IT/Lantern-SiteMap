"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  SEED_ASSIGNMENTS,
  coverageClusterFor,
  grantAnalystFor,
  personById,
  type Assignment,
  type CoverageClusterId,
  type Person,
  type PersonId,
} from "@/lib/coverage";
import {
  SITE_TEAM,
  contractForSite,
  teamForSite,
  vpById,
  type SiteTeam,
  type Vp,
  type VpId,
} from "@/lib/oversight";

/**
 * Single source of truth for who covers which procurement cluster. Every site
 * reads through here, so changing a cluster's Procurement member updates every
 * site in that cluster in the same render — there is no per-site copy to sync.
 *
 * Backend swap: replace the `useState` seed with fetched data and make the
 * mutators call the API (optimistically, or refetch). Consumers stay unchanged.
 */

type CoverageContextValue = {
  assignments: Record<CoverageClusterId, Assignment>;
  setProcurement: (
    cluster: CoverageClusterId,
    personId: PersonId | null,
  ) => void;
  clearCluster: (cluster: CoverageClusterId) => void;
  /** Site id → its VPs. A site may have several; seeded from the chart. */
  siteVps: Record<string, VpId[]>;
  addVpToSite: (siteId: string, vpId: VpId) => void;
  removeVpFromSite: (siteId: string, vpId: VpId) => void;
  /** Moves every site under `from` to `to`, without creating duplicates. */
  reassignVpPortfolio: (from: VpId, to: VpId) => void;
  /** Resolved oversight + coverage for one site. */
  coverageForSite: (siteId: string) => SiteCoverage;
};

export type SiteCoverage = {
  cluster: CoverageClusterId | null;
  procurement: Person | null;
  /** Per-site, so it comes straight from the data rather than the cluster. */
  grantAnalyst: string | null;
  /** Every VP over this site, in chart order. */
  vps: Vp[];
  team: SiteTeam | null;
  contract: "DOHMH" | "HASA" | null;
};

/** Seed: the VPs each site sits under on the oversight chart. */
const SEED_SITE_VPS: Record<string, VpId[]> = Object.fromEntries(
  Object.entries(SITE_TEAM).map(([siteId, team]) => [siteId, [...team.vpIds]]),
);

const CoverageContext = createContext<CoverageContextValue | null>(null);

export default function CoverageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [assignments, setAssignments] =
    useState<Record<CoverageClusterId, Assignment>>(SEED_ASSIGNMENTS);
  const [siteVps, setSiteVps] = useState<Record<string, VpId[]>>(SEED_SITE_VPS);

  const addVpToSite = useCallback((siteId: string, vpId: VpId) => {
    setSiteVps((current) => {
      const existing = current[siteId] ?? [];
      if (existing.includes(vpId)) return current;
      return { ...current, [siteId]: [...existing, vpId] };
    });
  }, []);

  const removeVpFromSite = useCallback((siteId: string, vpId: VpId) => {
    setSiteVps((current) => ({
      ...current,
      [siteId]: (current[siteId] ?? []).filter((id) => id !== vpId),
    }));
  }, []);

  /** Bulk move, so handing a whole portfolio to another VP is one action. */
  const reassignVpPortfolio = useCallback((from: VpId, to: VpId) => {
    setSiteVps((current) =>
      Object.fromEntries(
        Object.entries(current).map(([siteId, ids]) => {
          if (!ids.includes(from)) return [siteId, ids];
          const next = ids.filter((id) => id !== from);
          if (!next.includes(to)) next.push(to);
          return [siteId, next];
        }),
      ),
    );
  }, []);

  const setProcurement = useCallback(
    (cluster: CoverageClusterId, personId: PersonId | null) => {
      setAssignments((current) => ({
        ...current,
        [cluster]: { ...current[cluster], procurementId: personId },
      }));
    },
    [],
  );

  const clearCluster = useCallback((cluster: CoverageClusterId) => {
    setAssignments((current) => ({
      ...current,
      [cluster]: { procurementId: null },
    }));
  }, []);

  const coverageForSite = useCallback(
    (siteId: string): SiteCoverage => {
      const cluster = coverageClusterFor(siteId);
      const shared = {
        vps: (siteVps[siteId] ?? [])
          .map((id) => vpById(id))
          .filter((v): v is Vp => v !== null),
        team: teamForSite(siteId),
        contract: contractForSite(siteId),
      };
      if (cluster === null) {
        return {
          cluster: null,
          procurement: null,
          grantAnalyst: null,
          ...shared,
        };
      }
      return {
        cluster,
        procurement: personById(assignments[cluster].procurementId),
        grantAnalyst: grantAnalystFor(siteId),
        ...shared,
      };
    },
    [assignments, siteVps],
  );

  const value = useMemo(
    () => ({
      assignments,
      setProcurement,
      clearCluster,
      siteVps,
      addVpToSite,
      removeVpFromSite,
      reassignVpPortfolio,
      coverageForSite,
    }),
    [
      assignments,
      setProcurement,
      clearCluster,
      siteVps,
      addVpToSite,
      removeVpFromSite,
      reassignVpPortfolio,
      coverageForSite,
    ],
  );

  return (
    <CoverageContext.Provider value={value}>
      {children}
    </CoverageContext.Provider>
  );
}

export function useCoverage() {
  const value = useContext(CoverageContext);
  if (!value) {
    throw new Error("useCoverage must be used inside CoverageProvider");
  }
  return value;
}
