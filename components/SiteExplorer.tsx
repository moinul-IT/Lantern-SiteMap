"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import AllSitesView, { type GroupBy } from "./AllSitesView";
import BoroughChips from "./BoroughChips";
import CoverageAdmin from "./CoverageAdmin";
import CoverageProvider from "./CoverageProvider";
import DetailPanel from "./DetailPanel";
import GroupByToggle from "./GroupByToggle";
import Legend from "./Legend";
import MapModeToggles from "./MapModeToggles";
import SearchField from "./SearchField";
import SearchResults from "./SearchResults";
import SiteDetailSkeleton from "./SiteDetailSkeleton";
import TitleBlock from "./TitleBlock";
import ViewToggle, { type View } from "./ViewToggle";
import { filterSites, matchesQuery, type BoroughFilter } from "@/lib/filter";
import {
  MAIN_OFFICE,
  PLACES_BY_ID,
  SITES,
  countByBorough,
  countByCluster,
  shelterCount,
} from "@/lib/sites";

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

function SiteExplorerBody() {
  const [view, setView] = useState<View>("map");
  const [query, setQuery] = useState("");
  const [borough, setBorough] = useState<BoroughFilter>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [wideViewport, setWideViewport] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [clusterMode, setClusterMode] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>("borough");
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
  const clusterCounts = useMemo(
    () => countByCluster(visibleSites),
    [visibleSites],
  );
  const shelters = useMemo(() => shelterCount(visibleSites), [visibleSites]);
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

  /** Cluster mode and cluster grouping stay in step across both views. */
  const applyClusterMode = useCallback((on: boolean) => {
    setClusterMode(on);
    setGroupBy(on ? "cluster" : "borough");
  }, []);

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
      {/* Full-width on portrait phones (its own row); from sm up it shrinks to
          share a row with the toggle rather than wrapping. */}
      <div className="w-full min-w-0 sm:w-auto sm:flex-1 md:w-[300px] md:flex-none">
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
          className="safe-t safe-b safe-x fixed inset-0 z-[900] flex overflow-y-auto overscroll-contain bg-ink/25 backdrop-blur-[3px] sm:p-8"
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

  if (view === "coverage") {
    return (
      <MotionConfig reducedMotion="user">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
          className="flex h-full flex-col overflow-x-hidden overflow-y-auto overscroll-contain bg-cream"
        >
          <div className="safe-t safe-b safe-x mx-auto flex w-full max-w-[1600px] flex-1 flex-col md:px-10">
            <header className="flex flex-col gap-3 border-b border-hairline pb-5 md:gap-5 md:pb-6 lg:flex-row lg:items-end lg:justify-between">
              <TitleBlock title="Coverage" count={visibleSites.length} />
              <div className="flex w-full flex-wrap items-center gap-2 sm:flex-nowrap md:w-auto md:gap-2.5">
                <ViewToggle value={view} onChange={setView} />
              </div>
            </header>

            <div className="flex flex-1 flex-col pt-5 md:pt-7">
              <CoverageAdmin onOpenSite={openDetail} />
            </div>

            <footer className="mt-6 border-t border-hairline pt-4 md:mt-8">
              <p className="font-mono text-[11px] text-ink-faint">
                Read-only. Procurement is assigned per cluster and inherited by
                every site in it; VP and Grant Analyst are per site
              </p>
            </footer>
          </div>

          {detailOverlay}
        </motion.div>
      </MotionConfig>
    );
  }

  if (view === "list") {
    return (
      <MotionConfig reducedMotion="user">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
          className="flex h-full flex-col overflow-x-hidden overflow-y-auto overscroll-contain bg-cream"
        >
          <div className="safe-t safe-b safe-x mx-auto flex w-full max-w-[1600px] flex-1 flex-col md:px-10">
            <header className="flex flex-col gap-3 border-b border-hairline pb-5 md:gap-5 md:pb-6 lg:flex-row lg:items-end lg:justify-between">
              <TitleBlock title="All sites" count={visibleSites.length} />
              <div className="flex flex-col gap-2 md:gap-3 lg:items-end">
                <div className="flex w-full flex-wrap items-center gap-2 sm:flex-nowrap md:w-auto md:gap-2.5">
                  {controls}
                </div>
                <BoroughChips value={borough} onChange={setBorough} />
                <GroupByToggle value={groupBy} onChange={setGroupBy} />
              </div>
            </header>

            <div className="flex flex-1 flex-col pt-5 md:pt-7">
              <AllSitesView
                sites={visibleSites}
                office={office}
                selectedId={detailId ?? selected?.id ?? null}
                onSelect={openDetail}
                groupBy={groupBy}
              />
            </div>

            <footer className="mt-6 flex flex-col gap-2 border-t border-hairline pt-4 md:mt-8 md:flex-row md:items-center md:justify-between">
              <p className="hidden font-mono text-[11px] text-ink-faint md:block">
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
          liftAboveSheet={Boolean(selected) && !wideViewport}
          fitToken={fitToken}
          colorMode={clusterMode ? "cluster" : "borough"}
          showLabels={showLabels}
        />

        {/* Floating chrome. The wrapper ignores pointer events so the map stays draggable. */}
        <div className="safe-t safe-x pointer-events-none absolute inset-0 z-[600] flex flex-col justify-between gap-3 pb-3 md:gap-4 md:pb-6">
          {/* max-md:landscape: phones on their side only have ~375px of height,
              so the title and the controls share a row instead of stacking.
              Scoped with max-md because every desktop window is landscape too,
              and these rules otherwise win over the md: ones below.
              md:min-h-0 lets this row shrink to the viewport instead of pushing
              the panel (and the legend) off the bottom of the screen. */}
          <div className="flex flex-col gap-2.5 max-md:landscape:flex-row max-md:landscape:items-start max-md:landscape:justify-between md:min-h-0 md:flex-row md:items-start md:justify-between md:gap-4">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.34, ease: [0.22, 0.61, 0.36, 1] }}
              className="pointer-events-auto self-start rounded-full border border-hairline bg-paper/95 px-4 py-2.5 shadow-float backdrop-blur-sm md:rounded-2xl md:px-5 md:py-4"
            >
              <TitleBlock title="Lantern Maps" count={visibleSites.length} />
            </motion.div>

            {/* min-w-0 + flex-1 lets the chip rail shrink to the space left beside
                the title instead of overflowing past the right edge.
                The rail itself stays pointer-events-none and hands interactivity
                to its cards instead: any bare rail area is an invisible sheet
                over the map that eats scroll and drag. md:w-auto keeps it from
                stretching across the map on top of that. */}
            <div className="pointer-events-none flex w-full flex-col gap-2 [&>*]:pointer-events-auto max-md:landscape:min-w-0 max-md:landscape:flex-1 max-md:landscape:items-end md:max-h-full md:w-auto md:min-h-0 md:min-w-0 md:shrink md:grow-0 md:items-end md:gap-2.5 md:overflow-y-auto">
              {/* Wraps on phones so the search input gets its own full-width
                  row below the view toggle; stays inline from md up. */}
              <div className="flex w-full flex-wrap items-center gap-2 sm:flex-nowrap md:w-auto md:gap-2.5">
                {controls}
              </div>
              <BoroughChips value={borough} onChange={setBorough} />
              <MapModeToggles
                showLabels={showLabels}
                onShowLabelsChange={setShowLabels}
                clusterMode={clusterMode}
                onClusterModeChange={applyClusterMode}
              />

              <AnimatePresence>
                {showResults && (
                  <SearchResults
                    key="results"
                    results={visibleSites}
                    onSelect={selectSite}
                  />
                )}
              </AnimatePresence>

              {/* On phones DetailPanel positions itself `fixed` as a bottom
                  sheet; from md up it sits here in the right-hand column. */}
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

          {/* From md up the legend is pinned to the bottom-left rather than
              taking a row, so the right-hand panel can use the full height
              beside it. px-6/pb-6 restore the wrapper's md safe-area padding,
              which an absolute child sits outside of. */}
          <div className="flex items-end justify-between gap-4 md:absolute md:inset-x-0 md:bottom-0 md:px-6 md:pb-6">
            <div className="pointer-events-auto">
              <Legend
                counts={counts}
                clusterCounts={clusterCounts}
                shelters={shelters}
                clusterMode={clusterMode}
                office={office}
              />
            </div>
          </div>
        </div>

        {detailOverlay}
      </div>
    </MotionConfig>
  );
}

/**
 * The provider wraps every view so a cluster assignment edited in Coverage is
 * reflected on the map panels and the in-depth views immediately.
 */
export default function SiteExplorer() {
  return (
    <CoverageProvider>
      <SiteExplorerBody />
    </CoverageProvider>
  );
}
