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

/**
 * The last snapshot this browser successfully fetched.
 *
 * Without it, the fallback is the snapshot compiled into the build — correct on
 * the day it shipped, and increasingly wrong after that as content managers
 * edit. A phone opened in a basement would show the org chart as it stood at
 * the last deploy rather than the last time that phone had signal.
 *
 * localStorage rather than the service worker cache because the worker
 * deliberately never caches /api/: a cached *response* would be served to a
 * page that has no idea it is stale, whereas this is a labelled fallback the
 * code picks between on version.
 */
const CACHE_KEY = "lantern-maps:content";

function readCachedSnapshot(): ContentSnapshot | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isContentSnapshot(parsed) ? parsed : null;
  } catch {
    // Unavailable (private browsing), or junk left by an older version.
    return null;
  }
}

function cacheSnapshot(snapshot: ContentSnapshot) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Full or unavailable. The app still works; it just falls back further.
  }
}

const ContentContext = createContext<ContentIndex | null>(null);

/**
 * The single place every view reads site and org-chart content from.
 *
 * It starts from whatever the server rendered into the page, falling back to
 * `SEED_CONTENT`, which is compiled into the bundle. Either way the first paint
 * is immediate and needs no network. Once mounted it asks the API for a saved
 * snapshot and swaps it in if one comes back newer — which still matters with
 * server rendering, because the service worker can serve a cached copy of the
 * HTML and that copy carries the content it had when it was cached.
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
export default function ContentProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: ContentSnapshot;
}) {
  const [snapshot, setSnapshot] = useState<ContentSnapshot>(
    initial ?? SEED_CONTENT,
  );

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      /*
       * Show the newest thing already on this device before going to the
       * network: whatever was fetched last time, if it beats what arrived with
       * the page. This is what an offline launch gets, and it removes the flash
       * of stale content on a slow connection.
       */
      const cached = readCachedSnapshot();
      if (cached) {
        setSnapshot((current) =>
          cached.version > current.version ? cached : current,
        );
      }

      /*
       * Content the server rendered into this page was current as of the
       * request, so it belongs in the offline cache too — otherwise a device
       * that only ever loads the page keeps falling back to the build, since
       * nothing but a successful fetch used to write the cache. Compared on
       * version, and only after reading, so a cached copy that is somehow
       * newer (the service worker can serve HTML it cached days ago) is not
       * overwritten by an older one.
       */
      if (initial && initial.version > (cached?.version ?? -1)) {
        cacheSnapshot(initial);
      }

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
        cacheSnapshot(body);
      } catch {
        // Offline, no API deployed yet, or the request was aborted. Whatever
        // was cached above — or the build's own snapshot — is already on screen
        // and is a correct answer, so there is nothing to do.
      }
    })();

    return () => controller.abort();
    // `initial` arrives with the HTML and never changes for the life of the
    // page, so this stays a mount-only effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
