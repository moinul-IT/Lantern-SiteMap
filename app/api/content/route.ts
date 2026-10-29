import type { NextRequest } from "next/server";
import type { ContentSnapshot } from "@/lib/content/types";
import { getContentStore } from "@/lib/server/content-store";
import { isContentManager, readPrincipal } from "@/lib/server/principal";
import { validateSnapshot } from "@/lib/server/validate";

/**
 * GET  /api/content — the current snapshot. Anonymous: it is what the public
 *                     site renders, and the site is already readable.
 * PUT  /api/content — save a new snapshot. Content managers only.
 *
 * The role is enforced here rather than only at the edge. App Service can be
 * told to require sign-in for a path, but that is a line of config someone
 * could widen by accident, and this is the write path for every record on the
 * site.
 */

// Reads the store and the caller's identity on every request; nothing about
// this response may be prerendered or reused.
export const dynamic = "force-dynamic";

const json = (status: number, body: unknown) =>
  Response.json(body, {
    status,
    // Never cached anywhere: a content manager's save has to be the next thing
    // every visitor sees, not the thing after that.
    headers: { "Cache-Control": "no-store, max-age=0" },
  });

export async function GET() {
  try {
    const stored = await getContentStore().read();
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
    console.error("[content] reading the snapshot failed", error);
    // Also an error rather than a body: the client falls back to its own copy.
    return json(503, { error: "content store unavailable" });
  }
}

export async function PUT(request: NextRequest) {
  const principal = readPrincipal(request);
  if (!principal) return json(401, { error: "sign in to save changes" });
  if (!isContentManager(principal)) {
    return json(403, {
      error: "the content manager role is required to save changes",
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "body is not valid JSON" });
  }

  const envelope = body as { snapshot?: unknown; baseVersion?: unknown } | null;
  const snapshot = envelope && typeof envelope === "object" ? envelope.snapshot : null;
  const baseVersion =
    envelope && typeof envelope === "object" ? envelope.baseVersion : undefined;

  if (!snapshot) return json(400, { error: "body must be { snapshot, baseVersion }" });
  if (!Number.isInteger(baseVersion) || (baseVersion as number) < 0) {
    return json(400, {
      error: "baseVersion must be the version this edit started from",
    });
  }

  const { valid, errors } = validateSnapshot(snapshot);
  if (!valid) {
    console.warn("[content] rejected an invalid snapshot", errors.slice(0, 5));
    return json(422, {
      error: "the content is not valid",
      details: errors.slice(0, 20),
    });
  }

  try {
    const result = await getContentStore().write({
      // Safe to assert now: validateSnapshot above checked every field the
      // type promises, which is more than a structural cast would.
      snapshot: snapshot as ContentSnapshot,
      baseVersion: baseVersion as number,
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

    console.log(
      `[content] saved as version ${result.version} by ${principal.userDetails}`,
    );
    return json(200, { version: result.version, updatedAt: result.updatedAt });
  } catch (error) {
    console.error("[content] saving the snapshot failed", error);
    return json(503, { error: "content store unavailable" });
  }
}
