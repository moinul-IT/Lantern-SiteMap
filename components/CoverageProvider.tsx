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
  /** Site id → VP id. Editable, seeded from the oversight chart. */
  siteVps: Record<string, VpId | null>;
  setSiteVp: (siteId: string, vpId: VpId | null) => void;
  /** Reassigns every site currently under `from` to `to`. */
  reassignVpPortfolio: (from: VpId, to: VpId | null) => void;
  /** Resolved oversight + coverage for one site. */
  coverageForSite: (siteId: string) => SiteCoverage;
};

export type SiteCoverage = {
  cluster: CoverageClusterId | null;
  procurement: Person | null;
  /** Per-site, so it comes straight from the data rather than the cluster. */
  grantAnalyst: string | null;
  vp: Vp | null;
  team: SiteTeam | null;
  contract: "DOHMH" | "HASA" | null;
};

/** Seed: the VP each site sits under on the oversight chart. */
const SEED_SITE_VPS: Record<string, VpId | null> = Object.fromEntries(
  Object.entries(SITE_TEAM).map(([siteId, team]) => [siteId, team.vpId]),
);

const CoverageContext = createContext<CoverageContextValue | null>(null);

export default function CoverageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [assignments, setAssignments] =
    useState<Record<CoverageClusterId, Assignment>>(SEED_ASSIGNMENTS);
  const [siteVps, setSiteVps] =
    useState<Record<string, VpId | null>>(SEED_SITE_VPS);

  const setSiteVp = useCallback((siteId: string, vpId: VpId | null) => {
    setSiteVps((current) => ({ ...current, [siteId]: vpId }));
  }, []);

  /** Bulk move, so handing a whole portfolio to another VP is one action. */
  const reassignVpPortfolio = useCallback((from: VpId, to: VpId | null) => {
    setSiteVps((current) =>
      Object.fromEntries(
        Object.entries(current).map(([siteId, vpId]) => [
          siteId,
          vpId === from ? to : vpId,
        ]),
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
        vp: vpById(siteVps[siteId] ?? null),
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
      setSiteVp,
      reassignVpPortfolio,
      coverageForSite,
    }),
    [
      assignments,
      setProcurement,
      clearCluster,
      siteVps,
      setSiteVp,
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
