"use client";

import { useCoverage } from "./CoverageProvider";
import {
  SITE_CONTACTS,
  coverageClusterName,
  type Person,
} from "@/lib/coverage";

/**
 * VP + Procurement Team Member for a site, inherited from its coverage cluster.
 * `compact` is the map-side panel; the full form is used in the in-depth view.
 */
export default function CoverageCard({
  siteId,
  compact = false,
}: {
  siteId: string;
  compact?: boolean;
}) {
  const { coverageForSite } = useCoverage();
  const { cluster, vp, procurement } = coverageForSite(siteId);
  const contacts = SITE_CONTACTS[siteId];

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
        <PersonRow label="Vice President" person={vp} />
        <PersonRow label="Procurement" person={procurement} />
      </div>

      {!compact && contacts && (
        <div className="mt-3 grid gap-3 border-t border-hairline pt-3 sm:grid-cols-2">
          <SiteContactRow label="GA" value={contacts.ga} />
          <SiteContactRow label="PD" value={contacts.pd} />
        </div>
      )}
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
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-faint">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full border border-ink-faint"
          />
          Unassigned
        </p>
      )}
    </div>
  );
}

/** Verbatim GA / PD contact from the org chart. */
function SiteContactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-faint">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm text-ink">{value}</p>
    </div>
  );
}
