"use client";

import { motion } from "framer-motion";
import { useCoverage } from "./CoverageProvider";
import {
  COVERAGE_CLUSTERS,
  PROCUREMENT_LEADERSHIP,
  PROCUREMENT_PEOPLE,
  VP_PEOPLE,
  personById,
  siteIdsInCoverageCluster,
  type Person,
  type PersonId,
} from "@/lib/coverage";
import { SITES_BY_ID } from "@/lib/sites";

const EASE = [0.22, 0.61, 0.36, 1] as const;

export default function CoverageAdmin({
  onOpenSite,
}: {
  onOpenSite: (siteId: string) => void;
}) {
  const { assignments, setVp, setProcurement, clearCluster } = useCoverage();

  return (
    <div className="flex flex-1 flex-col gap-5">
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
          const assignedCount =
            (assignment.vpId ? 1 : 0) + (assignment.procurementId ? 1 : 0);

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
                  label="Vice President"
                  people={VP_PEOPLE}
                  value={assignment.vpId}
                  onChange={(id) => setVp(cluster.id, id)}
                />
                <PersonPicker
                  label="Procurement Team Member"
                  people={PROCUREMENT_PEOPLE}
                  value={assignment.procurementId}
                  onChange={(id) => setProcurement(cluster.id, id)}
                />

                <div>
                  <p className="eyebrow">Sites inheriting this</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {siteIds.map((siteId) => {
                      const site = SITES_BY_ID.get(siteId);
                      if (!site) return null;
                      return (
                        <li key={siteId}>
                          <button
                            type="button"
                            onClick={() => onOpenSite(siteId)}
                            className="flex min-h-11 items-center rounded-full border border-hairline px-3 text-[12px] text-ink-soft transition-colors duration-200 hover:bg-cream hover:text-ink active:bg-cream-deep focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ink/40 md:min-h-0 md:px-2.5 md:py-1 md:text-[11px]"
                          >
                            {site.name}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => clearCluster(cluster.id)}
                  disabled={assignedCount === 0}
                  className="mt-auto min-h-11 self-start rounded-xl border border-hairline px-3.5 py-2 text-[13px] text-ink-soft transition-colors duration-200 hover:bg-cream hover:text-ink active:bg-cream-deep disabled:cursor-not-allowed disabled:opacity-40 md:min-h-0"
                >
                  Remove both assignments
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
