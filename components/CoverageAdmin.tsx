"use client";

import { motion } from "framer-motion";
import { useCoverage } from "./CoverageProvider";
import {
  COVERAGE_CLUSTERS,
  PROCUREMENT_LEADERSHIP,
  PROCUREMENT_PEOPLE,
  grantAnalystFor,
  personById,
  siteIdsInCoverageCluster,
  type Person,
  type PersonId,
} from "@/lib/coverage";
import { PROGRAM_LEADERSHIP, VPS, type VpId } from "@/lib/oversight";
import { SITES, SITES_BY_ID } from "@/lib/sites";

const EASE = [0.22, 0.61, 0.36, 1] as const;

export default function CoverageAdmin({
  onOpenSite,
}: {
  onOpenSite: (siteId: string) => void;
}) {
  const {
    assignments,
    setProcurement,
    clearCluster,
    siteVps,
    setSiteVp,
    reassignVpPortfolio,
  } = useCoverage();

  // Grouped from live state, so a reassignment moves the site between columns.
  const portfolios = VPS.map((vp) => ({
    vp,
    siteIds: SITES.filter((s) => siteVps[s.id] === vp.id).map((s) => s.id),
  }));
  const unassigned = SITES.filter((s) => !siteVps[s.id]).map((s) => s.id);

  return (
    <div className="flex flex-1 flex-col gap-5">
      {/* ── Building oversight ─────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: EASE }}
        className="rounded-2xl border border-hairline bg-paper p-5 shadow-float"
      >
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
      </motion.section>

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

            <div className="flex flex-1 flex-col gap-3 px-5 py-4">
              {portfolio.siteIds.length === 0 ? (
                <p className="text-[13px] text-ink-faint">No sites assigned.</p>
              ) : (
                <ul className="divide-y divide-hairline border-t border-hairline">
                  {portfolio.siteIds.map((siteId) => (
                    <SiteVpRow
                      key={siteId}
                      siteId={siteId}
                      value={siteVps[siteId] ?? null}
                      onChange={(id) => setSiteVp(siteId, id)}
                      onOpen={() => onOpenSite(siteId)}
                    />
                  ))}
                </ul>
              )}

              <label className="mt-auto block">
                <span className="eyebrow">Hand whole portfolio to</span>
                <span className="mt-1.5 flex h-11 items-center rounded-xl border border-hairline bg-cream/60 px-3">
                  <select
                    value=""
                    disabled={portfolio.siteIds.length === 0}
                    onChange={(event) =>
                      reassignVpPortfolio(
                        portfolio.vp.id,
                        event.target.value || null,
                      )
                    }
                    className="w-full bg-transparent text-base text-ink focus:outline-none disabled:opacity-40 md:text-sm"
                  >
                    <option value="">Choose a VP…</option>
                    {VPS.filter((v) => v.id !== portfolio.vp.id).map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
            </div>
          </motion.section>
        ))}
      </div>

      {unassigned.length > 0 && (
        <section className="rounded-2xl border border-hairline bg-paper p-5 shadow-float">
          <p className="eyebrow">Sites with no VP</p>
          <ul className="mt-2 divide-y divide-hairline border-t border-hairline">
            {unassigned.map((siteId) => (
              <SiteVpRow
                key={siteId}
                siteId={siteId}
                value={null}
                onChange={(id) => setSiteVp(siteId, id)}
                onOpen={() => onOpenSite(siteId)}
              />
            ))}
          </ul>
        </section>
      )}
      {/* Leadership is org-wide, not per cluster, so it sits above the table. */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: EASE }}
        className="rounded-2xl border border-hairline bg-paper p-5 shadow-float"
      >
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
      </motion.section>

      <div className="grid gap-5 xl:grid-cols-3">
        {COVERAGE_CLUSTERS.map((cluster, index) => {
          const assignment = assignments[cluster.id];
          const siteIds = siteIdsInCoverageCluster(cluster.id);

          return (
            <motion.section
              key={cluster.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.36,
                delay: 0.06 + index * 0.06,
                ease: EASE,
              }}
              className="flex flex-col overflow-hidden rounded-2xl border border-hairline bg-paper shadow-float"
            >
              <header className="flex items-center gap-2.5 border-b border-hairline px-5 py-4">
                <h2 className="flex-1 font-display text-lg leading-none font-normal text-ink">
                  {cluster.name}
                </h2>
                <span className="font-mono text-[11px] text-ink-faint tabular-nums">
                  {String(siteIds.length).padStart(2, "0")} sites
                </span>
              </header>

              <div className="flex flex-1 flex-col gap-4 px-5 py-4">
                <PersonPicker
                  label="Procurement Team Member"
                  people={PROCUREMENT_PEOPLE}
                  value={assignment.procurementId}
                  onChange={(id) => setProcurement(cluster.id, id)}
                />

                <div>
                  <p className="eyebrow">Sites inheriting this</p>
                  {/* Grant Analyst is per site, not per cluster, so it is shown
                      on each row rather than as a cluster-level field. */}
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

                <button
                  type="button"
                  onClick={() => clearCluster(cluster.id)}
                  disabled={assignment.procurementId === null}
                  className="mt-auto min-h-11 self-start rounded-xl border border-hairline px-3.5 py-2 text-[13px] text-ink-soft transition-colors duration-200 hover:bg-cream hover:text-ink active:bg-cream-deep disabled:cursor-not-allowed disabled:opacity-40 md:min-h-0"
                >
                  Remove assignment
                </button>
              </div>
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}

function PersonPicker({
  label,
  people,
  value,
  onChange,
}: {
  label: string;
  people: Person[];
  value: PersonId | null;
  onChange: (id: PersonId | null) => void;
}) {
  const selected = personById(value);

  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <span className="mt-1.5 flex h-11 items-center rounded-xl border border-hairline bg-cream/60 px-3">
        <select
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value || null)}
          className="w-full bg-transparent text-base text-ink focus:outline-none md:text-sm"
        >
          <option value="">Unassigned</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name} — {person.title}
            </option>
          ))}
        </select>
      </span>
      <span className="mt-1 block truncate text-[13px] text-ink-soft">
        {selected ? selected.title : "No one assigned yet"}
      </span>
    </label>
  );
}

/** One site row inside a VP portfolio, with its own VP picker. */
function SiteVpRow({
  siteId,
  value,
  onChange,
  onOpen,
}: {
  siteId: string;
  value: VpId | null;
  onChange: (id: VpId | null) => void;
  onOpen: () => void;
}) {
  const site = SITES_BY_ID.get(siteId);
  if (!site) return null;

  return (
    <li className="flex min-h-11 items-center gap-2 py-2">
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 truncate text-left text-[13px] text-ink transition-colors duration-200 hover:text-ink-soft focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ink/40"
      >
        {site.name}
      </button>
      <select
        aria-label={`Vice President for ${site.name}`}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        /* 16px on mobile, else iOS Safari zooms the page on focus. */
        className="max-w-[9rem] shrink-0 rounded-lg border border-hairline bg-cream/60 px-1.5 py-1 text-base text-ink-soft focus:outline-none md:text-[12px]"
      >
        <option value="">Unassigned</option>
        {VPS.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
    </li>
  );
}
