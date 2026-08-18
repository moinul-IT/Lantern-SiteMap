"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  SEED_ASSIGNMENTS,
  coverageClusterFor,
  grantAnalystFor,
  personById,
  type Assignment,
  type CoverageClusterId,
  type Person,
} from "@/lib/coverage";
import {
  contractForSite,
  teamForSite,
  vpById,
  vpIdsForSite,
  type SiteTeam,
  type Vp,
  type VpId,
} from "@/lib/oversight";
import { SITES } from "@/lib/sites";

/**
 * Single place every site reads its oversight and procurement coverage from.
 *
 * Deliberately READ-ONLY. There is no backend, so an editing UI could only mutate
 * in-memory state that vanishes on refresh — worse than not offering it, because
 * it looks like the change was saved. Assignments change by editing
 * `lib/oversight.ts` and `lib/coverage.ts`, which are the record of the org chart.
 *
 * VPs come from the cluster (`CLUSTER_VPS`), procurement from the procurement
 * cluster, and program staff plus Grant Analyst from the site itself.
 *
 * This stays the seam for a future backend: swap the two sources below for fetched
 * data, add mutators here, and no consumer has to change.
 */

type CoverageContextValue = {
  assignments: Record<CoverageClusterId, Assignment>;
  /** Site id → its VPs. A site may have several. */
  siteVps: Record<string, VpId[]>;
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

/** Derived from the cluster assignments, so it cannot disagree with them. */
const SITE_VPS: Record<string, VpId[]> = Object.fromEntries(
  SITES.map((site) => [site.id, vpIdsForSite(site.id)]),
);

const CoverageContext = createContext<CoverageContextValue | null>(null);

export default function CoverageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const value = useMemo<CoverageContextValue>(() => {
    const coverageForSite = (siteId: string): SiteCoverage => {
      const cluster = coverageClusterFor(siteId);
      const shared = {
        vps: (SITE_VPS[siteId] ?? [])
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
        procurement: personById(SEED_ASSIGNMENTS[cluster].procurementId),
        grantAnalyst: grantAnalystFor(siteId),
        ...shared,
      };
    };

    return {
      assignments: SEED_ASSIGNMENTS,
      siteVps: SITE_VPS,
      coverageForSite,
    };
  }, []);

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
