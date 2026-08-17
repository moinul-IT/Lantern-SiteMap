"use client";

import { useCoverage } from "./CoverageProvider";
import { coverageClusterName, type Person } from "@/lib/coverage";

/**
 * Procurement Team Member (inherited from the site's procurement cluster) and
 * Grant Analyst (per site). `compact` is the map-side panel; the fuller form is
 * used in the in-depth view.
 */
export default function CoverageCard({
  siteId,
  compact = false,
}: {
  siteId: string;
  compact?: boolean;
}) {
  const { coverageForSite } = useCoverage();
  const { cluster, procurement, grantAnalyst } = coverageForSite(siteId);

  // The admin office and anything outside the org chart has no coverage.
  if (cluster === null) return null;

  return (
    <div className="mt-4 border-t border-hairline pt-4 md:mt-5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="eyebrow">Procurement coverage</p>
        <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-faint">
          {coverageClusterName(cluster)}
        </p>
      </div>

      <div
        className={
          compact ? "mt-2.5 space-y-2.5" : "mt-3 grid gap-3 sm:grid-cols-2"
        }
      >
        <PersonRow label="Procurement" person={procurement} />
        <PlainRow label="Grant Analyst" value={grantAnalyst} />
      </div>
    </div>
  );
}

function PersonRow({
  label,
  person,
}: {
  label: string;
  person: Person | null;
}) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-faint">
        {label}
      </p>
      {person ? (
        <>
          <p className="mt-0.5 truncate text-sm font-medium text-ink">
            {person.name}
          </p>
          <p className="truncate text-[13px] text-ink-soft">{person.title}</p>
          {person.email && (
            <a
              href={`mailto:${person.email}`}
              className="mt-0.5 block truncate font-mono text-[11px] text-ink-soft underline decoration-hairline underline-offset-2 hover:text-ink"
            >
              {person.email}
            </a>
          )}
          {person.phone && (
            <a
              href={`tel:${person.phone}`}
              className="block truncate font-mono text-[11px] text-ink-soft hover:text-ink"
            >
              {person.phone}
            </a>
          )}
        </>
      ) : (
        <Unassigned />
      )}
    </div>
  );
}

function PlainRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-faint">
        {label}
      </p>
      {value ? (
        <p className="mt-0.5 truncate text-sm font-medium text-ink">{value}</p>
      ) : (
        <Unassigned />
      )}
    </div>
  );
}

function Unassigned() {
  return (
    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-faint">
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full border border-ink-faint"
      />
      Unassigned
    </p>
  );
}
