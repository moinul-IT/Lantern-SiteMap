"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { SEED_CONTENT } from "@/lib/content/seed";
import { isContentSnapshot, type ContentSnapshot } from "@/lib/content/types";
import {
  buildContentIndex,
  type ContentIndex,
} from "@/lib/content/index-content";

/** Where the content manager's saved snapshot is served from. */
export const CONTENT_ENDPOINT = "/api/content";

const ContentContext = createContext<ContentIndex | null>(null);

/**
 * The single place every view reads site and org-chart content from.
 *
 * It starts from `SEED_CONTENT`, which is compiled into the bundle, so the
 * first paint is immediate, works with no network, and is identical to what
 * this build shipped with. Once mounted it asks the API for a saved snapshot
 * and swaps it in if one comes back newer.
 *
 * That ordering is what keeps the offline story intact. The app never waits on
 * the network to draw the map: a cold launch in a basement with no signal still
 * gets all 21 sites, every roster and every assignment, because the fallback is
 * the build itself rather than a cache that may or may not be warm.
 *
 * Reads only. Saving belongs with the editing UI, which has to be behind the
 * content-manager role — and an editor that mutates this in memory alone would
 * be worse than none, since it looks saved and is not.
 */
export default function ContentProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<ContentSnapshot>(SEED_CONTENT);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        // no-store: this is the one thing in the app that must not come from a
        // cache. A content manager's edit showing up on the next launch but not
        // this one is the bug this whole layer exists to avoid.
        const response = await fetch(CONTENT_ENDPOINT, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) return;

        const body: unknown = await response.json();
        if (!isContentSnapshot(body)) {
          console.warn("[content] ignoring a malformed snapshot");
          return;
        }

        // Last write wins by version, not by arrival order: a slow response
        // must never replace content that is already fresher on screen.
        setSnapshot((current) =>
          body.version > current.version ? body : current,
        );
      } catch {
        // Offline, no API deployed yet, or the request was aborted. The seed is
        // already on screen and is a correct answer, so there is nothing to do
        // and nothing worth alarming anyone about.
      }
    })();

    return () => controller.abort();
  }, []);

  const index = useMemo(() => buildContentIndex(snapshot), [snapshot]);

  return (
    <ContentContext.Provider value={index}>{children}</ContentContext.Provider>
  );
}

export function useContent(): ContentIndex {
  const value = useContext(ContentContext);
  if (!value) {
    throw new Error("useContent must be used inside ContentProvider");
  }
  return value;
}
