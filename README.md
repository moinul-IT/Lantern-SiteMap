# Lantern Maps

Internal map of Lantern Community Services supportive-housing sites across NYC.
Content is editable in the app by signed-in content managers and stored in
Azure. Installable as a PWA, and the map still works offline.

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

```bash
npm test
```

`npm test` covers the server's own logic — chunked storage, the concurrency
rule, the role gate and the snapshot validator — against a stand-in for Table
Storage, so it needs no Azure account.

### Running the editor locally

`/manage` needs a signed-in content manager, and there is no Entra ID in front
of a local `next dev`. In development the app trusts an
`x-ms-client-principal` header, which is what Azure injects after sign-in, so
you can mint one yourself:

```bash
node -e 'console.log(Buffer.from(JSON.stringify({auth_typ:"aad",role_typ:"roles",name_typ:"preferred_username",claims:[{typ:"preferred_username",val:"you@lanterncommunity.org"},{typ:"roles",val:"contentmanager"}]})).toString("base64"))'
```

Send it as `x-ms-client-principal` with any browser extension that sets request
headers. In production that header is only believed when something in front of
the server is known to be authenticating — see **Why the header can be trusted**
below.

By default the app expects a storage account. To run without one:

```bash
CONTENT_STORE=memory npm run dev
```

Saves then live in the server process and vanish when it restarts, which is why
that setting is refused in production unless `ALLOW_MEMORY_STORE=1` says so
deliberately.

## Deploy

The site is a **Next.js server** — not a static export — deployed to one Azure
**App Service** (Linux, Node 22). The server renders the current content into
each page, serves the content API, and checks who is signed in, all in one
process. The management tool ships inside the same app at `/manage`, so there is
one thing to deploy and one place content is edited.

It is hosted rather than exported because people edit it. An exported build
freezes the content as it stood when the build ran: a correction would not
appear until someone redeployed. Here the next page load already has it.

**Full setup, verification and troubleshooting: [docs/azure.md](docs/azure.md).**
The short version:

### What to create in Azure, once

1. **Storage account** → a Table called `content` (the app creates it on first
   save if it is missing). Standard LRS is ample: the whole document is about
   35KB.
2. **App Service** → Linux, Node 22 LTS, B1. Turn **Always On** on.
3. **Startup command** → `node server.js`, under Settings → Configuration.
   This one is not optional. The deployed folder carries a `package.json` whose
   `start` script is `next start`, which is wrong for a standalone build, and
   App Service runs `npm start` by default. Without the startup command the
   site will not boot.
4. **Environment variables** → add `AZURE_STORAGE_CONNECTION_STRING`, the
   storage account's connection string. It is the one secret, and it belongs
   here rather than in the repo.
5. **Authentication** ("Easy Auth") → add Microsoft Entra ID as the identity
   provider, and set unauthenticated requests to be **allowed** rather than
   redirected: the map itself is open to everyone who can reach the site, and
   only `/manage` and saving require signing in. Nothing to configure in code;
   `/.auth/login/aad` exists as soon as authentication does.
6. **App roles** → in the app registration, create an app role with the value
   `contentmanager`, spelled exactly, and assign it to each content manager.
   Everyone else can read the site and will be refused the editor.
7. **Publish profile** → Get publish profile on the App Service, and paste the
   file into the repository secret `AZURE_WEBAPP_PUBLISH_PROFILE`.

### Deploying

Push to `main`. The workflow at `.github/workflows/azure-app-service.yml` runs
lint, typecheck and the tests, builds the standalone server, copies `public/`
and `.next/static` into it (the standalone output leaves them out on purpose,
and the site loads without its CSS, icons and service worker if they are
missing), and uploads the result.

### Why the header can be trusted

Easy Auth authenticates at the edge and passes the result down in an
`x-ms-client-principal` header, stripping any copy the caller sent. That is the
only reason the app can believe it without verifying a token — and it holds
only while the app is unreachable except through App Service.

So the server refuses to believe the header at all unless it can tell something
is authenticating in front of it: `WEBSITE_AUTH_ENABLED`, which App Service
injects as a read-only setting when authentication is on, or
`TRUST_AUTH_HEADER=1` set by hand for another host that does the same job. A
deployment that forgets to turn authentication on fails closed — nobody can
sign in or save — rather than open.

### Moving off Netlify

This is the branch that stops being a static site, so the Netlify deploy cannot
serve it: `netlify.toml` and its `out/` directory are gone. Cut over in this
order, or the site goes dark in between:

1. Deploy to App Service and check it on its `azurewebsites.net` address.
2. Add the custom domain to App Service and let it issue a certificate.
3. Point DNS at App Service.
4. Merge this branch to `main` and delete the Netlify site.

Until step 4, `main` still builds the static export and Netlify keeps serving
it, unchanged.

## Structure

```
app/
  layout.tsx        fonts (Fraunces + Inter), map CSS, metadata, PWA chrome
  page.tsx          server component, renders the explorer
  manifest.ts       web app manifest, served at /manifest.webmanifest
  globals.css       theme tokens, Leaflet overrides, marker/pin styles
lib/
  basemap-style.ts  MapLibre vector style for the basemap
components/
  SiteExplorer.tsx  owns all state; switches between map and list views
  SiteMap.tsx       Leaflet map, vector basemap, fit-bounds, fly-to
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
  ContentProvider.tsx   the one place every view reads content from
  manage/ManageApp.tsx  the content manager's editor, served at /manage
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
  server/           server-only; never reaches the browser
    content-store.ts  Table Storage: one chunked, versioned document
    validate.ts       refuses content that would break the site
    principal.ts      who is signed in, from the Easy Auth header
    load-content.ts   the snapshot a page is rendered with
app/api/
  content/route.ts    GET the snapshot (anyone), PUT it (content managers)
  me/route.ts         who is signed in, and may they edit
test/
  server.test.ts      runs with `npm test`
public/
  sw.js             service worker: app shell, static assets, map tiles
  offline.html      standalone fallback for a cold launch with no network
  icons/            manifest icons (SVG sources + rendered PNGs)
```

## Basemap

Vector tiles from **OpenFreeMap**, drawn by MapLibre GL into a canvas that sits
in Leaflet's tile pane. Everything else on the map — markers, tooltips, cluster
outlines — is still Leaflet, drawn on top.

Two files:

- `lib/basemap-style.ts` — the style: sources, colours, which features appear at
  which zoom.
- `components/SiteMap.tsx` — `VectorBasemap`, which mounts it as a Leaflet layer.

No key, no account, no rate limit, and the planet is rebuilt from OSM roughly
weekly. Nothing to configure to deploy.

### Why vector

The pins are the content, and raster basemaps kept burying them:

- **CARTO Voyager** was quiet enough, then stopped being keyless — it now stamps
  "API KEY REQUIRED" across every tile.
- **OSM standard tiles** need no key but draw every shop, cafe and bus stop at
  full saturation. Muting them with a CSS `filter` on the tile pane helped the
  colour and not the clutter.

With vector tiles nothing is drawn unless a layer in the style asks for it, so
the busyness is a choice rather than something to filter afterwards. There is no
POI layer at all, no house numbers, no transit stops, no route shields. Colours
are real style properties in the paper palette instead of a filter, and text
stays sharp on a 3x screen — which the raster tiles never did, having no `@2x`.

Two details in that file worth knowing before editing it:

- **Zooms are written as Leaflet zooms** and converted by `z()`. MapLibre runs
  one level below Leaflet, because its tiles are 512px against Leaflet's 256px
  grid. Writing the raw MapLibre numbers would make every zoom in the style
  disagree with `minZoom`/`maxZoom` and the fly-to targets in `SiteMap.tsx`.
- **Settlement labels are capped by rank**, loosening as you zoom (`RANK_CAP`).
  OpenMapTiles ranks New York 1 and Newark 7, then a wall of 11s and 12s arrives
  at once — Yonkers, Hempstead, Levittown, Hicksville, Valley Stream. Drawing
  that wall across the tri-state area was most of what made the map feel busy,
  and none of it says anything about a site in the Bronx.

### The worker

MapLibre parses every tile in a Web Worker, and that worker is an ES module that
imports a sibling, `maplibre-gl-shared.mjs`, by relative path. Bundlers copy the
worker out as an opaque asset and do not follow that import, so the sibling 404s
and the worker dies on its first line.

`scripts/copy-maplibre-worker.mjs` copies both files into `public/maplibre/` on
`predev` and `prebuild`, and `SiteMap.tsx` calls `setWorkerUrl()` to point at
them. The directory is generated, gitignored, and never edited by hand.

This failure is worth recognising because it is silent: the map keeps its
canvas, resolves its style, and simply never decodes a tile. A blank basemap
with the pins still floating on it, and nothing in the console but a stray
MIME-type warning. `VectorBasemap` now logs MapLibre's own `error` events under
`[basemap]` so the next one says something.

### Changing provider

Any OpenMapTiles-schema host is close to a drop-in. Three places, all required:

1. `lib/basemap-style.ts` — `TILE_JSON`, `GLYPHS` and `basemapAttribution`.
2. `public/sw.js` — `BASEMAP_HOST`, or the offline caches silently stop matching
   and offline map coverage disappears.
3. Bump `VERSION` in `sw.js`, which retires the old caches. Without it a
   cache-first handler keeps serving the previous provider's tiles to anyone who
   had already opened the app — exactly how the CARTO watermarks would have
   outlived the switch away from them.

Point `TILE_JSON` at a TileJSON document, not a tile template. OpenFreeMap
serves each planet build from its own dated path, and the undated
`/planet/{z}/{x}/{y}.pbf` answers **200 with an empty body** — so a hardcoded
template fails silently in the same way the missing worker does.

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

## The app shell: two modes

The shell sizes itself one of two ways, and `globals.css` decides which in a
single media query — `(pointer: coarse), (max-width: 767px)`, the same predicate
the zoom-button sizing uses. Deliberately **not** a width breakpoint alone: a
landscape phone is 844px wide and 390px tall, so a width test hands it the
desktop treatment it very much does not want.

**Touch, or a narrow window — a locked full-screen shell.** `body` is
`position: fixed; inset: 0` with `overflow: hidden`. The map is the app here, and
a document that cannot scroll is what stops iOS rubber-banding it out from under
the chrome. Views that can outgrow the screen (All sites, Coverage) carry
`.app-scroll` and scroll themselves.

The fixed inset replaced a `height: 100dvh`, which was subtly wrong in the one
place it mattered most: in an **installed iOS PWA** with `viewportFit: "cover"`,
`dvh` resolves to the *safe* viewport rather than the screen, so the strip behind
the home indicator was left painted with the body background instead of the map —
a dead cream band along the bottom edge. A fixed inset covers the layout
viewport, safe areas included, and unlike any viewport height unit it does not
depend on the URL bar either.

**Everything else — a normal scrolling page.** `body` has `min-height: 100dvh`
and no lock, so a long list scrolls the window rather than being trapped in an
inner scroller with the frame frozen around it. The map view is the one thing
that must stay exactly one screen tall, so it carries `.app-viewport` and states
its own height.

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
| `static` | `/_next/static/**`, other same-origin assets, and the basemap's glyphs and TileJSON | Cache-first when hashed, else stale-while-revalidate |
| `tiles` | basemap vector tiles | Cache-first, LRU-capped at 400 |

So after one online visit: the app opens with no network, all 21 sites and the
coverage data are there (they are baked into the bundle, not fetched), and the
map draws for any area already looked at. Tiles for an area never visited stay
blank — nothing can be done about that without shipping a tile pack.

The glyph atlases and the TileJSON live in `static` rather than `tiles` on
purpose. They are a handful of small files the whole map depends on at every
zoom, and under the tile cache's LRU cap a long pan would evict them — an
offline map that comes back with no labels on it, or none at all.

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

## Managing content

`/manage`, served by the same app as the site it edits, restricted to the
`contentmanager` role.

It edits one site at a time — name, address, borough, type, map cluster, photo,
and the coordinates behind a disclosure, since those were geocoded by hand and
changing an address does not move the pin. Below that, the site's program staff
(add, remove, reorder, retitle, mark Vacant), its Grant Analyst, procurement
cluster and contract. At the bottom, which VP covers each cluster, and the VPs'
own names and titles.

Three things it does on purpose:

- **It starts from what is published**, not from the build. The server reads
  the current snapshot and renders the editor with it, so the first thing on
  screen is already what is stored — otherwise a manager would be editing the
  version in the bundle and overwrite whatever was saved since.
- **It refuses to merge.** Every save carries the version it started from, and
  the API rejects it if anything was saved meanwhile. Accepting would erase the
  other person's change with neither of them knowing. The editor says so and
  asks for a reload.
- **The role is checked twice.** The page itself refuses to render the editor
  without the role — answering 401 if nobody is signed in, 403 if they are but
  have not been granted it — and `PUT /api/content` checks the principal again
  before writing. The page check hides the editor; the API check is what
  protects the data, and it is the one that still holds if someone calls the
  endpoint directly.

The route also validates before storing: no sites, a site without coordinates or
outside New York, a duplicate id, a cluster pointing at a VP that does not
exist, an invalid staff role, an empty name — all refused with the reasons, and
nothing written. Once a bad document is in the table every visitor gets it, so
"the map went blank for everyone" would otherwise be one save away.

### Where it is stored

One row in Table Storage: partition `snapshot`, row `current`, holding the whole
document as JSON split across `chunk0..N` because a Table property caps at 32K
characters. One row rather than an entity per record because a save is a unit —
a half-applied write that moved a site into a cluster but not its VP would be
worse than a rejected one. The row also keeps `version` and who saved it.

Nothing saved yet is the normal state of a new deployment: `GET /api/content`
answers 404, the server renders pages from the snapshot compiled into the build,
and it stays that way until a content manager saves for the first time. That first save is also what seeds the
table — there is no separate seeding step.

## Content: where the data lives

Every view reads its records from **one place**, `components/ContentProvider.tsx`,
which holds a `ContentSnapshot` — sites, the office, VPs, cluster assignments,
program staff, contracts, procurement and Grant Analysts. Colours, role labels
and the map style are *not* in it: those are design decisions in code, not
records anyone maintains.

The server reads the stored snapshot and renders the page with it, so the
content arrives in the HTML already current. The provider then falls back, in
order, to the newest snapshot this device has seen (kept in `localStorage`) and
finally to `lib/content/seed.ts`, which is assembled from the `lib/*.ts` source
files and compiled into the bundle. After mounting it still asks
`/api/content` and swaps in anything **newer** by `version` — which matters
because the service worker can serve a cached copy of the HTML, and that copy
carries the content it had when it was cached.

That order is deliberate, and it is what keeps the offline story intact: the app
never waits on the network to draw the map. A cold launch with no signal still
has all 21 sites, every roster and every assignment, because the fallback is a
snapshot already on the device rather than a cache that may or may not be warm.
A snapshot is also only accepted if it passes a shape check — an HTML error page
or a truncated document is ignored rather than emptying the map.

`public/sw.js` deliberately does **not** cache `/api/`. A stale-while-revalidate
hit there would show yesterday's org chart while quietly fetching today's, which
is the exact failure this layer exists to prevent.

### Why the seam moved

The README used to call `CoverageProvider` "the backend seam: swap the sources
for fetched data and no consumer changes". That was only half true.
`CoverageAdmin` — the Coverage screen, the one a content manager edits from —
imported `SITES`, `CLUSTER_VPS`, `PROGRAM_LEADERSHIP`, `PROCUREMENT_LEADERSHIP`
and the per-site lookups straight from the modules, so a fetched snapshot would
have reached every site card and not that screen. Five more components read
`SITES` directly for the same reason. They all go through the provider now, and
a test asserts the Coverage view follows a served snapshot.

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
- `components/CoverageProvider.tsx` — resolves coverage per site from the content
  snapshot, and is still **read-only**: an editor that changes in-memory state
  alone reads as "saved" when nothing was, so saving waits on the write API and
  the content-manager role. Assignments change by editing the data files until
  then. See **Content: where the data lives** for the layer underneath it.
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
| Sasha Robinson | Cluster 1 | 4 |
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

Three programs span two buildings each (Cedar/Schafer, Lindenguild/Silverleaf,
Amber/Leeward). Those sites show a "Program" field naming the pair, and the
chart's per-building notes are kept on the individual roles. Cedar/Schafer and
Amber/Leeward share one roster outright; Lindenguild and Silverleaf share
everything except the PD, who covers Lindenguild only, so Silverleaf shows no PD
line at all.
Hudson Bay appears on the chart as "Stillwell Avenue", shown as "Also known as".

Vacancies are rendered in italic grey rather than hidden — 13 of the roles on the
chart are vacant.

The **Coverage** view manages both dimensions: VP portfolios (reassign one site,
or hand a whole portfolio to another VP) and procurement clusters.
