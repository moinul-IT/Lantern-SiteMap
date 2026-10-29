"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useContent } from "@/components/ContentProvider";
import { CONTENT_ENDPOINT } from "@/components/ContentProvider";
import type { ContentSnapshot } from "@/lib/content/types";
import type { Borough, ClusterId, Site, SiteType } from "@/lib/sites";
import { BOROUGHS, CLUSTERS } from "@/lib/sites";
import type { StaffEntry, StaffRole, Vp } from "@/lib/oversight";
import { STAFF_ROLE_LABELS } from "@/lib/oversight";
import type { CoverageClusterId } from "@/lib/coverage";

const STAFF_ROLES = Object.keys(STAFF_ROLE_LABELS) as StaffRole[];
const SITE_TYPES: SiteType[] = ["Supportive Housing", "Shelter"];
const COVERAGE_CLUSTERS: CoverageClusterId[] = [1, 2, 3];

type Me = { signedIn: boolean; name: string | null; canEdit: boolean };

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; version: number }
  | { kind: "conflict" }
  | { kind: "error"; message: string; details?: string[] };

const field =
  "h-10 w-full rounded-lg border border-hairline bg-paper px-3 text-[13px] text-ink outline-none focus:border-ink-faint";
const label = "eyebrow block";
const card = "rounded-2xl border border-hairline bg-paper p-4 md:p-5";

/** Immutably replace one site in the draft. */
function withSite(draft: ContentSnapshot, siteId: string, patch: Partial<Site>) {
  return {
    ...draft,
    sites: draft.sites.map((s) => (s.id === siteId ? { ...s, ...patch } : s)),
  };
}

function withStaff(draft: ContentSnapshot, siteId: string, staff: StaffEntry[]) {
  const team = draft.siteTeams[siteId];
  return {
    ...draft,
    siteTeams: { ...draft.siteTeams, [siteId]: { ...(team ?? {}), staff } },
  };
}

export default function ManageApp() {
  const content = useContent();
  const [me, setMe] = useState<Me | null>(null);
  const [draft, setDraft] = useState<ContentSnapshot | null>(null);
  const [dirty, setDirty] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });

  // Who is signed in, and may they save. The real gate is the API's; this is
  // so the editor can say why it is not offering to save.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (!cancelled) {
          setMe(
            body ?? { signedIn: false, name: null, canEdit: false },
          );
        }
      })
      .catch(() => {
        if (!cancelled) setMe({ signedIn: false, name: null, canEdit: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Take the live content as the starting draft, and keep taking it until the
   * first edit. ContentProvider hydrates a moment after mount, so an editor
   * seeded only on first render would be editing the build's content rather
   * than what is published. Once dirty, incoming updates are left alone — they
   * are handled as a save conflict instead of silently discarding typing.
   *
   * Adjusted during render rather than in an effect: this is deriving state
   * from a changed input, which React handles in the same pass instead of
   * painting the stale draft first and correcting it.
   */
  const [syncedFrom, setSyncedFrom] = useState<ContentSnapshot | null>(null);
  if (!dirty && content.snapshot !== syncedFrom) {
    setSyncedFrom(content.snapshot);
    setDraft(content.snapshot);
    if (selectedId === null) {
      setSelectedId(content.snapshot.sites[0]?.id ?? null);
    }
  }

  const edit = useCallback((next: ContentSnapshot) => {
    setDraft(next);
    setDirty(true);
    setSave({ kind: "idle" });
  }, []);

  const selected = useMemo(
    () => draft?.sites.find((s) => s.id === selectedId) ?? null,
    [draft, selectedId],
  );

  const onSave = useCallback(async () => {
    if (!draft) return;
    setSave({ kind: "saving" });
    try {
      const response = await fetch(CONTENT_ENDPOINT, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot: draft, baseVersion: draft.version }),
      });

      if (response.status === 409) {
        setSave({ kind: "conflict" });
        return;
      }
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setSave({
          kind: "error",
          message: body?.error ?? `save failed (${response.status})`,
          details: body?.details,
        });
        return;
      }

      const body = await response.json();
      setDraft((d) => (d ? { ...d, version: body.version } : d));
      setDirty(false);
      setSave({ kind: "saved", version: body.version });
    } catch {
      setSave({ kind: "error", message: "could not reach the content service" });
    }
  }, [draft]);

  if (!draft) {
    return <p className="p-8 text-sm text-ink-soft">Loading content…</p>;
  }

  const canEdit = me?.canEdit ?? false;

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-5">
        <div>
          <p className="eyebrow">Lantern Maps</p>
          <h1 className="font-display text-[26px] leading-none font-normal text-ink">
            Content manager
          </h1>
          <p className="mt-2 font-mono text-[11px] text-ink-faint">
            Version {draft.version}
            {draft.updatedAt ? ` · last saved ${draft.updatedAt.slice(0, 16).replace("T", " ")}` : " · never saved"}
            {dirty ? " · unsaved changes" : ""}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SaveStatus state={save} />
          {me && !me.signedIn && (
            <a
              href="/.auth/login/aad?post_login_redirect_uri=/manage"
              className="flex h-11 items-center rounded-xl bg-ink px-4 text-[13px] text-cream"
            >
              Sign in
            </a>
          )}
          {me?.signedIn && !canEdit && (
            <p className="max-w-[22rem] text-[13px] text-ink-soft">
              Signed in as {me.name}, but without the content manager role, so
              saving is not available.
            </p>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={onSave}
              disabled={!dirty || save.kind === "saving"}
              className="h-11 rounded-xl bg-ink px-5 text-[13px] text-cream transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {save.kind === "saving" ? "Saving…" : "Save changes"}
            </button>
          )}
        </div>
      </header>

      {save.kind === "conflict" && (
        <p role="alert" className="mt-4 rounded-xl border border-bronx/40 bg-bronx-soft p-4 text-[13px] text-ink">
          Someone else saved while this was open, so nothing here was written —
          their change is still intact. Reload to pick up their version, then
          reapply these edits.
        </p>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="flex flex-col gap-2">
          <p className={label}>Sites</p>
          <div className="flex max-h-[70vh] flex-col gap-1 overflow-y-auto pr-1">
            {draft.sites.map((site) => (
              <button
                key={site.id}
                type="button"
                onClick={() => setSelectedId(site.id)}
                className={[
                  "rounded-lg px-3 py-2 text-left text-[13px] transition-colors duration-150",
                  site.id === selectedId
                    ? "bg-ink text-cream"
                    : "text-ink-soft hover:bg-cream-deep hover:text-ink",
                ].join(" ")}
              >
                {site.name}
              </button>
            ))}
          </div>
        </aside>

        <div className="flex flex-col gap-5">
          {selected && (
            <>
              <SiteFields
                site={selected}
                disabled={!canEdit}
                onChange={(patch) => edit(withSite(draft, selected.id, patch))}
              />
              <RosterEditor
                staff={draft.siteTeams[selected.id]?.staff ?? []}
                disabled={!canEdit}
                onChange={(staff) => edit(withStaff(draft, selected.id, staff))}
              />
              <SiteCoverage
                draft={draft}
                siteId={selected.id}
                disabled={!canEdit}
                onChange={edit}
              />
            </>
          )}

          <VpAssignments draft={draft} disabled={!canEdit} onChange={edit} />
        </div>
      </div>
    </div>
  );
}

function SaveStatus({ state }: { state: SaveState }) {
  if (state.kind === "saved") {
    return <p className="text-[13px] text-manhattan">Saved as version {state.version}</p>;
  }
  if (state.kind === "error") {
    return (
      <div className="max-w-[26rem] text-[13px] text-bronx">
        <p>{state.message}</p>
        {state.details?.length ? (
          <ul className="mt-1 list-inside list-disc font-mono text-[11px]">
            {state.details.slice(0, 5).map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }
  return null;
}

function SiteFields({
  site,
  disabled,
  onChange,
}: {
  site: Site;
  disabled: boolean;
  onChange: (patch: Partial<Site>) => void;
}) {
  return (
    <section className={card}>
      <p className={label}>Site information</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Labelled text="Name">
          <input className={field} value={site.name} disabled={disabled}
            onChange={(e) => onChange({ name: e.target.value })} />
        </Labelled>
        <Labelled text="Address">
          <input className={field} value={site.address} disabled={disabled}
            onChange={(e) => onChange({ address: e.target.value })} />
        </Labelled>
        <Labelled text="City">
          <input className={field} value={site.city} disabled={disabled}
            onChange={(e) => onChange({ city: e.target.value })} />
        </Labelled>
        <Labelled text="ZIP">
          <input className={field} value={site.zip} disabled={disabled}
            onChange={(e) => onChange({ zip: e.target.value })} />
        </Labelled>
        <Labelled text="Borough">
          <select className={field} value={site.borough} disabled={disabled}
            onChange={(e) => onChange({ borough: e.target.value as Borough })}>
            {BOROUGHS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </Labelled>
        <Labelled text="Type">
          <select className={field} value={site.type} disabled={disabled}
            onChange={(e) => onChange({ type: e.target.value as SiteType })}>
            {SITE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Labelled>
        <Labelled text="Map cluster">
          <select className={field} value={site.cluster ?? ""} disabled={disabled}
            onChange={(e) => onChange({ cluster: e.target.value === "" ? null : (Number(e.target.value) as ClusterId) })}>
            <option value="">None (shelter)</option>
            {CLUSTERS.map((c) => <option key={c} value={c}>Cluster {c}</option>)}
          </select>
        </Labelled>
        <Labelled text="Photo path">
          <input className={field} value={site.photo ?? ""} disabled={disabled}
            placeholder="/photos/amber-hall.jpg"
            onChange={(e) => onChange({ photo: e.target.value || null })} />
        </Labelled>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-[13px] text-ink-soft">
          Map position
        </summary>
        <p className="mt-2 text-[12px] leading-snug text-ink-faint">
          These were geocoded once against the full street address and corrected
          by hand where the lookup was wrong. Changing an address above does{" "}
          <em>not</em> move the pin — set the coordinates here if the building
          moves, and check the pin afterwards.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Labelled text="Latitude">
            <input className={field} type="number" step="0.000001" value={site.lat} disabled={disabled}
              onChange={(e) => onChange({ lat: Number(e.target.value) })} />
          </Labelled>
          <Labelled text="Longitude">
            <input className={field} type="number" step="0.000001" value={site.lng} disabled={disabled}
              onChange={(e) => onChange({ lng: Number(e.target.value) })} />
          </Labelled>
        </div>
      </details>
    </section>
  );
}

function RosterEditor({
  staff,
  disabled,
  onChange,
}: {
  staff: StaffEntry[];
  disabled: boolean;
  onChange: (staff: StaffEntry[]) => void;
}) {
  const set = (i: number, patch: Partial<StaffEntry>) =>
    onChange(staff.map((e, n) => (n === i ? { ...e, ...patch } : e)));
  const move = (i: number, by: number) => {
    const next = [...staff];
    const target = i + by;
    if (target < 0 || target >= next.length) return;
    [next[i], next[target]] = [next[target], next[i]];
    onChange(next);
  };

  return (
    <section className={card}>
      <div className="flex items-center justify-between">
        <p className={label}>Program staff</p>
        <button type="button" disabled={disabled}
          onClick={() => onChange([...staff, { role: "PD", name: "Vacant" }])}
          className="h-9 rounded-full border border-hairline px-3.5 text-[13px] text-ink-soft disabled:opacity-40">
          Add role
        </button>
      </div>

      {staff.length === 0 && (
        <p className="mt-3 text-[13px] text-ink-faint">No staff listed.</p>
      )}

      <ul className="mt-3 flex flex-col gap-2">
        {staff.map((entry, i) => (
          <li key={i} className="grid items-center gap-2 rounded-xl border border-hairline p-2 sm:grid-cols-[150px_1fr_1fr_auto]">
            <select className={field} value={entry.role} disabled={disabled}
              onChange={(e) => set(i, { role: e.target.value as StaffRole })}>
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>{STAFF_ROLE_LABELS[r]}</option>
              ))}
            </select>
            <input className={field} value={entry.name} disabled={disabled} placeholder="Name, or Vacant"
              onChange={(e) => set(i, { name: e.target.value })} />
            <input className={field} value={entry.email ?? ""} disabled={disabled} placeholder="Work email (optional)"
              onChange={(e) => set(i, { email: e.target.value || undefined })} />
            <div className="flex items-center gap-1">
              <IconButton label="Move up" disabled={disabled} onClick={() => move(i, -1)}>↑</IconButton>
              <IconButton label="Move down" disabled={disabled} onClick={() => move(i, 1)}>↓</IconButton>
              <IconButton label="Remove" disabled={disabled}
                onClick={() => onChange(staff.filter((_, n) => n !== i))}>✕</IconButton>
            </div>
            <input className={`${field} sm:col-span-4`} value={entry.note ?? ""} disabled={disabled}
              placeholder="Note from the chart, e.g. which building this role covers (optional)"
              onChange={(e) => set(i, { note: e.target.value || undefined })} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SiteCoverage({
  draft,
  siteId,
  disabled,
  onChange,
}: {
  draft: ContentSnapshot;
  siteId: string;
  disabled: boolean;
  onChange: (next: ContentSnapshot) => void;
}) {
  return (
    <section className={card}>
      <p className={label}>Coverage for this site</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Labelled text="Grant Analyst">
          <input className={field} value={draft.siteGrantAnalyst[siteId] ?? ""} disabled={disabled}
            onChange={(e) =>
              onChange({
                ...draft,
                siteGrantAnalyst: { ...draft.siteGrantAnalyst, [siteId]: e.target.value },
              })
            } />
        </Labelled>
        <Labelled text="Procurement cluster">
          <select className={field} value={draft.siteCoverageCluster[siteId] ?? ""} disabled={disabled}
            onChange={(e) => {
              const next = { ...draft.siteCoverageCluster };
              if (e.target.value === "") delete next[siteId];
              else next[siteId] = Number(e.target.value) as CoverageClusterId;
              onChange({ ...draft, siteCoverageCluster: next });
            }}>
            <option value="">None</option>
            {COVERAGE_CLUSTERS.map((c) => (
              <option key={c} value={c}>Procurement Cluster {c}</option>
            ))}
          </select>
        </Labelled>
        <Labelled text="Contract">
          <select className={field} value={draft.siteContracts[siteId] ?? ""} disabled={disabled}
            onChange={(e) => {
              const next = { ...draft.siteContracts };
              if (e.target.value === "") delete next[siteId];
              else next[siteId] = e.target.value as "DOHMH" | "HASA";
              onChange({ ...draft, siteContracts: next });
            }}>
            <option value="">None</option>
            <option value="DOHMH">DOHMH</option>
            <option value="HASA">HASA</option>
          </select>
        </Labelled>
      </div>
    </section>
  );
}

function VpAssignments({
  draft,
  disabled,
  onChange,
}: {
  draft: ContentSnapshot;
  disabled: boolean;
  onChange: (next: ContentSnapshot) => void;
}) {
  const setVp = (i: number, patch: Partial<Vp>) =>
    onChange({ ...draft, vps: draft.vps.map((v, n) => (n === i ? { ...v, ...patch } : v)) });

  return (
    <section className={card}>
      <p className={label}>Vice Presidents</p>
      <p className="mt-1 text-[12px] text-ink-faint">
        A VP is assigned to a cluster, and every site in that cluster inherits
        them — so one change here moves the whole cluster at once.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {CLUSTERS.map((cluster) => (
          <Labelled key={cluster} text={`Cluster ${cluster}`}>
            <select className={field} value={draft.clusterVps[cluster] ?? ""} disabled={disabled}
              onChange={(e) =>
                onChange({
                  ...draft,
                  clusterVps: { ...draft.clusterVps, [cluster]: e.target.value },
                })
              }>
              {draft.vps.map((vp) => (
                <option key={vp.id} value={vp.id}>{vp.name}</option>
              ))}
            </select>
          </Labelled>
        ))}
      </div>

      <p className={`${label} mt-5`}>Names and titles</p>
      <ul className="mt-2 flex flex-col gap-2">
        {draft.vps.map((vp, i) => (
          <li key={vp.id} className="grid gap-2 sm:grid-cols-2">
            <input className={field} value={vp.name} disabled={disabled}
              onChange={(e) => setVp(i, { name: e.target.value })} />
            <input className={field} value={vp.title} disabled={disabled}
              onChange={(e) => setVp(i, { title: e.target.value })} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Labelled({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={label}>{text}</span>
      {children}
    </label>
  );
}

function IconButton({
  label: aria,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" aria-label={aria} disabled={disabled} onClick={onClick}
      className="grid size-9 shrink-0 place-items-center rounded-lg border border-hairline text-ink-soft hover:text-ink disabled:opacity-40">
      {children}
    </button>
  );
}
