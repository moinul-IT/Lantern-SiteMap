"use strict";

/**
 * Exercises the API's logic without a storage account.
 *
 * Azure is unreachable from the environment this was written in, so the Table
 * client is mocked: these cover the parts that are ours — chunking, optimistic
 * concurrency, the role gate and the validator — rather than the SDK's.
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { readSnapshot, writeSnapshot, CHUNK_SIZE } = require("../src/lib/store");
const { readPrincipal, isContentManager } = require("../src/lib/principal");
const { validateSnapshot } = require("../src/lib/validate");

// ---- a minimal in-memory stand-in for TableClient -------------------------
function mockTable(initial) {
  const state = { entity: initial ? { ...initial } : null, etagSeq: 1, created: false };
  const notFound = () => Object.assign(new Error("not found"), { statusCode: 404 });

  const client = {
    async createTable() {
      state.created = true;
    },
    async getEntity() {
      if (!state.entity) throw notFound();
      return { ...state.entity };
    },
    async createEntity(entity) {
      state.entity = { ...entity, etag: `W/"${state.etagSeq++}"` };
    },
    async updateEntity(entity, mode, options) {
      if (options?.etag && options.etag !== state.entity.etag) {
        throw Object.assign(new Error("precondition failed"), { statusCode: 412 });
      }
      const next = { ...entity, etag: `W/"${state.etagSeq++}"` };
      // "Replace" semantics: drop anything not in the new entity, and honour
      // explicit nulls the caller used to clear a property.
      for (const [k, v] of Object.entries(next)) if (v === null) delete next[k];
      state.entity = next;
    },
  };
  return { client, state, factory: () => client };
}

const baseSnapshot = () => ({
  version: 0,
  updatedAt: "",
  sites: [
    { id: "a", name: "Amber Hall", borough: "Bronx", address: "1 St", city: "Bronx, NY",
      zip: "10456", lat: 40.83, lng: -73.9, type: "Supportive Housing", cluster: 3, photo: null },
  ],
  mainOffice: { id: "office", kind: "office", name: "Main Office", label: "Admin",
    address: "575 8th Ave", floor: "15", city: "New York, NY", zip: "10018",
    lat: 40.75, lng: -73.99, photo: null },
  vps: [{ id: "vp-1", name: "Dana", title: "Vice President" }],
  clusterVps: { 1: "vp-1", 2: "vp-1", 3: "vp-1", 4: "vp-1" },
  shelterVps: ["vp-1"],
  siteTeams: { a: { staff: [{ role: "PD", name: "Marguerite Bell" }] } },
  siteContracts: { a: "HASA" },
  programLeadership: [{ name: "X", title: "Y" }],
  procurementPeople: [{ id: "p-1", name: "Imani", title: "Analyst" }],
  procurementLeadership: ["p-1"],
  coverageAssignments: { 1: { procurementId: "p-1" }, 2: { procurementId: "p-1" }, 3: { procurementId: null } },
  siteCoverageCluster: { a: 1 },
  siteGrantAnalyst: { a: "Jordan" },
});

// ---- store ----------------------------------------------------------------
test("reading before anything is saved returns null", async () => {
  const { factory } = mockTable(null);
  assert.equal(await readSnapshot(factory), null);
});

test("a snapshot round-trips through chunked storage", async () => {
  const { factory, state } = mockTable(null);
  const snapshot = baseSnapshot();
  const result = await writeSnapshot({ snapshot, baseVersion: 0, updatedBy: "a@b.org", factory });

  assert.equal(result.conflict, false);
  assert.equal(result.version, 1, "first save is version 1");
  assert.ok(state.entity.chunkCount >= 1);

  const read = await readSnapshot(factory);
  assert.equal(read.version, 1);
  assert.equal(read.snapshot.sites[0].name, "Amber Hall");
  assert.equal(read.snapshot.updatedBy, undefined, "updatedBy is stored on the row, not in the document");
});

test("a document larger than one chunk still round-trips", async () => {
  const { factory, state } = mockTable(null);
  const snapshot = baseSnapshot();
  // Pad past the chunk boundary with real content: many sites.
  snapshot.sites = Array.from({ length: 400 }, (_, i) => ({
    ...snapshot.sites[0], id: `s${i}`, name: `Site number ${i} with a reasonably long name`,
  }));
  snapshot.siteTeams = {};
  snapshot.siteContracts = {};
  snapshot.siteCoverageCluster = {};
  snapshot.siteGrantAnalyst = {};

  await writeSnapshot({ snapshot, baseVersion: 0, updatedBy: "a", factory });
  assert.ok(state.entity.chunkCount > 1, `expected several chunks, got ${state.entity.chunkCount}`);
  for (let i = 0; i < state.entity.chunkCount; i += 1) {
    assert.ok(state.entity[`chunk${i}`].length <= CHUNK_SIZE);
  }
  const read = await readSnapshot(factory);
  assert.equal(read.snapshot.sites.length, 400);
  assert.equal(read.snapshot.sites[399].id, "s399");
});

test("shrinking the document clears the chunks it no longer needs", async () => {
  const { factory, state } = mockTable(null);
  const big = baseSnapshot();
  big.sites = Array.from({ length: 400 }, (_, i) => ({ ...big.sites[0], id: `s${i}` }));
  big.siteTeams = {}; big.siteContracts = {}; big.siteCoverageCluster = {}; big.siteGrantAnalyst = {};
  await writeSnapshot({ snapshot: big, baseVersion: 0, updatedBy: "a", factory });
  const wideCount = state.entity.chunkCount;
  assert.ok(wideCount > 1);

  await writeSnapshot({ snapshot: baseSnapshot(), baseVersion: 1, updatedBy: "a", factory });
  assert.equal(state.entity.chunkCount, 1);
  assert.equal(state.entity.chunk1, undefined, "a stale chunk would truncate the next read");
  const read = await readSnapshot(factory);
  assert.equal(read.snapshot.sites.length, 1, "read back a complete document");
});

test("a save from a stale version is refused, not applied", async () => {
  const { factory } = mockTable(null);
  await writeSnapshot({ snapshot: baseSnapshot(), baseVersion: 0, updatedBy: "first", factory });

  const second = baseSnapshot();
  second.sites[0].name = "Edited by someone who loaded earlier";
  const result = await writeSnapshot({ snapshot: second, baseVersion: 0, updatedBy: "second", factory });

  assert.equal(result.conflict, true);
  assert.equal(result.currentVersion, 1);
  assert.equal(result.current.sites[0].name, "Amber Hall", "the first save survives");
});

test("the version the server stores is its own, not the client's", async () => {
  const { factory } = mockTable(null);
  const lying = baseSnapshot();
  lying.version = 9999;
  await writeSnapshot({ snapshot: lying, baseVersion: 0, updatedBy: "a", factory });
  const read = await readSnapshot(factory);
  assert.equal(read.snapshot.version, 1);
});

test("a torn row is refused rather than parsed", async () => {
  const { factory } = mockTable({ partitionKey: "snapshot", rowKey: "current", version: 3, chunkCount: 2, chunk0: '{"a":' });
  await assert.rejects(() => readSnapshot(factory), /missing chunk 1/);
});

// ---- principal ------------------------------------------------------------
const header = (obj) => ({ headers: { get: () => Buffer.from(JSON.stringify(obj)).toString("base64") } });

test("the content-manager role is read from the SWA principal", () => {
  assert.equal(isContentManager(readPrincipal(header({ userRoles: ["anonymous", "authenticated", "contentmanager"] }))), true);
  assert.equal(isContentManager(readPrincipal(header({ userRoles: ["authenticated"] }))), false);
  assert.equal(isContentManager(readPrincipal({ headers: { get: () => null } })), false, "no header means no role");
  assert.equal(readPrincipal({ headers: { get: () => "not base64 json" } }), null, "a malformed header is not a principal");
});

// ---- validator ------------------------------------------------------------
test("a good snapshot validates", () => {
  assert.equal(validateSnapshot(baseSnapshot()).valid, true);
});

test("documents that would break the app are refused", () => {
  const cases = {
    "no sites": (s) => { s.sites = []; },
    "site without coordinates": (s) => { delete s.sites[0].lat; },
    "coordinates outside New York": (s) => { s.sites[0].lat = 51.5; s.sites[0].lng = -0.12; },
    "duplicate site id": (s) => { s.sites.push({ ...s.sites[0] }); },
    "cluster pointing at an unknown VP": (s) => { s.clusterVps[1] = "vp-nope"; },
    "roster for a site that does not exist": (s) => { s.siteTeams.ghost = { staff: [] }; },
    "invalid staff role": (s) => { s.siteTeams.a.staff[0].role = "CEO"; },
    "staff entry with no name": (s) => { s.siteTeams.a.staff[0].name = ""; },
    "procurement pointing at an unknown person": (s) => { s.coverageAssignments[1].procurementId = "p-nope"; },
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
