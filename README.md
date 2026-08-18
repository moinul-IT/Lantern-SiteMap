# Lantern Sites

Internal map of Lantern Community Services supportive-housing sites across NYC.
Read-only, hardcoded data, no database, no auth.

## Run locally

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000.

Other scripts:

```bash
npm run build
```

```bash
npm run lint
```

## Deploy to Netlify

The repo already contains `netlify.toml`, so no build settings need to be typed
into the dashboard.

**Option A — connect the Git repo (recommended, gives you deploy-on-push):**

1. Push this repo to GitHub.
2. In Netlify: **Add new site → Import an existing project**, pick the repo.
3. Netlify reads `netlify.toml` and installs `@netlify/plugin-nextjs`
   automatically. Leave build command and publish directory as detected.
4. **Deploy site.**

**Option B — deploy from this machine with the CLI:**

```bash
npm install -g netlify-cli
```

```bash
netlify deploy --build
```

That publishes a draft URL. When it looks right, promote to production:

```bash
netlify deploy --build --prod
```

No environment variables are required — tiles come from CARTO's keyless
endpoint and all site coordinates are baked into the source.

## Structure

```
app/
  layout.tsx        fonts (Fraunces + Inter), Leaflet CSS, metadata
  page.tsx          server component, renders the explorer
  globals.css       theme tokens, Leaflet overrides, marker/pin styles
components/
  SiteExplorer.tsx  owns all state; switches between map and list views
  SiteMap.tsx       Leaflet map, CARTO Voyager tiles, fit-bounds, fly-to
  DetailPanel.tsx   compact map-side panel with nearby sites and actions
  SiteDetailView.tsx  in-depth view (lazy-loaded) with View on map / directions
  SiteDetailSkeleton.tsx  shimmer placeholder while that chunk loads
  AllSitesView.tsx  column-per-borough list view, plus the Admin column
  SitePhoto.tsx     local photo, or branded borough-colour monogram fallback
  SearchField.tsx   search input (⌘K to focus, Esc to clear)
  SearchResults.tsx clickable results under the search field
  BoroughChips.tsx  borough filters with a travelling active fill
  ViewToggle.tsx    Map / All sites segmented control
  Legend.tsx        bottom-left borough legend with counts
  TitleBlock.tsx    eyebrow + title + animated live count
lib/
  sites.ts          the 21 sites + the admin office, frozen lat/lng, colours
  geo.ts            haversine, nearest-neighbour, distance formatting
  filter.ts         search + borough filtering
  marker.ts         borough-coloured divIcon builder
  directions.ts     Apple Maps vs Google Maps URL by platform
```

## Data notes

Coordinates were geocoded once against the full street address (Nominatim) and
pasted in as static values — nothing geocodes at runtime. Three addresses needed
correcting during that pass:

- **Lindenguild Hall** — "3859 3rd Avenue" only matched a street centroid in ZIP
  10037 (Manhattan). Spelled "Third Avenue" it resolves house-level in 10457.
- **Hunterfly Trace** — source ZIP 11223 is Gravesend; 403 Howard Ave is in
  Brownsville, **11233**.
- **Laurel Hall / Liberty Plaza** — hyphenated Queens house numbers failed
  plain-text lookup; both resolved via structured queries.
- **Rockaway Terrace** — source ZIP 11691 is Far Rockaway; 4317 Rockaway Beach
  Blvd is in Arverne, **11692**.

Also worth knowing: **Cedar Hall**'s source ZIP is 10456, but 745 Fox Street
geocodes to 10455. The house number matched exactly so the pin is correct.

Nearest-neighbour distances are computed against all 21 sites regardless of the
active filter, so a site's closest neighbour can be in another borough (Leeward
Hall → Schafer Hall, Laurel Hall → Euclid-Glenmore).

## Mobile

Designed mobile-first from ~375px up, portrait and landscape.

- `viewportFit: "cover"` in `app/layout.tsx` is what makes `env(safe-area-inset-*)`
  return real values; the `.safe-t` / `.safe-b` / `.safe-x` helpers in
  `globals.css` keep chrome off the notch and home indicator.
- The title card collapses to a compact pill (eyebrow hidden, 17px title).
- Borough chips become a single non-wrapping rail that scrolls with momentum.
- The legend collapses behind a tappable "Legend" pill.
- `DetailPanel` is one component: a bottom sheet with a grab handle and
  drag-to-dismiss below `md`, the floating right-hand panel above it.
- Tap targets are ≥44px, and the search input is 16px on mobile because anything
  smaller makes iOS Safari zoom the page on focus.
- Landscape phones put the title and controls on one row, cutting chrome from 42%
  to 29% of a 375px-tall viewport.

## The admin office

The main office (575 8th Avenue, Floor 15) is **not** part of `SITES` — it isn't
supportive housing, so including it would corrupt the site count and borough
tallies. It lives in `MAIN_OFFICE` and gets:

- a squared ink badge marker with a standing **ADMIN** label, deliberately
  unlike the borough-coloured teardrops;
- its own legend row below a divider, with a squared swatch;
- an **Admin** column in the list view;
- an `ADMIN` tag in place of a borough in both detail views.

A borough chip hides it, so each borough's pin count always equals its legend
count. It stays visible under **All**, and is searchable by "admin", "office",
its address, or its floor.

## Adding site photos

Photos are **local static files only** — this app never contacts an external
image service (no Street View, Places, Unsplash, or CDN). To add one:

1. Drop the file in `public/photos/`, e.g. `public/photos/amber-hall.jpg`.
2. Set that site's `photo` field in `lib/sites.ts`:

```ts
photo: "/photos/amber-hall.jpg",
```

Landscape crops around 720×420 look best — the panel renders them 360px wide by
132px tall, cover-fit. Any site left at `photo: null` shows a monogram block in
its borough colour instead, and if a referenced file is ever missing the
component falls back to that same block rather than a broken image.

## Known stubs

- **"Open site record"** logs to the console and shows an inline "not connected
  yet" note. Point it at the real record system when there is one.
- **All 21 `photo` fields are `null`**, so every site currently shows the
  monogram placeholder.

## Procurement coverage

Each **procurement cluster** carries one Procurement Team Member; every site in
that cluster inherits them. Sites hold no copy of their own, so changing a cluster
assignment updates every site in the same render.

Each site also shows its **Grant Analyst (GA)**. That one is genuinely per site,
not per cluster — Cluster 1 is six Ashraya and one Wei — so it is read straight
from the data rather than inherited.

Only the procurement and Grant Analyst columns of the source org chart are
modelled. The VP column and the "PD" column were reported as inaccurate and are
not represented anywhere in the app.

- `lib/coverage.ts` — people, the three procurement clusters, site→cluster
  mapping, per-site Grant Analyst, and pure lookups.
- `components/CoverageProvider.tsx` — the single place sites read coverage from,
  and **read-only on purpose**: with no backend, an editor could only change
  in-memory state that resets on refresh, which reads as "saved" when nothing was.
  Assignments change by editing the data files. **This is the backend seam:** swap
  the sources for fetched data, add mutators here, and no consumer changes.
- `components/CoverageCard.tsx` — shown on the map panel (compact) and the
  in-depth view. Renders "Unassigned" when nobody is set, and nothing at all for
  places outside the org chart (the admin office).
- `components/CoverageAdmin.tsx` — the **Coverage** view, read-only: leadership,
  a card per VP, then a card per cluster with its member and each site's GA.

> **Procurement clusters are not the map clusters.** The procurement chart groups
> all 21 sites (shelters included) into three clusters of seven; the map clusters
> group only the 17 supportive-housing sites into four. 18 of 21 sites land
> differently, so they are modelled as separate dimensions.

## Building oversight (VP + program staff)

From the "Vice President / Building Oversight" chart. Each site shows the VP over
it and its program staff roster; `lib/oversight.ts` holds the transcription.

VP is assigned **per map cluster**. `CLUSTER_VPS` maps each cluster to a single
`VpId`, so a cluster cannot hold two VPs — that is a type error, not something to
police by hand. Sites inherit their cluster's VP, so reassigning moves the whole
cluster at once and per-site drift is impossible.

| VP | Map cluster | Sites |
| --- | --- | --- |
| Sasha Callam | Cluster 1 | 4 |
| Portia Linton-Blake | Cluster 2 | 4 |
| Andrea Dogostiano | Cluster 3 | 4 |
| Jonathan Castro | Cluster 4 | 5 |
| Talisha Van Brackle — Shelter Services | — | the 4 shelters |
| Taiesha Zachary — Operations | — | the same 4 shelters |

The four shelters sit outside the cluster model (`cluster: null`) and are the one
group with two VPs, via `SHELTER_VPS`.

Program staff and the Grant Analyst stay **per site** — both genuinely vary inside
a cluster, so neither can be folded into the cluster assignment.

A site can have more than one VP. The shelters answer to both Talisha Van Brackle
(Shelter Services) and Taiesha Zachary (Operations), which is what the (TV) / (TZ)
notes on their individual roles reflect. Those four are precisely the sites
outside the supportive-housing cluster model (`cluster: null`).

The site views label the field "Vice Presidents" when there is more than one. The
Coverage view is a read-only reference: program leadership, one card per VP with
its sites, then procurement leadership and the three clusters with their member
and each site's GA.

Role initials are expanded in the in-depth view: SPD Senior Program Director,
PD Program Director, APD Assistant Program Director, PA Program Assistant,
DPO Director of Program Operations. DSS and Admin are still shown as initials
because nobody has expanded them yet.

Three rosters are shared across two buildings each (Cedar/Schafer,
Lindenguild/Silverleaf, Amber/Leeward). Those sites show a "Program" field naming
the pair, and the chart's per-building notes are kept on the individual roles.
Hudson Bay appears on the chart as "Stillwell Avenue", shown as "Also known as".

Vacancies are rendered in italic grey rather than hidden — 12 of the roles on the
chart are vacant.

The **Coverage** view manages both dimensions: VP portfolios (reassign one site,
or hand a whole portfolio to another VP) and procurement clusters.
