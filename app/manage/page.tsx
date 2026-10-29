import type { Metadata } from "next";
import ContentProvider from "@/components/ContentProvider";
import ManageApp from "@/components/manage/ManageApp";

export const metadata: Metadata = {
  title: "Content manager",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The management tool, deployed as part of the same Static Web App as the
 * site it edits.
 *
 * Access is enforced in two places: `staticwebapp.config.json` restricts this
 * route to the `contentmanager` role, and `PUT /api/content` checks the role
 * again before writing. The route rule keeps the page out of sight; the API
 * check is the one that actually protects the data.
 *
 * It reads through the same ContentProvider the public site uses, so the editor
 * always starts from exactly what is published.
 */
export default function ManagePage() {
  return (
    <main className="min-h-[100dvh] bg-cream">
      <ContentProvider>
        <ManageApp />
      </ContentProvider>
    </main>
  );
}
