import type { Metadata } from "next";
import { headers } from "next/headers";
import { forbidden, unauthorized } from "next/navigation";
import ContentProvider from "@/components/ContentProvider";
import ManageApp from "@/components/manage/ManageApp";
import { loadContent } from "@/lib/server/load-content";
import {
  isContentManager,
  loginUrl,
  logoutUrl,
  readPrincipal,
} from "@/lib/server/principal";

export const metadata: Metadata = {
  title: "Content manager",
  robots: { index: false, follow: false, nocache: true },
};

// Decided from the caller's identity, so there is nothing here to prerender.
export const dynamic = "force-dynamic";

/**
 * The management tool, served by the same app as the site it edits.
 *
 * Access is enforced in two places: this page refuses to render the editor to
 * anyone without the `contentmanager` role, and `PUT /api/content` checks the
 * role again before writing. The page check keeps the editor out of sight; the
 * API check is the one that actually protects the data, and it is the one that
 * still holds if someone calls the endpoint directly.
 *
 * It reads through the same ContentProvider the public site uses, so the editor
 * always starts from exactly what is published.
 */
export default async function ManagePage() {
  const principal = readPrincipal(await headers());

  // Two different people are turned away here and they need different things
  // said to them, so they get different answers: app/unauthorized.tsx and
  // app/forbidden.tsx, with the matching status.
  if (!principal) unauthorized();
  if (!isContentManager(principal)) forbidden();

  const content = await loadContent();

  return (
    <main className="min-h-[100dvh] bg-cream">
      <ContentProvider initial={content}>
        <ManageApp
          initialMe={{
            signedIn: true,
            name: principal.userDetails,
            canEdit: true,
            loginUrl: loginUrl("/manage"),
            logoutUrl: logoutUrl("/"),
          }}
        />
      </ContentProvider>
    </main>
  );
}
