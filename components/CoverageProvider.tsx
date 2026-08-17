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
  /** Resolved coverage for one site, following its cluster. */
  coverageForSite: (siteId: string) => SiteCoverage;
};

export type SiteCoverage = {
  cluster: CoverageClusterId | null;
  procurement: Person | null;
  /** Per-site, so it comes straight from the data rather than the cluster. */
  grantAnalyst: string | null;
};

const CoverageContext = createContext<CoverageContextValue | null>(null);

export default function CoverageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [assignments, setAssignments] =
    useState<Record<CoverageClusterId, Assignment>>(SEED_ASSIGNMENTS);

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
      if (cluster === null) {
        return { cluster: null, procurement: null, grantAnalyst: null };
      }
      return {
        cluster,
        procurement: personById(assignments[cluster].procurementId),
        grantAnalyst: grantAnalystFor(siteId),
      };
    },
    [assignments],
  );

  const value = useMemo(
    () => ({ assignments, setProcurement, clearCluster, coverageForSite }),
    [assignments, setProcurement, clearCluster, coverageForSite],
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
