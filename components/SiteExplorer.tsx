"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import AllSitesView from "./AllSitesView";
import BoroughChips from "./BoroughChips";
import DetailPanel from "./DetailPanel";
import Legend from "./Legend";
import SearchField from "./SearchField";
import SearchResults from "./SearchResults";
import SiteDetailSkeleton from "./SiteDetailSkeleton";
import TitleBlock from "./TitleBlock";
import ViewToggle, { type View } from "./ViewToggle";
import { filterSites, matchesQuery, type BoroughFilter } from "@/lib/filter";
import { MAIN_OFFICE, PLACES_BY_ID, SITES, countByBorough } from "@/lib/sites";

// Leaflet touches `window` at import time, so this must never render on the server.
const SiteMap = dynamic(() => import("./SiteMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-cream">
      <span className="eyebrow animate-pulse">Loading map…</span>
    </div>
  ),
});

// The in-depth view is only needed once a row is opened, so it ships as its own
// chunk behind a skeleton.
const SiteDetailView = dynamic(() => import("./SiteDetailView"), {
  ssr: false,
  loading: () => <SiteDetailSkeleton />,
});

/** Panel width on sm+; also drives how far the map shifts when it opens. */
const PANEL_WIDTH = 360;

export default function SiteExplorer() {
  const [view, setView] = useState<View>("map");
  const [query, setQuery] = useState("");
  const [borough, setBorough] = useState<BoroughFilter>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [wideViewport, setWideViewport] = useState(false);
  // Bumped to ask the map to re-fit the current set (e.g. after closing a pin).
  const [fitToken, setFitToken] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setWideViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const visibleSites = useMemo(
    () => filterSites(SITES, query, borough),
    [query, borough],
  );
  const counts = useMemo(() => countByBorough(visibleSites), [visibleSites]);
  const boroughsShown = Object.values(counts).filter((n) => n > 0).length;

  // The office isn't a borough site, so a borough chip hides it — that keeps
  // each borough's pin count equal to its legend count.
  const office = useMemo(
    () =>
      borough === "All" && matchesQuery(MAIN_OFFICE, query)
        ? MAIN_OFFICE
        : null,
    [borough, query],
  );

  const visibleIds = useMemo(() => {
    const ids = new Set(visibleSites.map((s) => s.id));
    if (office) ids.add(office.id);
    return ids;
  }, [visibleSites, office]);

  const selected =
    selectedId && visibleIds.has(selectedId)
      ? (PLACES_BY_ID.get(selectedId) ?? null)
      : null;

  const detailPlace = detailId ? (PLACES_BY_ID.get(detailId) ?? null) : null;

  /**
   * Selecting always reveals the place. Nearby links can point outside the
   * current filters, so relax them rather than open a panel with no marker.
   */
  const selectSite = useCallback(
    (id: string) => {
      const place = PLACES_BY_ID.get(id);
      if (!place) return;
      const isOfficePlace = id === MAIN_OFFICE.id;
      if (
        borough !== "All" &&
        (isOfficePlace || ("borough" in place && place.borough !== borough))
      ) {
        setBorough("All");
      }
      if (query && !matchesQuery(place, query)) setQuery("");
      setSelectedId(id);
    },
    [borough, query],
  );

  /** List rows open the in-depth view rather than jumping to the map. */
  const openDetail = useCallback((id: string) => setDetailId(id), []);
  const closeDetail = useCallback(() => setDetailId(null), []);

  /** "View on map" from the in-depth view. */
  const viewOnMap = useCallback(
    (id: string) => {
      selectSite(id);
      setDetailId(null);
      setView("map");
    },
    [selectSite],
  );

  /** Closing a pin zooms back out to whatever the filters currently show. */
  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setFitToken((token) => token + 1);
  }, []);

  useEffect(() => {
    if (!detailId) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDetailId(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailId]);

  const controls = (
    <>
      <ViewToggle value={view} onChange={setView} />
      <div className="w-full sm:w-[300px]">
        <SearchField value={query} onChange={setQuery} />
      </div>
    </>
  );

  const detailOverlay = (
    <AnimatePresence>
      {detailPlace && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.16 } }}
          transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
          onClick={closeDetail}
          className="fixed inset-0 z-[900] flex overflow-y-auto bg-ink/25 p-4 backdrop-blur-[3px] sm:p-8"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${detailPlace.name} details`}
            key={detailPlace.id}
            initial={{ opacity: 0, y: 20, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: 12,
              scale: 0.99,
              transition: { duration: 0.16 },
            }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 30,
              mass: 0.9,
            }}
            onClick={(event) => event.stopPropagation()}
            className="m-auto w-full max-w-[560px]"
          >
            <SiteDetailView
              place={detailPlace}
              onClose={closeDetail}
              onViewOnMap={viewOnMap}
              onOpenPlace={openDetail}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (view === "list") {
    return (
      <MotionConfig reducedMotion="user">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
          className="flex h-full flex-col overflow-y-auto bg-cream"
        >
          <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-6 py-7 md:px-10">
            <header className="flex flex-col gap-5 border-b border-hairline pb-6 lg:flex-row lg:items-end lg:justify-between">
              <TitleBlock title="All sites" count={visibleSites.length} />
              <div className="flex flex-col gap-3 lg:items-end">
                <div className="flex flex-wrap items-center gap-2.5">
                  {controls}
                </div>
                <BoroughChips value={borough} onChange={setBorough} />
              </div>
            </header>

            <div className="flex flex-1 flex-col pt-7">
              <AllSitesView
                sites={visibleSites}
                office={office}
                selectedId={detailId ?? selected?.id ?? null}
                onSelect={openDetail}
              />
            </div>

            <footer className="mt-8 flex items-center justify-between border-t border-hairline pt-4">
              <p className="font-mono text-[11px] text-ink-faint">
                Right column shows the closest other site and its distance
              </p>
              <p className="font-mono text-[11px] text-ink-faint tabular-nums">
                {visibleSites.length}{" "}
                {visibleSites.length === 1 ? "site" : "sites"} · {boroughsShown}{" "}
                {boroughsShown === 1 ? "borough" : "boroughs"}
                {office ? " · 1 office" : ""}
              </p>
            </footer>
          </div>

          {detailOverlay}
        </motion.div>
      </MotionConfig>
    );
  }

  const showResults = query.trim().length > 0 && !selected;

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-full w-full overflow-hidden">
        <SiteMap
          sites={visibleSites}
          office={office}
          selected={selected}
          selectedId={selected?.id ?? null}
          onSelect={selectSite}
          panOffsetX={selected && wideViewport ? PANEL_WIDTH + 24 : 0}
          fitToken={fitToken}
        />

        {/* Floating chrome. The wrapper ignores pointer events so the map stays draggable. */}
        <div className="pointer-events-none absolute inset-0 z-[600] p-5 md:p-6">
          <div className="flex h-full flex-col justify-between gap-4">
            <div className="flex items-start justify-between gap-4">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.34, ease: [0.22, 0.61, 0.36, 1] }}
                className="pointer-events-auto rounded-2xl border border-hairline bg-paper/95 px-5 py-4 shadow-float backdrop-blur-sm"
              >
                <TitleBlock title="Lantern Sites" count={visibleSites.length} />
              </motion.div>

              <div className="pointer-events-auto flex max-h-full flex-col items-end gap-2.5 overflow-y-auto">
                <div className="flex items-center gap-2.5">{controls}</div>
                <BoroughChips value={borough} onChange={setBorough} />

                <AnimatePresence>
                  {showResults && (
                    <SearchResults
                      key="results"
                      results={visibleSites}
                      onSelect={selectSite}
                    />
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {selected && (
                    <DetailPanel
                      key={selected.id}
                      site={selected}
                      onClose={clearSelection}
                      onSelect={selectSite}
                      onExpand={openDetail}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex items-end justify-between gap-4">
              <div className="pointer-events-auto">
                <Legend counts={counts} office={office} />
              </div>
            </div>
          </div>
        </div>

        {detailOverlay}
      </div>
    </MotionConfig>
  );
}
