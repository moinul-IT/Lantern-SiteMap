import type { NextRequest } from "next/server";
import {
  isContentManager,
  loginUrl,
  logoutUrl,
  readPrincipal,
} from "@/lib/server/principal";

/**
 * GET /api/me — who is signed in, and may they edit.
 *
 * The management tool asks this to decide whether to show the editor or a
 * "sign in" prompt, and where those links point. It is a convenience for the
 * UI, not a security boundary: the answer that matters is the one
 * PUT /api/content gives.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const principal = readPrincipal(request);

  return Response.json(
    {
      signedIn: Boolean(principal),
      name: principal?.userDetails ?? null,
      roles: principal?.userRoles ?? [],
      canEdit: isContentManager(principal),
      loginUrl: loginUrl("/manage"),
      logoutUrl: logoutUrl("/"),
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
