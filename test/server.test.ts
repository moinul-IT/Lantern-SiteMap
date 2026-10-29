/**
 * Exercises the server's own logic without a storage account.
 *
 * Azure is not reachable from CI, so the Table client is a stand-in: these
 * cover the parts that are ours — chunking, optimistic concurrency, the role
 * gate and the validator — rather than the SDK's.
 *
 * Run with `npm test`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { createTableContentStore } from "../lib/server/content-store.ts";
import { isContentManager, readPrincipal } from "../lib/server/principal.ts";
import { validateSnapshot } from "../lib/server/validate.ts";

/** Comfortably under Table Storage's 32K-character property limit. */
const CHUNK_SIZE = 16000;

// ---- a minimal in-memory stand-in for TableClient -------------------------
function mockTable(initial: Record<string, unknown> | null = null) {
  const state: { entity: Record<string, unknown> | null } = {
    entity: initial ? { ...initial } : null,
  };
  const notFound = () => Object.assign(new Error("not found"), { statusCode: 404 });

  const client = {
    async createTable() {},
    async getEntity() {
      if (!state.entity) throw notFound();
      return { ...state.entity };
    },
    async createEntity(entity: Record<string, unknown>) {
      state.entity = { ...entity };
    },
    async updateEntity(entity: Record<string, unknown>) {
      // "Replace" semantics: drop anything not in the new entity, and honour
      // the explicit nulls the caller used to clear a property.
      const next = { ...entity };
      for (const [k, v] of Object.entries(next)) if (v === null) delete next[k];
      state.entity = next;
    },
  };

  // The real client has a much wider surface; the store only uses these four.
  return { store: createTableContentStore(client as never), state };
}

const baseSnapshot = () => ({
  version: 0,
  updatedAt: "",
  sites: [
    {
      id: "a", name: "Amber Hall", borough: "Bronx", address: "1 St",
      city: "Bronx, NY", zip: "10456", lat: 40.83, lng: -73.9,
      type: "Supportive Housing", cluster: 3, photo: null,
    },
  ],
  mainOffice: {
    id: "office", kind: "office", name: "Main Office", label: "Admin",
    address: "575 8th Ave", floor: "15", city: "New York, NY", zip: "10018",
    lat: 40.75, lng: -73.99, photo: null,
  },
  vps: [{ id: "vp-1", name: "Dana", title: "Vice President" }],
  clusterVps: { 1: "vp-1", 2: "vp-1", 3: "vp-1", 4: "vp-1" },
  shelterVps: ["vp-1"],
  siteTeams: { a: { staff: [{ role: "PD", name: "Marguerite Bell" }] } },
  siteContracts: { a: "HASA" },
  programLeadership: [{ name: "X", title: "Y" }],
  procurementPeople: [{ id: "p-1", name: "Imani", title: "Analyst" }],
  procurementLeadership: ["p-1"],
  coverageAssignments: {
    1: { procurementId: "p-1" },
    2: { procurementId: "p-1" },
    3: { procurementId: null },
  },
  siteCoverageCluster: { a: 1 },
  siteGrantAnalyst: { a: "Jordan" },
});

// Every call goes through the public shape, so the casts stay at the edge.
const snapshot = () => baseSnapshot() as never;

// ---- store ----------------------------------------------------------------
test("reading before anything is saved returns null", async () => {
  const { store } = mockTable();
  assert.equal(await store.read(), null);
});

test("a snapshot round-trips through chunked storage", async () => {
  const { store, state } = mockTable();
  const result = await store.write({
    snapshot: snapshot(), baseVersion: 0, updatedBy: "a@b.org",
  });

  assert.equal(result.conflict, false);
  assert.equal(result.conflict === false && result.version, 1, "first save is version 1");
  assert.ok(Number(state.entity!.chunkCount) >= 1);

  const read = await store.read();
  assert.equal(read!.version, 1);
  assert.equal(read!.snapshot.sites[0].name, "Amber Hall");
  assert.equal(
    (read!.snapshot as Record<string, unknown>).updatedBy,
    undefined,
    "updatedBy is stored on the row, not in the document",
  );
});

test("a document larger than one chunk still round-trips", async () => {
  const { store, state } = mockTable();
  const big = baseSnapshot();
  // Pad past the chunk boundary with real content: many sites.
  big.sites = Array.from({ length: 400 }, (_, i) => ({
    ...big.sites[0], id: `s${i}`,
    name: `Site number ${i} with a reasonably long name`,
  }));
  big.siteTeams = {} as never;
  big.siteContracts = {} as never;
  big.siteCoverageCluster = {} as never;
  big.siteGrantAnalyst = {} as never;

  await store.write({ snapshot: big as never, baseVersion: 0, updatedBy: "a" });
  const count = Number(state.entity!.chunkCount);
  assert.ok(count > 1, `expected several chunks, got ${count}`);
  for (let i = 0; i < count; i += 1) {
    assert.ok(String(state.entity![`chunk${i}`]).length <= CHUNK_SIZE);
  }

  const read = await store.read();
  assert.equal(read!.snapshot.sites.length, 400);
  assert.equal(read!.snapshot.sites[399].id, "s399");
});

test("shrinking the document clears the chunks it no longer needs", async () => {
  const { store, state } = mockTable();
  const big = baseSnapshot();
  big.sites = Array.from({ length: 400 }, (_, i) => ({ ...big.sites[0], id: `s${i}` }));
  big.siteTeams = {} as never;
  big.siteContracts = {} as never;
  big.siteCoverageCluster = {} as never;
  big.siteGrantAnalyst = {} as never;
  await store.write({ snapshot: big as never, baseVersion: 0, updatedBy: "a" });
  assert.ok(Number(state.entity!.chunkCount) > 1);

  await store.write({ snapshot: snapshot(), baseVersion: 1, updatedBy: "a" });
  assert.equal(Number(state.entity!.chunkCount), 1);
  assert.equal(
    state.entity!.chunk1, undefined,
    "a stale chunk would truncate the next read",
  );

  const read = await store.read();
  assert.equal(read!.snapshot.sites.length, 1, "read back a complete document");
});

test("a save from a stale version is refused, not applied", async () => {
  const { store } = mockTable();
  await store.write({ snapshot: snapshot(), baseVersion: 0, updatedBy: "first" });

  const second = baseSnapshot();
  second.sites[0].name = "Edited by someone who loaded earlier";
  const result = await store.write({
    snapshot: second as never, baseVersion: 0, updatedBy: "second",
  });

  assert.equal(result.conflict, true);
  if (result.conflict) {
    assert.equal(result.currentVersion, 1);
    assert.equal(
      result.current!.sites[0].name, "Amber Hall",
      "the first save survives",
    );
  }
});

test("the version the server stores is its own, not the client's", async () => {
  const { store } = mockTable();
  const lying = baseSnapshot();
  lying.version = 9999;
  await store.write({ snapshot: lying as never, baseVersion: 0, updatedBy: "a" });
  const read = await store.read();
  assert.equal(read!.snapshot.version, 1);
});

test("a torn row is refused rather than parsed", async () => {
  const { store } = mockTable({
    partitionKey: "snapshot", rowKey: "current",
    version: 3, chunkCount: 2, chunk0: '{"a":',
  });
  await assert.rejects(() => store.read(), /missing chunk 1/);
});

// ---- principal ------------------------------------------------------------
const asHeader = (obj: unknown) =>
  new Headers({
    "x-ms-client-principal": Buffer.from(JSON.stringify(obj)).toString("base64"),
  });

/** What App Service Easy Auth injects: a ClaimsPrincipal. */
const easyAuth = (roles: string[]) =>
  asHeader({
    auth_typ: "aad",
    name_typ: "preferred_username",
    role_typ: "roles",
    claims: [
      { typ: "preferred_username", val: "someone@lanterncommunity.org" },
      ...roles.map((val) => ({ typ: "roles", val })),
    ],
  });

test("the content-manager role is read from an App Service principal", () => {
  assert.equal(isContentManager(readPrincipal(easyAuth(["contentmanager"]))), true);
  assert.equal(isContentManager(readPrincipal(easyAuth(["authenticated"]))), false);
  assert.equal(
    readPrincipal(easyAuth(["contentmanager"]))!.userDetails,
    "someone@lanterncommunity.org",
  );
});

test("a provider that names its own role claim type is still understood", () => {
  const custom = asHeader({
    auth_typ: "aad",
    role_typ: "http://example.test/claims/role",
    claims: [{ typ: "http://example.test/claims/role", val: "contentmanager" }],
  });
  assert.equal(isContentManager(readPrincipal(custom)), true);
});

test("the older flat Static Web Apps principal still works", () => {
  const flat = asHeader({
    userId: "1", userDetails: "a@b.org", identityProvider: "aad",
    userRoles: ["authenticated", "contentmanager"],
  });
  assert.equal(isContentManager(readPrincipal(flat)), true);
});

test("no header, or a malformed one, is not a principal", () => {
  assert.equal(readPrincipal(new Headers()), null, "no header means no principal");
  assert.equal(
    readPrincipal(new Headers({ "x-ms-client-principal": "not base64 json" })),
    null,
    "a malformed header is not a principal",
  );
  assert.equal(isContentManager(null), false);
});

// ---- validator ------------------------------------------------------------
test("a good snapshot validates", () => {
  assert.equal(validateSnapshot(baseSnapshot()).valid, true);
});

test("documents that would break the app are refused", () => {
  const cases: Record<string, (s: ReturnType<typeof baseSnapshot>) => void> = {
    "no sites": (s) => { s.sites = []; },
    "site without coordinates": (s) => { delete (s.sites[0] as Record<string, unknown>).lat; },
    "coordinates outside New York": (s) => { s.sites[0].lat = 51.5; s.sites[0].lng = -0.12; },
    "duplicate site id": (s) => { s.sites.push({ ...s.sites[0] }); },
    "cluster pointing at an unknown VP": (s) => { s.clusterVps[1] = "vp-nope"; },
    "roster for a site that does not exist": (s) => {
      (s.siteTeams as Record<string, unknown>).ghost = { staff: [] };
    },
    "invalid staff role": (s) => { s.siteTeams.a.staff[0].role = "CEO"; },
    "staff entry with no name": (s) => { s.siteTeams.a.staff[0].name = ""; },
    "procurement pointing at an unknown person": (s) => {
      s.coverageAssignments[1].procurementId = "p-nope";
    },
    "invalid borough": (s) => { s.sites[0].borough = "Staten Island"; },
  };

  for (const [name, mutate] of Object.entries(cases)) {
    const s = baseSnapshot();
    mutate(s);
    const { valid, errors } = validateSnapshot(s);
    assert.equal(valid, false, `expected "${name}" to be refused`);
    assert.ok(errors.length > 0);
  }
});

test("an empty roster is allowed — a site may genuinely have no staff listed", () => {
  const s = baseSnapshot();
  s.siteTeams.a.staff = [];
  assert.equal(validateSnapshot(s).valid, true);
});

test("a vacant post is allowed", () => {
  const s = baseSnapshot();
  s.siteTeams.a.staff = [{ role: "PD", name: "Vacant" }];
  assert.equal(validateSnapshot(s).valid, true);
});
