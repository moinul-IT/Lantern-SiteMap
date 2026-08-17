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
  personById,
  type Assignment,
  type CoverageClusterId,
  type Person,
  type PersonId,
} from "@/lib/coverage";

/**
 * Single source of truth for who covers which cluster. Every site reads through
 * here, so changing a cluster's VP or Procurement member updates every site in
 * that cluster in the same render — there is no per-site copy to keep in sync.
 *
 * Backend swap: replace the `useState` seed with fetched data and make the three
 * mutators call the API (optimistically, or refetch). Consumers stay unchanged.
 */

type CoverageContextValue = {
  assignments: Record<CoverageClusterId, Assignment>;
  setVp: (cluster: CoverageClusterId, personId: PersonId | null) => void;
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
  vp: Person | null;
  procurement: Person | null;
};

const CoverageContext = createContext<CoverageContextValue | null>(null);

export default function CoverageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [assignments, setAssignments] =
    useState<Record<CoverageClusterId, Assignment>>(SEED_ASSIGNMENTS);

  const setVp = useCallback(
    (cluster: CoverageClusterId, personId: PersonId | null) => {
      setAssignments((current) => ({
        ...current,
        [cluster]: { ...current[cluster], vpId: personId },
      }));
    },
    [],
  );

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
      [cluster]: { vpId: null, procurementId: null },
    }));
  }, []);

  const coverageForSite = useCallback(
    (siteId: string): SiteCoverage => {
      const cluster = coverageClusterFor(siteId);
      if (cluster === null) {
        return { cluster: null, vp: null, procurement: null };
      }
      const assignment = assignments[cluster];
      return {
        cluster,
        vp: personById(assignment.vpId),
        procurement: personById(assignment.procurementId),
      };
    },
    [assignments],
  );

  const value = useMemo(
    () => ({
      assignments,
      setVp,
      setProcurement,
      clearCluster,
      coverageForSite,
    }),
    [assignments, setVp, setProcurement, clearCluster, coverageForSite],
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
