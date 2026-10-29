import { TableClient } from "@azure/data-tables";
import type { ContentSnapshot } from "@/lib/content/types";

/**
 * Where the content snapshot lives.
 *
 * One row holds the whole document: partition "snapshot", row "current". A
 * single row rather than an entity per record because a save is a unit — a
 * half-applied write that moved a site into a cluster but not its VP would be
 * worse than a rejected one.
 *
 * The JSON is split across several properties because a Table property caps at
 * 32K characters. The content is nowhere near that today, but a cap that bites
 * silently at some future size is not a thing to leave lying around.
 */

const TABLE_NAME = process.env.CONTENT_TABLE_NAME ?? "content";
const PARTITION_KEY = "snapshot";
const ROW_KEY = "current";

/** Comfortably under the 32K-character property limit. */
const CHUNK_SIZE = 16000;

export type StoredSnapshot = {
  snapshot: ContentSnapshot;
  version: number;
  chunkCount: number;
};

export type SaveResult =
  | { conflict: true; currentVersion: number; current: ContentSnapshot | null }
  | { conflict: false; version: number; updatedAt: string };

export interface ContentStore {
  read(): Promise<StoredSnapshot | null>;
  write(args: {
    snapshot: ContentSnapshot;
    baseVersion: number;
    updatedBy: string;
  }): Promise<SaveResult>;
}

function chunk(text: string) {
  const parts: Record<string, string> = {};
  let count = 0;
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    parts[`chunk${count}`] = text.slice(i, i + CHUNK_SIZE);
    count += 1;
  }
  return { parts, count };
}

function unchunk(entity: Record<string, unknown>) {
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

function isNotFound(error: unknown) {
  const e = error as { statusCode?: number; code?: string } | null;
  return (
    e?.statusCode === 404 ||
    e?.code === "ResourceNotFound" ||
    e?.code === "TableNotFound"
  );
}

class TableContentStore implements ContentStore {
  // Declared rather than written as a constructor parameter property, so the
  // module can be loaded by plain `node --experimental-strip-types` in tests.
  private readonly client: TableClient;

  constructor(client: TableClient) {
    this.client = client;
  }

  async read(): Promise<StoredSnapshot | null> {
    let entity: Record<string, unknown>;
    try {
      entity = (await this.client.getEntity(PARTITION_KEY, ROW_KEY)) as Record<
        string,
        unknown
      >;
    } catch (error) {
      // Nothing saved yet is the normal state of a fresh deployment.
      if (isNotFound(error)) return null;
      throw error;
    }

    return {
      snapshot: JSON.parse(unchunk(entity)) as ContentSnapshot,
      version: Number(entity.version ?? 0),
      chunkCount: Number(entity.chunkCount ?? 0),
    };
  }

  async write({
    snapshot,
    baseVersion,
    updatedBy,
  }: {
    snapshot: ContentSnapshot;
    baseVersion: number;
    updatedBy: string;
  }): Promise<SaveResult> {
    try {
      await this.client.createTable();
    } catch (error) {
      const e = error as { statusCode?: number; code?: string };
      if (e?.statusCode !== 409 && e?.code !== "TableAlreadyExists") throw error;
    }

    const current = await this.read();
    const currentVersion = current?.version ?? 0;

    /*
     * Someone else saved since this edit started. Refusing is the point:
     * accepting would erase their change without either person knowing.
     */
    if (baseVersion !== currentVersion) {
      return {
        conflict: true,
        currentVersion,
        current: current?.snapshot ?? null,
      };
    }

    const version = currentVersion + 1;
    const updatedAt = new Date().toISOString();
    const payload = JSON.stringify({ ...snapshot, version, updatedAt });
    const { parts, count } = chunk(payload);

    // Clear any chunk a larger previous save left behind, or the next read
    // would stop short of it and parse truncated JSON.
    const stale: Record<string, null> = {};
    for (let i = count; i < (current?.chunkCount ?? 0); i += 1) {
      stale[`chunk${i}`] = null;
    }

    const entity = {
      partitionKey: PARTITION_KEY,
      rowKey: ROW_KEY,
      version,
      updatedAt,
      updatedBy,
      chunkCount: count,
      ...parts,
      ...stale,
    };

    // "Replace", not "Merge": the row is the whole document, so properties
    // from a previous shape must not survive the save.
    if (current) await this.client.updateEntity(entity, "Replace");
    else await this.client.createEntity(entity);

    return { conflict: false, version, updatedAt };
  }
}

/**
 * An in-memory store, for running and testing the server without Azure.
 *
 * Only ever reachable with CONTENT_STORE=memory set explicitly, and refused in
 * production below — a server that silently accepted saves and dropped them on
 * restart would look like it was working.
 */
class MemoryContentStore implements ContentStore {
  private state: StoredSnapshot | null = null;

  async read() {
    return this.state;
  }

  async write({
    snapshot,
    baseVersion,
  }: {
    snapshot: ContentSnapshot;
    baseVersion: number;
    updatedBy: string;
  }): Promise<SaveResult> {
    const currentVersion = this.state?.version ?? 0;
    if (baseVersion !== currentVersion) {
      return {
        conflict: true,
        currentVersion,
        current: this.state?.snapshot ?? null,
      };
    }
    const version = currentVersion + 1;
    const updatedAt = new Date().toISOString();
    this.state = {
      snapshot: { ...snapshot, version, updatedAt },
      version,
      chunkCount: 1,
    };
    return { conflict: false, version, updatedAt };
  }
}

/*
 * Held on globalThis rather than in a module variable.
 *
 * The page and the route handler are bundled into separate chunks, each with
 * its own copy of this module, so a plain module variable gives them a store
 * each. With the in-memory store that means a save through the API is invisible
 * to the page that renders the site — and `next dev` discards module state on
 * every reload besides. One object per process is what both actually want.
 */
const STORE_KEY = Symbol.for("lantern-maps.content-store");
type StoreHolder = { [STORE_KEY]?: ContentStore | null };

export function getContentStore(): ContentStore {
  const holder = globalThis as StoreHolder;
  const cached = holder[STORE_KEY];
  if (cached) return cached;

  if (process.env.CONTENT_STORE === "memory") {
    if (process.env.NODE_ENV === "production" && !process.env.ALLOW_MEMORY_STORE) {
      throw new Error(
        "CONTENT_STORE=memory is for local development. Saves would be lost on restart. " +
          "Set AZURE_STORAGE_CONNECTION_STRING instead, or ALLOW_MEMORY_STORE=1 if this is deliberate.",
      );
    }
    const store = new MemoryContentStore();
    holder[STORE_KEY] = store;
    return store;
  }

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error(
      "AZURE_STORAGE_CONNECTION_STRING is not set. Add it to the App Service configuration.",
    );
  }

  const store = new TableContentStore(
    TableClient.fromConnectionString(connectionString, TABLE_NAME),
  );
  holder[STORE_KEY] = store;
  return store;
}

/**
 * Builds a store over a given Table client. Exported so the tests can hand it
 * a stand-in — Azure is not reachable from CI, and what is worth testing here
 * is the chunking and the concurrency rules rather than the SDK.
 */
export function createTableContentStore(client: TableClient): ContentStore {
  return new TableContentStore(client);
}

/** Tests inject their own; nothing else should call this. */
export function __setContentStoreForTests(store: ContentStore | null) {
  (globalThis as StoreHolder)[STORE_KEY] = store;
}
