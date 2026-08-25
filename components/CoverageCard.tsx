"use client";

import { useCoverage } from "./CoverageProvider";
import { coverageClusterName, type Person } from "@/lib/coverage";
import { STAFF_ROLE_LABELS, type StaffEntry } from "@/lib/oversight";

/**
 * Everything assigned to a site: the VP over it, its program staff, and its
 * procurement coverage. `compact` is the map-side panel — it shows the VP and
 * the site's lead roles only; the in-depth view shows the whole roster.
 */
export default function CoverageCard({
  siteId,
  compact = false,
}: {
  siteId: string;
  compact?: boolean;
}) {
  const { coverageForSite } = useCoverage();
  const { cluster, procurement, grantAnalyst, vps, team, contract } =
    coverageForSite(siteId);

  // The admin office sits outside both charts.
  if (!team && cluster === null) return null;

  const staff = team?.staff ?? [];
  const leadRoles = staff.filter((s) => s.role === "PD" || s.role === "SPD");
  const shown = compact ? leadRoles : staff;

  return (
    <>
      <div className="mt-4 border-t border-hairline pt-4 md:mt-5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="eyebrow">Oversight</p>
          {contract && (
            <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-faint">
              {contract}
            </p>
          )}
        </div>

        <div
          className={
            compact ? "mt-2.5 space-y-2.5" : "mt-3 grid gap-3 sm:grid-cols-2"
          }
        >
          <Field label={vps.length > 1 ? "Vice Presidents" : "Vice President"}>
            {vps.length > 0 ? (
              vps.map((vp, index) => (
                <div key={vp.id} className={index > 0 ? "mt-1.5" : undefined}>
                  <Name>{vp.name}</Name>
                  <Sub>
                    {vp.department
                      ? `${vp.title} · ${vp.department}`
                      : vp.title}
                  </Sub>
                </div>
              ))
            ) : (
              <Unassigned />
            )}
          </Field>

          {team?.groupLabel && (
            <Field label="Program">
              <Name>{team.groupLabel}</Name>
              <Sub>Roster shared across both buildings</Sub>
            </Field>
          )}

          {team?.alsoKnownAs && (
            <Field label="Also known as">
              <Name>{team.alsoKnownAs}</Name>
              <Sub>Name used on the org chart</Sub>
            </Field>
          )}
        </div>

        {shown.length > 0 && (
          <ul
            className={
              compact
                ? "mt-2.5 space-y-1"
                : "mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-2"
            }
          >
            {shown.map((entry, index) => (
              <StaffRow
                key={`${entry.role}-${index}`}
                entry={entry}
                compact={compact}
              />
            ))}
          </ul>
        )}
      </div>

      {cluster !== null && (
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
            <Field label="Procurement">
              {procurement ? (
                <>
                  <Name>{procurement.name}</Name>
                  <Sub>{procurement.title}</Sub>
                  <Contact person={procurement} />
                </>
              ) : (
                <Unassigned />
              )}
            </Field>
            <Field label="Grant Analyst">
              {grantAnalyst ? <Name>{grantAnalyst}</Name> : <Unassigned />}
            </Field>
          </div>
        </div>
      )}
    </>
  );
}

function StaffRow({ entry, compact }: { entry: StaffEntry; compact: boolean }) {
  const vacant = entry.name === "Vacant";
  const fullRole = STAFF_ROLE_LABELS[entry.role];
  const name = (
    <>
      {entry.name}
      {entry.note && <span className="text-ink-faint"> ({entry.note})</span>}
    </>
  );

  // Compact keeps the initials — the sheet has no room for full titles.
  if (compact) {
    return (
      <li className="flex items-baseline gap-2">
        <span
          title={fullRole}
          className="w-10 shrink-0 font-mono text-[10px] tracking-[0.08em] uppercase text-ink-faint"
        >
          {entry.role}
        </span>
        <span
          className={`min-w-0 flex-1 truncate text-[13px] ${vacant ? "text-ink-faint italic" : "text-ink"}`}
        >
          {name}
        </span>
      </li>
    );
  }

  return (
    <li className="min-w-0">
      <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-faint">
        {fullRole}
      </p>
      <p
        className={`truncate text-sm ${vacant ? "text-ink-faint italic" : "text-ink"}`}
      >
        {name}
      </p>
      {entry.email && (
        <a
          href={`mailto:${entry.email}`}
          className="block truncate font-mono text-[11px] text-ink-faint underline decoration-hairline underline-offset-2 transition-colors duration-200 hover:text-ink"
        >
          {entry.email}
        </a>
      )}
    </li>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-faint">
        {label}
      </p>
      {children}
    </div>
  );
}

function Name({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-0.5 truncate text-sm font-medium text-ink">{children}</p>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return <p className="truncate text-[13px] text-ink-soft">{children}</p>;
}

function Contact({ person }: { person: Person }) {
  return (
    <>
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
