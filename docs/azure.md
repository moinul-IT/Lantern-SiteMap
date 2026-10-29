# Running Lantern Maps on Azure

A runbook for standing the site up from nothing, and for working out what is
wrong when it misbehaves. The short version lives in the README; this is the
one to follow with the portal open.

Everything below assumes the `server` branch, which is the version that runs as
a server. `main` is still the static export and does not run on App Service.

---

## What it is

One Node process, one storage account, and the sign-in that Azure puts in front
of them.

```
            browser
               │
               ▼
   ┌───────────────────────────┐
   │  App Service (Linux)      │
   │                           │
   │   Easy Auth               │  ← authenticates, injects the identity header
   │      │                    │
   │      ▼                    │
   │   node server.js          │  ← the Next.js standalone server
   │     /          the map    │
   │     /manage    the editor │
   │     /api/content          │
   │     /api/me               │
   └───────────┬───────────────┘
               │  AZURE_STORAGE_CONNECTION_STRING
               ▼
   ┌───────────────────────────┐
   │  Storage account          │
   │   Table: content          │
   │     snapshot / current    │  ← one row, the whole document
   └───────────────────────────┘
```

There is no database, no container registry, no separate API app and no CDN.
Content managers edit at `/manage`, the server writes one row, and the next
page load anywhere renders from it.

**Why a server and not a static site.** An exported build freezes content at
build time, so an edit saved at 10am would not reach a visitor until someone
redeployed. Here the server reads the row per request, so the next page load
already has the correction.

---

## Resources to create

Five things, once. Names below are examples — use your own and keep them
consistent.

| What | Example name | Notes |
|---|---|---|
| Resource group | `lantern-maps-rg` | Everything else goes in it |
| Storage account | `lanternmapsdata` | Standard LRS, any region |
| Table | `content` | The app creates it on first save if missing |
| App Service plan | `lantern-maps-plan` | Linux, B1 |
| Web App | `lantern-maps` | Node 22 LTS |

Pick one region and use it for all of them. The app talks to the table on every
page render, so a storage account in another region adds latency to every
request for no reason.

### Sizing

B1 (1 core, 1.75GB) is ample. The whole content document is about 35KB, there
are 21 sites, and this is an internal tool for staff rather than a public site.
B1 is also the cheapest tier that offers **Always On**, which matters: without
it App Service unloads the app after 20 minutes idle and the next visitor waits
through a cold Node start.

---

## What it costs, and how not to pay it

**About $13/month**, which is one App Service plan in a US region. Everything
else rounds to nothing: the content is a single 35KB row read a few hundred
times a day, so storage and transactions come to a few cents.

That whole figure is "a Linux machine that stays switched on". It is not
traffic, and it is not Azure being expensive — it is the difference between
serving files and running a process. Netlify was free because a static export
is files on a CDN: nobody is holding a server for you. Sign-in and content that
people edit need something running to check who is asking and to read the
current document, and that something has a monthly price whether anyone visits
or not.

So the honest trade is: $13/month buys the thing that was asked for. The
options below are about who pays it.

### Check the nonprofit grant first

Microsoft gives eligible nonprofits **$2,000/year in Azure credits**. B1 is
about **$158/year** — roughly a twelfth of the grant, with the rest spare. If
Lantern is already on Microsoft 365 for Nonprofits the tenant is likely
verified already, and the grant is claimed in the Nonprofit Portal under
Nonprofit Grants.

If that lands, stop reading this section and use B1.

### If it does not

| Option | Cost | What you give up |
|---|---|---|
| **B1** (what this runbook sets up) | ~$13/mo | Nothing |
| **F1 Free tier** | $0 | A daily CPU quota that **stops the app** when spent, no Always On, no custom domain |
| **Azure Container Apps** | ~$0 for this traffic | A Dockerfile and a registry to maintain; cold starts from zero |

**F1** is tempting and is the one to be careful with. The quota is not a
throttle — when an app on Free or Shared exceeds it, App Service stops the app
until the quota resets at midnight UTC. This site renders every page on the
server, which costs more CPU than the static export did, so the quota is closer
than it looks. It is fine for a demo and a poor bet for something staff rely on.

**Container Apps** is the genuinely cheap one. It scales to zero and the free
grant is 180,000 vCPU-seconds, 360,000 GiB-seconds and 2 million requests per
subscription per month — far more than an internal tool for a few dozen staff
will use. Easy Auth works there too, with the same header this app already
reads, so the application code would not change. The cost is in the plumbing: a
container image, somewhere to push it, and a visitor occasionally waiting for a
cold start after a quiet spell.

### Things that would cost more, and are not needed

Nothing here needs a database (one Table row), a CDN (App Service serves the
static assets fine at this traffic), Front Door, or a higher tier for
scale. If a bill arrives larger than about $15, something has been created that
this app does not use.

---

## Setting it up

Portal steps are given because they are stable and most people will use them.
CLI equivalents follow for the parts where the commands are long-settled. The
authentication step is portal-only here on purpose — the `az webapp auth`
subcommands vary between CLI versions, so check `az webapp auth --help` on
yours rather than copying flags from anywhere, including this file.

### 1. Storage

Portal → **Create a resource** → **Storage account**. Standard performance,
locally-redundant (LRS). Nothing else needs changing.

When it exists: **Security + networking → Access keys → Show keys**, and copy a
**connection string**. That is the one secret in this whole setup.

```bash
az group create --name lantern-maps-rg --location eastus

az storage account create \
  --name lanternmapsdata \
  --resource-group lantern-maps-rg \
  --location eastus \
  --sku Standard_LRS

az storage account show-connection-string \
  --name lanternmapsdata \
  --resource-group lantern-maps-rg \
  --query connectionString -o tsv
```

You do not need to create the table by hand. The app calls `createTable` before
its first write and ignores "already exists", so the first save creates it.

### 2. The App Service

Portal → **Create a resource** → **Web App**. Publish: **Code**. Runtime stack:
**Node 22 LTS**. Operating System: **Linux**. Plan: **B1**.

```bash
az appservice plan create \
  --name lantern-maps-plan \
  --resource-group lantern-maps-rg \
  --is-linux --sku B1

az webapp create \
  --name lantern-maps \
  --resource-group lantern-maps-rg \
  --plan lantern-maps-plan \
  --runtime "NODE:22-lts"
```

### 3. The startup command — do not skip this

**Settings → Configuration → General settings → Startup Command:**

```
node server.js
```

This is the single most likely reason a first deploy comes up dead.

A standalone Next build emits `server.js` at the root of the deployed folder,
and that is the entry point. But the folder also carries a `package.json` that
Next copies from the repo, whose `start` script is `next start` — correct for a
normal build, wrong for a standalone one. App Service's Node container runs
`npm start` when it finds a start script, so without an explicit startup command
it runs the wrong thing and the container never comes up.

```bash
az webapp config set \
  --name lantern-maps --resource-group lantern-maps-rg \
  --startup-file "node server.js"
```

While you are on that screen, turn **Always On** to **On**.

### 4. The connection string

**Settings → Environment variables → App settings → Add:**

| Name | Value |
|---|---|
| `AZURE_STORAGE_CONNECTION_STRING` | the string from step 1 |

```bash
az webapp config appsettings set \
  --name lantern-maps --resource-group lantern-maps-rg \
  --settings AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=..."
```

That is the only setting the app requires. The others it understands
(`CONTENT_STORE`, `ALLOW_MEMORY_STORE`, `TRUST_AUTH_HEADER`, `CONTENT_TABLE_NAME`)
all have sane defaults and are listed at the end of this document.

> A connection string carries a storage key, so it belongs here rather than in
> the repository. If you would rather not hold a key at all, the app can be
> moved to a managed identity later — it is one change in
> `lib/server/content-store.ts`, swapping `TableClient.fromConnectionString`
> for `new TableClient(url, table, new DefaultAzureCredential())`.

### 5. Sign-in

**Settings → Authentication → Add identity provider:**

- **Identity provider:** Microsoft
- **Tenant type:** Workforce
- **App registration:** create a new one (or point at an existing one)
- **Restrict access:** **Allow unauthenticated access** ← this one matters
- **Unauthenticated requests:** HTTP 200 with no redirect

**Allow unauthenticated access is deliberate.** The map is open to everyone who
can reach the site; only `/manage` and saving need a signed-in content manager,
and the app enforces that itself. If you set this to "Require authentication"
instead, Azure bounces every visitor through a sign-in page before they can see
a map they were never meant to need an account for.

Once this is saved, `/.auth/login/aad` and `/.auth/logout` exist. Nothing in the
code configures them.

### 6. The `contentmanager` role

Still in the portal, open the app registration that step 5 created
(**Authentication → the identity provider → the app registration link**, or
**Microsoft Entra ID → App registrations**).

**App roles → Create app role:**

| Field | Value |
|---|---|
| Display name | Content manager |
| Allowed member types | Users/Groups |
| **Value** | `contentmanager` |
| Description | May edit site information, rosters and coverage |

The **Value** must be exactly `contentmanager` — lower case, one word. It is
compared as a literal string in `lib/server/principal.ts`, so `ContentManager`
or `content-manager` will leave the person signed in and unable to save, with
nothing obviously wrong.

Then assign it: **Microsoft Entra ID → Enterprise applications →** the same app
**→ Users and groups → Add user/group**, pick the person, pick the Content
manager role. Assigning a **group** rather than individuals is usually less
work to maintain.

Everyone else can still read the site. They just get a 403 at `/manage` that
explains why.

### 7. Deployment

**Get publish profile** on the App Service Overview page downloads an XML file.
Paste its entire contents into a GitHub repository secret named
`AZURE_WEBAPP_PUBLISH_PROFILE` (repo → Settings → Secrets and variables →
Actions → New repository secret).

If the Web App is not called `lantern-maps`, change `AZURE_WEBAPP_NAME` at the
top of `.github/workflows/azure-app-service.yml` to match.

Then push. The workflow lints, typechecks, runs the tests, builds, assembles the
standalone folder and uploads it.

> **Why the workflow copies two directories.** A standalone build deliberately
> leaves out `public/` and `.next/static`, assuming they will be served from a
> CDN. They are not, here. If those copies are removed the site still boots and
> still renders — but with no CSS, no icons, no map worker and no service
> worker. It looks like a styling bug rather than a packaging one, which is why
> it is worth knowing.

---

## Rehearsing it locally

The exact artifact that gets deployed can be run on your own machine, which is
the cheapest way to find a packaging problem before Azure does.

```bash
npm run build
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

cd .next/standalone
CONTENT_STORE=memory ALLOW_MEMORY_STORE=1 \
WEBSITE_AUTH_ENABLED=True \
PORT=4300 HOSTNAME=127.0.0.1 node server.js
```

Those three settings stand in for what Azure provides: an in-memory store
instead of a storage account, and the flag App Service injects to say that
something is authenticating in front. Then mint an identity header and use it
the way Easy Auth would:

```bash
PRINCIPAL=$(node -e 'console.log(Buffer.from(JSON.stringify({
  auth_typ:"aad", role_typ:"roles", name_typ:"preferred_username",
  claims:[{typ:"preferred_username",val:"you@lanterncommunity.org"},
          {typ:"roles",val:"contentmanager"}]})).toString("base64"))')

curl -s -H "x-ms-client-principal: $PRINCIPAL" http://127.0.0.1:4300/api/me
# {"signedIn":true,"name":"you@lanterncommunity.org","canEdit":true,...}
```

Dropping `WEBSITE_AUTH_ENABLED` from the launch is worth doing once: the same
request then comes back `signedIn: false` and the log explains why, which is
exactly what a deployment with authentication switched off looks like.

---

## Checking it worked

In order, because each one tells you something different.

```bash
SITE=https://lantern-maps.azurewebsites.net

# 1. The server is up and rendering.
curl -s -o /dev/null -w '%{http_code}\n' $SITE
# 200

# 2. Static assets made it into the package.
curl -s -o /dev/null -w '%{http_code}\n' $SITE/sw.js
# 200  (404 means the public/ copy step did not happen)

# 3. The content store is reachable.
curl -s $SITE/api/content
# {"error":"no snapshot saved yet"}  → correct before anyone has saved
# {"error":"content store unavailable"}  → the connection string is wrong
# a JSON document  → someone has saved, and it is being read back

# 4. Auth is wired up and the app can see it.
curl -s $SITE/api/me
# {"signedIn":false,...,"loginUrl":"/.auth/login/aad?..."}

# 5. Saving is closed to anonymous callers.
curl -s -o /dev/null -w '%{http_code}\n' -X PUT $SITE/api/content \
  -H 'Content-Type: application/json' -d '{"snapshot":{},"baseVersion":0}'
# 401
```

Then in a browser:

1. Open the site. The map should draw with all 21 sites.
2. Open `/manage` signed out → a sign-in page, **401**.
3. Sign in as someone without the role → "has not been given the content
   manager role", **403**.
4. Sign in as a content manager → the editor, with a **Save changes** button.
5. Rename a site, save, and reload the public map. The new name should be there
   immediately — not after a redeploy.

Step 5 is the one that proves the whole chain: sign-in, role, validation,
storage, and server rendering.

---

## When it goes wrong

| Symptom | Cause | Fix |
|---|---|---|
| "Application Error", container never starts | Startup command missing, so App Service ran `npm start` → `next start` | Set Startup Command to `node server.js` |
| Site loads but is unstyled, no icons, map never appears | `public/` and `.next/static` were not copied into the standalone folder | Check the "Assemble the standalone server" step in the workflow ran |
| `/api/content` returns 503 | Connection string missing, wrong, or the key was rotated | Re-copy it from Access keys into app settings |
| Everything works but saves vanish on restart | `CONTENT_STORE=memory` left set in app settings | Remove it. It is refused in production anyway unless `ALLOW_MEMORY_STORE=1` is also set |
| Nobody can sign in; `/api/me` always says `signedIn: false` | Authentication is not actually enabled, so the app refuses to trust the identity header | Finish step 5. See *Why it fails closed* below |
| A real content manager gets 403 at `/manage` | Role value misspelled, or assigned on the app registration but not to the user | Value must be exactly `contentmanager`; assign under Enterprise applications → Users and groups |
| Every visitor is forced to sign in | "Require authentication" was chosen in step 5 | Change to **Allow unauthenticated access** |
| First request after a quiet period takes ~20s | Always On is off | Turn Always On on (needs B1 or higher) |
| Save returns 409 | Someone else saved while the editor was open | Intended. Reload and reapply — see *Two people editing* |

### Logs

```bash
az webapp log tail --name lantern-maps --resource-group lantern-maps-rg
```

The app writes a line on every save (`[content] saved as version N by ...`),
on every rejected document, and once if it is refusing to trust the identity
header. Portal equivalent: **Monitoring → Log stream**.

### Why it fails closed

`x-ms-client-principal` is an ordinary HTTP header. What makes it trustworthy
is that Easy Auth strips any copy the caller sent and writes its own — so if
Easy Auth is not there, the header is just something anyone can type, and
believing it would hand out the content manager role to whoever asks.

So the server will not read the header unless it can tell something is
authenticating in front of it. It looks for `WEBSITE_AUTH_ENABLED`, which App
Service injects as a read-only setting to report that authentication is on, or
`TRUST_AUTH_HEADER=1`, which you set by hand if you put a different
authenticating proxy in front.

A deployment that forgets step 5 therefore locks everyone out of editing rather
than letting everyone in. If `/api/me` insists nobody is signed in even after a
successful sign-in, that is this check, and the log says so in as many words.

---

## Running it

### Two people editing

Every save carries the version it started from. If the stored version has moved
on, the save is refused with a 409 and the editor says someone else saved first.
Nothing is merged and nothing is lost — the other person's change stays intact
and this one is still on screen to reapply after a reload.

This is why there is no "force save". Merging two edits to the same roster
automatically would silently pick a winner.

### What a bad save cannot do

The server validates before it writes: no sites, a site without coordinates or
outside New York, a duplicate id, a cluster pointing at a VP that does not
exist, an invalid staff role, an empty name — all refused with reasons, nothing
written. Once a bad document is in the table every visitor gets it, so "the map
went blank for everyone" would otherwise be one save away.

### Backing up the content

The whole thing is one row. To take a copy:

```bash
curl -s https://lantern-maps.azurewebsites.net/api/content > content-backup.json
```

That is a complete, restorable snapshot — the same shape the editor saves. Worth
doing before a bulk edit. Azure's own storage redundancy covers hardware
failure; this covers someone deleting a roster.

To restore, a content manager can `PUT` it back with the current `baseVersion`,
or simply re-enter the change. There is no undo in the editor.

### If the store is empty or unreachable

The site still works. `loadContent()` falls back to the snapshot compiled into
the build, and the browser falls back further to the last snapshot that device
saw. A storage outage degrades the content to slightly stale; it does not take
the map down.

### Scaling out

Safe. State lives in Table Storage, not in the process, so several instances
share one document and the version check keeps their writes honest. The only
per-process store is the in-memory one, which is for local development and is
refused in production.

---

## Environment variables

| Name | Required | What it does |
|---|---|---|
| `AZURE_STORAGE_CONNECTION_STRING` | **yes** | Where content is stored |
| `CONTENT_TABLE_NAME` | no | Table name, default `content` |
| `TRUST_AUTH_HEADER` | no | Set to `1` only if something other than App Service authenticates in front |
| `CONTENT_STORE` | no | `memory` for local development; saves are lost on restart |
| `ALLOW_MEMORY_STORE` | no | Lets `CONTENT_STORE=memory` run in production. Do not set it |
| `NEXT_PUBLIC_SITE_URL` | no | The public address, for `metadataBase` and share cards. **Build time only** — see below |
| `WEBSITE_AUTH_ENABLED` | — | **Injected by App Service**, read-only. Do not set it by hand |
| `WEBSITE_HOSTNAME` | — | Injected by App Service; used as the site address when `NEXT_PUBLIC_SITE_URL` is unset |
| `PORT`, `HOSTNAME` | — | Set by App Service; the server reads them |

### The one that is not an app setting

`NEXT_PUBLIC_SITE_URL` is compiled into the build, so putting it in the App
Service configuration does nothing. It belongs in the GitHub repository
variable `SITE_URL` (repo → Settings → Secrets and variables → Actions →
Variables), which the workflow passes to `npm run build`.

Leave it unset and the site uses the `WEBSITE_HOSTNAME` App Service injects —
correct, but it means share cards and Open Graph tags point at
`lantern-maps.azurewebsites.net` rather than your real domain. Set it after
step 2 of the cutover below.

---

## Moving off Netlify

This is the branch that stops being a static site, so Netlify cannot serve it.
Cut over in this order, or there is a gap where neither host works:

1. Deploy to App Service and check it on its `azurewebsites.net` address, using
   the checks above.
2. Add the custom domain to App Service (**Settings → Custom domains**) and let
   it issue a managed certificate.
3. Point DNS at App Service.
4. Merge this branch to `main`, then delete the Netlify site.

Until step 4, `main` still builds the static export and Netlify keeps serving it
exactly as it does today.
