# Lantern Maps

Internal map of Lantern Community Services supportive-housing sites across NYC.
Read-only, hardcoded data, no database, no auth. Installable as a PWA.

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
  layout.tsx        fonts (Fraunces + Inter), Leaflet CSS, metadata, PWA chrome
  page.tsx          server component, renders the explorer
  manifest.ts       web app manifest, served at /manifest.webmanifest
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
  DirectionsButton.tsx  directions split button + Apple/Google chooser
  PwaChrome.tsx     mounts the three PWA pills once, in the root layout
  ServiceWorkerRegistrar.tsx  registers /sw.js, offers a reload on update
  InstallPrompt.tsx add-to-home-screen pill (+ iOS Safari instructions)
  OfflineBanner.tsx connectivity banner, via next/offline
lib/
  sites.ts          the 21 sites + the admin office, frozen lat/lng, colours
  geo.ts            haversine, nearest-neighbour, distance formatting
  filter.ts         search + borough filtering
  marker.ts         borough-coloured divIcon builder
  directions.ts     Apple/Google directions URLs + the remembered choice
public/
  sw.js             service worker: app shell, static assets, map tiles
  offline.html      standalone fallback for a cold launch with no network
  icons/            manifest icons (SVG sources + rendered PNGs)
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

## Directions

Every site opens in **Apple Maps or Google Maps**, the user's choice, from both
the map panel and the in-depth view.

- The control is a split button: the main half opens whichever provider is
  already chosen (one tap, the common case), and the chevron expands a chooser.
  Picking from the chooser both opens that provider *and* remembers it, so
  switching costs one tap now and none afterwards.
- Before anyone chooses, the provider is guessed from the platform — Apple on
  iPhone/iPad/Mac, Google elsewhere — so the first tap is right most of the time
  with no settings trip. That was the app's original behaviour, and it is now
  just the default rather than the only option.
- The choice lives in `lib/directions.ts` as a small observable store, not in
  component state, because it outlives any one panel: the map panel and the
  in-depth view can both be mounted, and picking Google in one must not leave
  the other still saying Apple. Both read it through `useSyncExternalStore`.
  Persisted in `localStorage`, with an in-memory fallback so the choice still
  holds for the session when storage is unavailable (private browsing).
- URLs carry coordinates rather than addresses (`?daddr=` for Apple,
  `?api=1&destination=` for Google), which sidesteps the geocoding
  discrepancies noted under **Data notes**.

Two layout notes, both load-bearing:

- The chooser expands the row **inline** rather than floating over it, because
  `DetailPanel` is `overflow-hidden` (that is what rounds its corners) and an
  absolutely positioned popover would be clipped at the panel edge.
- Its two options are **stacked**, not side by side. A flex item sizes to its
  max-content, which `flex-wrap` does not reduce, so a row of two pills would
  make the control wider than its own button and squeeze the neighbouring
  button into wrapping. Stacked, the widest option is narrower than the button
  row, so opening the chooser leaves the row's width untouched.

## Progressive web app

Installs as **Lantern Maps** — its own home-screen icon, no browser chrome, and
the sites available with no connection.

- `app/manifest.ts` is the manifest (Next serves it at `/manifest.webmanifest`
  and injects the `<link>`; nothing in `layout.tsx` references it). `display:
  standalone`, `orientation: any` because the explorer is built for both, and
  `background_color` is `--color-cream` so the splash screen is the same paper
  the map sits on rather than a white flash.
- `metadata.appleWebApp` in `app/layout.tsx` covers iOS, which reads none of the
  manifest. `statusBarStyle: "black-translucent"` runs the map under the status
  bar, which the existing safe-area insets already account for.
- **Icons** live in `public/icons/`. `icon.svg` and `maskable.svg` are the
  sources; the PNGs beside them are rendered from those two files. The maskable
  pair is a separate manifest entry rather than a `purpose` on the standard
  icons, because a launcher that crops to a circle would clip the mark — in
  `maskable.svg` the lantern is scaled to 0.75 to sit inside the safe circle,
  and the background is full-bleed with no corner radius of its own.

### What works offline

`public/sw.js` is hand-written — no build step, no generated file to keep in
sync. Three caches, each with the strategy that request deserves:

| Cache | Contents | Strategy |
| --- | --- | --- |
| `shell` | the `/` document, `offline.html` | Network-first |
| `static` | `/_next/static/**` and other same-origin assets | Cache-first when hashed, else stale-while-revalidate |
| `tiles` | CARTO basemap tiles | Cache-first, LRU-capped at 500 |

So after one online visit: the app opens with no network, all 21 sites and the
coverage data are there (they are baked into the bundle, not fetched), and the
map draws for any area already looked at. Tiles for an area never visited stay
blank — nothing can be done about that without shipping a tile pack.

The shell is deliberately **network-first**, not cache-first: the HTML carries
the hashed script URLs for a deploy, and a stale copy would ask for chunks that
no longer exist.

Three things it never touches: non-`GET` requests (which includes the `HEAD`
probe `next/offline` uses to test connectivity — answering that from cache would
report "online" with the network down), RSC payloads (they vary by request
header and are not interchangeable with the HTML at the same URL), and range
requests. It also does not register at all in development, where chunk URLs are
unhashed and cache-first would pin stale code across an edit.

Bump `VERSION` in `sw.js` to retire every cache on the next activation.

### Update and install flow

- A new worker never activates on its own — that would swap the JS chunks out
  from under a running page. `ServiceWorkerRegistrar` shows "A new version is
  ready" and applies it on the reload.
- `InstallPrompt` takes two paths, because there is no single cross-browser one:
  Chromium's `beforeinstallprompt` is deferred and replayed from a real button
  (one tap); iOS Safari exposes no install API at all, so the only honest thing
  to offer is the Share → Add to Home Screen instruction. Anywhere else neither
  applies and nothing is shown. "Not now" is remembered in `localStorage`.
- `OfflineBanner` unions two signals, because each covers the other's blind
  spot. `useOffline` from `next/offline` (`experimental.useOffline` in
  `next.config.ts`) also counts a *failed request* as offline, catching wifi with
  no route out — where `navigator.onLine` still cheerfully reports true, and
  exactly the case that leaves the map half-drawn. `navigator.onLine` in turn
  catches launching while already offline, which the hook cannot: it starts at
  `false`, and a page served entirely from the service worker fires no `offline`
  event and fails no request for it to notice.

`PwaChrome` mounts all three once in the root layout. Its layering is fiddlier
than it looks: SiteExplorer's floating chrome wrapper is `z-600` *and*
positioned, so it is a stacking context — everything inside it, including the
phone detail sheet's own `z-800`, collapses to that single 600 as far as
anything outside is concerned. There is no slot between the legend and the sheet
to take from the layout, so the pills sit **below** the lot at `z-550`; above
it, a transient pill covers the sheet's action row and swallows the taps meant
for it. On phones they also sit `bottom-16` rather than flush, clearing the
legend-and-zoom band instead of fighting it for the same space.

Relatedly, `globals.css` drops Leaflet's control containers from their default
`z-index: 1000` to 500. At 1000 the zoom buttons painted over the phone detail
sheet and intercepted taps on the controls inside it. 500 keeps them above the
whole map (`.leaflet-map-pane` is itself a `.leaflet-pane` at 400 and a stacking
context, so every tile/marker/popup pane nested in it stays below) while sitting
under the app's chrome.

### Regenerating the icons

Edit `icon.svg` / `maskable.svg`, then re-render the four PNGs. Any SVG
rasteriser will do; this is the no-dependency version, using the headless Chrome
already on most machines. The SVG is wrapped in a page sized exactly to the
target so the render fills the frame:

```bash
for spec in icon:192 icon:512 maskable:192 maskable:512; do
  name=${spec%%:*}; size=${spec#*:}
  { echo "<style>html,body{margin:0;width:${size}px;height:${size}px}"
    echo "svg{display:block;width:${size}px;height:${size}px}</style>"
    cat "public/icons/$name.svg"
  } > /tmp/$name-$size.html
  chrome --headless --hide-scrollbars --force-device-scale-factor=1 \
    --screenshot="public/icons/$name-$size.png" --window-size=$size,$size \
    "file:///tmp/$name-$size.html"
done
```

One trap: use a real **headless shell** binary (Playwright's
`chromium_headless_shell`, or `chrome --headless=old`). With a windowed Chrome
build `--window-size` sets the *outer* window, so the viewport comes out ~80px
shorter and the icon is clipped along the bottom edge.

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
