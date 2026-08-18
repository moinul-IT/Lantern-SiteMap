"use client";

import { motion } from "framer-motion";
import { useCoverage } from "./CoverageProvider";
import {
  COVERAGE_CLUSTERS,
  PROCUREMENT_LEADERSHIP,
  grantAnalystFor,
  personById,
  siteIdsInCoverageCluster,
} from "@/lib/coverage";
import { PROGRAM_LEADERSHIP, VPS } from "@/lib/oversight";
import { SITES, SITES_BY_ID } from "@/lib/sites";

const EASE = [0.22, 0.61, 0.36, 1] as const;

/**
 * Read-only reference for who covers what. There is no backend, so there are no
 * controls here — an editor could only change in-memory state that resets on
 * refresh, which reads as "saved" when nothing was. Assignments live in
 * `lib/oversight.ts` and `lib/coverage.ts`.
 */
export default function CoverageAdmin({
  onOpenSite,
}: {
  onOpenSite: (siteId: string) => void;
}) {
  const { assignments, siteVps } = useCoverage();

  const portfolios = VPS.map((vp) => ({
    vp,
    siteIds: SITES.filter((s) => (siteVps[s.id] ?? []).includes(vp.id)).map(
      (s) => s.id,
    ),
  }));

  return (
    <div className="flex flex-1 flex-col gap-5">
      <Card delay={0}>
        <p className="eyebrow">Program leadership</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {PROGRAM_LEADERSHIP.map((person) => (
            <li key={person.title} className="min-w-0">
              <p
                className={`truncate text-sm font-medium ${person.name === "Vacant" ? "text-ink-faint italic" : "text-ink"}`}
              >
                {person.name}
              </p>
              <p className="truncate text-[13px] text-ink-soft">
                {person.title}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {portfolios.map((portfolio, index) => (
          <motion.section
            key={portfolio.vp.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.36,
              delay: 0.04 + index * 0.05,
              ease: EASE,
            }}
            className="flex flex-col overflow-hidden rounded-2xl border border-hairline bg-paper shadow-float"
          >
            <header className="border-b border-hairline px-5 py-4">
              <div className="flex items-center gap-2.5">
                <h2 className="flex-1 font-display text-lg leading-none font-normal text-ink">
                  {portfolio.vp.name}
                </h2>
                <span className="font-mono text-[11px] text-ink-faint tabular-nums">
                  {String(portfolio.siteIds.length).padStart(2, "0")}
                </span>
              </div>
              <p className="mt-1.5 font-mono text-[10px] tracking-[0.1em] uppercase text-ink-faint">
                {portfolio.vp.department
                  ? `${portfolio.vp.title} · ${portfolio.vp.department}`
                  : portfolio.vp.title}
              </p>
            </header>

            <div className="px-5 py-4">
              {portfolio.siteIds.length === 0 ? (
                <p className="text-[13px] text-ink-faint">No sites assigned.</p>
              ) : (
                <ul className="divide-y divide-hairline border-t border-hairline">
                  {portfolio.siteIds.map((siteId) => {
                    const site = SITES_BY_ID.get(siteId);
                    if (!site) return null;
                    const alsoUnder = (siteVps[siteId] ?? [])
                      .filter((id) => id !== portfolio.vp.id)
                      .map((id) => VPS.find((v) => v.id === id)?.name)
                      .filter(Boolean);
                    return (
                      <li key={siteId}>
                        <button
                          type="button"
                          onClick={() => onOpenSite(siteId)}
                          className="flex min-h-11 w-full flex-col justify-center py-2 text-left transition-colors duration-200 hover:bg-cream active:bg-cream-deep focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ink/40 md:min-h-0"
                        >
                          <span className="block truncate text-[13px] text-ink">
                            {site.name}
                          </span>
                          {alsoUnder.length > 0 && (
                            <span className="block truncate font-mono text-[10px] text-ink-faint">
                              also {alsoUnder.join(", ")}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.section>
        ))}
      </div>

      <Card delay={0.08}>
        <p className="eyebrow">Procurement leadership</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {PROCUREMENT_LEADERSHIP.map((id) => {
            const person = personById(id);
            if (!person) return null;
            return (
              <li key={id} className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">
                  {person.name}
                </p>
                <p className="truncate text-[13px] text-ink-soft">
                  {person.title}
                </p>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="grid gap-5 xl:grid-cols-3">
        {COVERAGE_CLUSTERS.map((cluster, index) => {
          const person = personById(assignments[cluster.id].procurementId);
          const siteIds = siteIdsInCoverageCluster(cluster.id);

          return (
            <motion.section
              key={cluster.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.36,
                delay: 0.1 + index * 0.06,
                ease: EASE,
              }}
              className="flex flex-col overflow-hidden rounded-2xl border border-hairline bg-paper shadow-float"
            >
              <header className="border-b border-hairline px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <h2 className="flex-1 font-display text-lg leading-none font-normal text-ink">
                    {cluster.name}
                  </h2>
                  <span className="font-mono text-[11px] text-ink-faint tabular-nums">
                    {String(siteIds.length).padStart(2, "0")}
                  </span>
                </div>
                <p className="mt-1.5 font-mono text-[10px] tracking-[0.1em] uppercase text-ink-faint">
                  {person ? person.title : "Unassigned"}
                </p>
              </header>

              <div className="px-5 py-4">
                <p className="text-sm font-medium text-ink">
                  {person ? person.name : "Unassigned"}
                </p>

                <p className="eyebrow mt-4 block">Sites inheriting this</p>
                {/* Grant Analyst is per site, not per cluster, so it sits on the
                    row rather than as a cluster-level field. */}
                <ul className="mt-2 divide-y divide-hairline border-t border-hairline">
                  {siteIds.map((siteId) => {
                    const site = SITES_BY_ID.get(siteId);
                    if (!site) return null;
                    return (
                      <li key={siteId}>
                        <button
                          type="button"
                          onClick={() => onOpenSite(siteId)}
                          className="flex min-h-11 w-full items-center gap-3 py-2 text-left transition-colors duration-200 hover:bg-cream active:bg-cream-deep focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ink/40 md:min-h-0"
                        >
                          <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                            {site.name}
                          </span>
                          <span className="shrink-0 font-mono text-[11px] text-ink-faint">
                            GA {grantAnalystFor(siteId) ?? "—"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}

function Card({
  delay,
  children,
}: {
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, delay, ease: EASE }}
      className="rounded-2xl border border-hairline bg-paper p-5 shadow-float"
    >
      {children}
    </motion.section>
  );
}
