"use strict";

/**
 * GET /api/me — who is signed in, and may they edit.
 *
 * The management tool asks this to decide whether to show the editor or a
 * "sign in" prompt. It is a convenience for the UI, not a security boundary:
 * the answer that matters is the one PUT /api/content gives.
 */

const { app } = require("@azure/functions");
const { readPrincipal, isContentManager } = require("../lib/principal");

async function me(request) {
  const principal = readPrincipal(request);

  return {
    status: 200,
    headers: { "Cache-Control": "no-store, max-age=0" },
    jsonBody: {
      signedIn: Boolean(principal),
      name: principal?.userDetails ?? null,
      roles: principal?.userRoles ?? [],
      canEdit: isContentManager(principal),
    },
  };
}

app.http("me", {
  route: "me",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: me,
});

module.exports = { me };
