import SiteExplorer from "@/components/SiteExplorer";
import { loadContent } from "@/lib/server/load-content";

/*
 * Rendered per request so the map arrives carrying the content as it stands
 * right now. A content manager's correction is in the HTML of the very next
 * page load rather than in a second render after the client fetches.
 */
export const dynamic = "force-dynamic";

export default async function Home() {
  const content = await loadContent();

  return (
    <main className="h-full w-full">
      <SiteExplorer initialContent={content} />
    </main>
  );
}
