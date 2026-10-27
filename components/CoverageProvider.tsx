"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useContent } from "./ContentProvider";
import type { Assignment, CoverageClusterId, Person } from "@/lib/coverage";
import type { SiteTeam, Vp, VpId } from "@/lib/oversight";
import type { Contract } from "@/lib/content/types";

/**
 * Resolved oversight and procurement coverage, per site.
 *
 * Reads everything from ContentProvider, so a snapshot saved by the content
 * manager reaches every card here without any consumer changing. VPs still come
 * from the cluster, procurement from the procurement cluster, and program staff
 * plus Grant Analyst from the site itself — the inheritance rules live in
 * `lib/content/index-content.ts` and hold whatever the content says.
 *
 * Read-only, like the layer under it: saving belongs with the editing UI, which
 * has to sit behind the content-manager role.
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
  contract: Contract | null;
};

const CoverageContext = createContext<CoverageContextValue | null>(null);

export default function CoverageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const content = useContent();

  const value = useMemo<CoverageContextValue>(() => {
    // Derived from the cluster assignments, so it cannot disagree with them.
    const siteVps: Record<string, VpId[]> = Object.fromEntries(
      content.sites.map((site) => [site.id, content.vpIdsForSite(site.id)]),
    );

    const coverageForSite = (siteId: string): SiteCoverage => {
      const cluster = content.coverageClusterFor(siteId);
      const shared = {
        vps: (siteVps[siteId] ?? [])
          .map((id) => content.vpById(id))
          .filter((v): v is Vp => v !== null),
        team: content.teamForSite(siteId),
        contract: content.contractForSite(siteId),
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
        procurement: content.personById(
          content.snapshot.coverageAssignments[cluster]?.procurementId ?? null,
        ),
        grantAnalyst: content.grantAnalystFor(siteId),
        ...shared,
      };
    };

    return {
      assignments: content.snapshot.coverageAssignments,
      siteVps,
      coverageForSite,
    };
  }, [content]);

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
