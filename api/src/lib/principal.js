"use strict";

/**
 * Who is calling, according to Static Web Apps.
 *
 * SWA authenticates the request at the edge and passes the result down in the
 * `x-ms-client-principal` header: base64 JSON with the user's id, provider,
 * name and roles. It is injected by the platform and cannot be set by the
 * caller — SWA strips any inbound copy — which is what makes it safe to trust
 * here, but only because the function is unreachable except through SWA.
 */

/** The role allowed to change content. Assigned per user in the Azure portal. */
const CONTENT_MANAGER_ROLE = "contentmanager";

function readPrincipal(request) {
  const header =
    typeof request.headers?.get === "function"
      ? request.headers.get("x-ms-client-principal")
      : request.headers?.["x-ms-client-principal"];

  if (!header) return null;

  try {
    const decoded = Buffer.from(header, "base64").toString("utf8");
    const parsed = JSON.parse(decoded);
    return {
      userId: parsed.userId ?? null,
      userDetails: parsed.userDetails ?? null,
      identityProvider: parsed.identityProvider ?? null,
      userRoles: Array.isArray(parsed.userRoles) ? parsed.userRoles : [],
    };
  } catch {
    // A malformed header is treated as no principal rather than an error: the
    // caller is simply not authenticated, and the route rules already said so.
    return null;
  }
}

function isContentManager(principal) {
  return Boolean(principal?.userRoles?.includes(CONTENT_MANAGER_ROLE));
}

module.exports = { CONTENT_MANAGER_ROLE, readPrincipal, isContentManager };
