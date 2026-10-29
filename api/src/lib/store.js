"use strict";

/**
 * Where the content snapshot is stored.
 *
 * One row holds the whole document: PartitionKey "snapshot", RowKey "current".
 * A single row rather than an entity per record because the content manager
 * saves the document as a unit — a half-applied save that moved a site into a
 * cluster but not its VP would be worse than a rejected one.
 *
 * The JSON is split across several properties because Table Storage caps a
 * string property at 32K characters. The content is nowhere near that today
 * (~35KB of JSON over three chunks), but a cap that bites silently at some
 * future size is not a thing to leave lying around.
 */

const { TableClient, odata } = require("@azure/data-tables");

const TABLE_NAME = process.env.CONTENT_TABLE_NAME || "content";
const PARTITION_KEY = "snapshot";
const ROW_KEY = "current";

/**
 * Comfortably under Table Storage's 32K-character property limit, with room
 * for the UTF-16 expansion of any accented name in the data.
 */
const CHUNK_SIZE = 16000;

function connectionString() {
  const value = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!value) {
    throw new Error(
      "AZURE_STORAGE_CONNECTION_STRING is not set. Add it to the Static Web App's application settings.",
    );
  }
  return value;
}

/** Injectable so the tests can drive this without a storage account. */
function createClient(factory) {
  if (factory) return factory();
  return TableClient.fromConnectionString(connectionString(), TABLE_NAME, {
    allowInsecureConnection: false,
  });
}

function chunk(text) {
  const parts = {};
  let count = 0;
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    parts[`chunk${count}`] = text.slice(i, i + CHUNK_SIZE);
    count += 1;
  }
  return { parts, count };
}

function unchunk(entity) {
  const count = Number(entity.chunkCount ?? 0);
  let text = "";
  for (let i = 0; i < count; i += 1) {
    const part = entity[`chunk${i}`];
    // A missing chunk means a torn write; refuse it rather than parse garbage.
    if (typeof part !== "string") {
      throw new Error(`stored snapshot is missing chunk ${i} of ${count}`);
    }
    text += part;
  }
  return text;
}

/**
 * Reads the stored snapshot.
 *
 * Returns null when nothing has been saved yet, which is the normal state of a
 * fresh deployment: the site then runs on the snapshot compiled into its build
 * until a content manager saves for the first time.
 */
async function readSnapshot(factory) {
  const client = createClient(factory);
  let entity;
  try {
    entity = await client.getEntity(PARTITION_KEY, ROW_KEY);
  } catch (error) {
    if (error && (error.statusCode === 404 || error.code === "ResourceNotFound" || error.code === "TableNotFound")) {
      return null;
    }
    throw error;
  }

  return {
    snapshot: JSON.parse(unchunk(entity)),
    etag: entity.etag,
    version: Number(entity.version ?? 0),
    chunkCount: Number(entity.chunkCount ?? 0),
  };
}

/**
 * Writes a new snapshot, refusing the save if someone else has written since
 * the editor loaded. The client sends the version it started from; anything
 * else means two people edited the same document and the later one would
 * silently erase the earlier.
 */
async function writeSnapshot({ snapshot, baseVersion, updatedBy, factory }) {
  const client = createClient(factory);

  // Make sure the table exists before the first ever write.
  try {
    await client.createTable();
  } catch (error) {
    if (!error || (error.statusCode !== 409 && error.code !== "TableAlreadyExists")) {
      throw error;
    }
  }

  const current = await readSnapshot(factory);
  const currentVersion = current ? current.version : 0;

  if (Number(baseVersion) !== currentVersion) {
    return {
      conflict: true,
      currentVersion,
      current: current ? current.snapshot : null,
    };
  }

  const version = currentVersion + 1;
  const updatedAt = new Date().toISOString();
  const payload = JSON.stringify({ ...snapshot, version, updatedAt });
  const { parts, count } = chunk(payload);

  /*
   * Any chunk left over from a larger previous save has to be cleared.
   * "Replace" drops unlisted properties on its own, but being explicit costs
   * nothing and documents why a shrinking document is safe here.
   */
  const stale = {};
  for (let i = count; i < (current ? current.chunkCount : 0); i += 1) {
    stale[`chunk${i}`] = null;
  }

  const entity = {
    partitionKey: PARTITION_KEY,
    rowKey: ROW_KEY,
    version,
    updatedAt,
    updatedBy: updatedBy || "unknown",
    chunkCount: count,
    ...parts,
    ...stale,
  };

  // "Replace" rather than "Merge": the row is the whole document, so leftover
  // properties from a previous shape must not survive the save.
  if (current) {
    await client.updateEntity(entity, "Replace", { etag: current.etag });
  } else {
    await client.createEntity(entity);
  }

  return { conflict: false, version, updatedAt };
}

module.exports = {
  CHUNK_SIZE,
  PARTITION_KEY,
  ROW_KEY,
  TABLE_NAME,
  readSnapshot,
  writeSnapshot,
  odata,
};
