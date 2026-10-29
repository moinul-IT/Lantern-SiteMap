"use strict";

/**
 * GET  /api/content — the current snapshot. Anonymous: it is what the public
 *                     site renders, and the site is already readable.
 * PUT  /api/content — save a new snapshot. Content managers only.
 *
 * The role is enforced twice: once by the route rules in
 * staticwebapp.config.json, and again here. The duplication is deliberate —
 * a route rule is a line of config that someone could widen by accident, and
 * this is the write path for every record on the site.
 */

const { app } = require("@azure/functions");
const { readSnapshot, writeSnapshot } = require("../lib/store");
const { readPrincipal, isContentManager } = require("../lib/principal");
const { validateSnapshot } = require("../lib/validate");

const json = (status, body, headers) => ({
  status,
  jsonBody: body,
  headers: {
    // Never cached anywhere: a content manager's save has to be the next thing
    // every visitor sees, not the thing after that.
    "Cache-Control": "no-store, max-age=0",
    ...headers,
  },
});

async function getContent(request, context) {
  try {
    const stored = await readSnapshot();
    if (!stored) {
      /*
       * Nothing saved yet. 404 rather than an empty document: the client reads
       * this as "no snapshot" and keeps the one compiled into its build, which
       * is a correct and complete answer. An empty body would not be.
       */
      return json(404, { error: "no snapshot saved yet" });
    }
    return json(200, stored.snapshot);
  } catch (error) {
    context.error("reading the snapshot failed", error);
    // Also a 503 rather than a body: the client falls back to its own copy.
    return json(503, { error: "content store unavailable" });
  }
}

async function putContent(request, context) {
  const principal = readPrincipal(request);
  if (!principal) return json(401, { error: "sign in to save changes" });
  if (!isContentManager(principal)) {
    return json(403, { error: "the content manager role is required to save changes" });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "body is not valid JSON" });
  }

  const snapshot = body && typeof body === "object" ? body.snapshot : null;
  const baseVersion = body && typeof body === "object" ? body.baseVersion : undefined;

  if (!snapshot) return json(400, { error: "body must be { snapshot, baseVersion }" });
  if (!Number.isInteger(baseVersion) || baseVersion < 0) {
    return json(400, { error: "baseVersion must be the version this edit started from" });
  }

  const { valid, errors } = validateSnapshot(snapshot);
  if (!valid) {
    context.warn("rejected an invalid snapshot", errors.slice(0, 5));
    return json(422, { error: "the content is not valid", details: errors.slice(0, 20) });
  }

  try {
    const result = await writeSnapshot({
      snapshot,
      baseVersion,
      updatedBy: principal.userDetails || principal.userId || "unknown",
    });

    if (result.conflict) {
      /*
       * Someone saved while this edit was open. Refusing is the whole point:
       * accepting would erase their change without either person knowing. The
       * current document goes back with it so the editor can show what landed.
       */
      return json(409, {
        error: "someone else saved while you were editing",
        currentVersion: result.currentVersion,
        current: result.current,
      });
    }

    context.log(`content saved as version ${result.version} by ${principal.userDetails}`);
    return json(200, { version: result.version, updatedAt: result.updatedAt });
  } catch (error) {
    context.error("saving the snapshot failed", error);
    return json(503, { error: "content store unavailable" });
  }
}

app.http("content", {
  route: "content",
  methods: ["GET", "PUT"],
  // SWA does the authenticating; the route rules and the checks above decide
  // who may do what.
  authLevel: "anonymous",
  handler: async (request, context) =>
    request.method === "PUT"
      ? putContent(request, context)
      : getContent(request, context),
});

module.exports = { getContent, putContent };
