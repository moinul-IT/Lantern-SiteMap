import "server-only";
import { SEED_CONTENT } from "@/lib/content/seed";
import type { ContentSnapshot } from "@/lib/content/types";
import { getContentStore } from "./content-store";

/**
 * The content to render a page with, read at request time.
 *
 * This is what makes the site worth hosting rather than exporting: a visitor
 * gets the snapshot as it stands when they ask for the page, not as it stood
 * when the build ran. A correction made a minute ago is already in the HTML.
 *
 * It never throws. If the store is unreachable or empty the build's own
 * snapshot is served instead — a day-one map with slightly stale rosters beats
 * an error page, and the client re-checks the API as soon as it mounts.
 */
export async function loadContent(): Promise<ContentSnapshot> {
  try {
    const stored = await getContentStore().read();
    return stored?.snapshot ?? SEED_CONTENT;
  } catch (error) {
    console.error("[content] falling back to the build's snapshot", error);
    return SEED_CONTENT;
  }
}
