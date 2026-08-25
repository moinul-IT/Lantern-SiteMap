"use client";

import { useEffect, useState } from "react";
import { motion, type PanInfo } from "framer-motion";
import CoverageCard from "./CoverageCard";
import SitePhoto from "./SitePhoto";
import { nearestSites, formatDistance } from "@/lib/geo";
import { openDirections } from "@/lib/directions";
import {
  BOROUGH_COLORS,
  OFFICE_COLORS,
  SITES,
  isOffice,
  type Place,
} from "@/lib/sites";

/** Tuple-typed so spreading the motion presets below keeps a valid `ease`. */
const EASE_IN = [0.4, 0, 1, 1] as const;

type Props = {
  site: Place;
  onClose: () => void;
  onSelect: (id: string) => void;
  /** Opens the full in-depth view for this place. */
  onExpand: (id: string) => void;
};

/**
 * Reads the breakpoint once on mount. Safe from hydration mismatch because this
 * component only ever mounts after a user selects a place — it is never part of
 * the server-rendered HTML.
 */
function useIsPhone() {
  const [isPhone, setIsPhone] = useState(
    () =>
      typeof window !== "undefined" &&
      !window.matchMedia("(min-width: 768px)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsPhone(!mq.matches);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isPhone;
}

export default function DetailPanel({
  site,
  onClose,
  onSelect,
  onExpand,
}: Props) {
  const office = isOffice(site);
  const color = office ? OFFICE_COLORS : BOROUGH_COLORS[site.borough];
  const tag = office ? site.label : site.borough;
  // For the office this answers "which sites are closest to the office?".
  const nearby = nearestSites(site, SITES, 3);
  const isPhone = useIsPhone();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  /** Flick down or drag past a third of the sheet to dismiss. */
  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  }

  const sheetMotion = {
    initial: { y: "100%" },
    animate: { y: 0 },
    exit: { y: "100%", transition: { duration: 0.2, ease: EASE_IN } },
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 34,
      mass: 0.8,
    },
    drag: "y" as const,
    dragConstraints: { top: 0, bottom: 0 },
    dragElastic: { top: 0, bottom: 0.6 },
    onDragEnd,
  };

  const panelMotion = {
    initial: { opacity: 0, x: 44 },
    animate: { opacity: 1, x: 0 },
    exit: {
      opacity: 0,
      x: 32,
      transition: { duration: 0.18, ease: EASE_IN },
    },
    transition: {
      type: "spring" as const,
      stiffness: 260,
      damping: 30,
      mass: 0.9,
    },
  };

  return (
    <motion.aside
      aria-label={`${site.name} details`}
      {...(isPhone ? sheetMotion : panelMotion)}
      className={[
        "border border-hairline bg-paper shadow-lift",
        // Phone: bottom sheet pinned to the viewport, rounded top only. Kept to
        // roughly half the screen so the map above it stays visible and
        // pannable while a site is selected — only "Full details" takes over.
        "fixed inset-x-0 bottom-0 z-[800] flex max-h-[54svh] flex-col rounded-t-2xl border-x-0 border-b-0 max-md:landscape:max-h-[76svh]",
        // Desktop: back to the floating right-hand panel. min-h-0 lets it
        // shrink into whatever height is left in the rail and scroll its own
        // body, instead of running off the bottom of a short screen.
        "md:static md:z-auto md:max-h-none md:min-h-0 md:w-[360px] md:rounded-2xl md:border",
        "overflow-hidden",
      ].join(" ")}
    >
      {/* Grab handle — phones only. */}
      <div className="flex shrink-0 justify-center pt-2.5 pb-1 md:hidden">
        <span aria-hidden="true" className="sheet-handle" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* Rounded top corners come from the panel's own overflow-hidden. */}
        <div className="hidden md:block">
          <SitePhoto site={site} />
        </div>

        <div className="safe-b-0 px-5 pt-3 pb-5 md:px-6 md:pt-5 md:pb-6">
          <div className="flex items-start justify-between gap-3">
            <span
              className="inline-flex items-center gap-2 rounded-full px-2.5 py-1"
              style={{ background: color.soft }}
            >
              <span
                aria-hidden="true"
                className={
                  office ? "size-1.5 rounded-[2px]" : "size-1.5 rounded-full"
                }
                style={{ background: color.base }}
              />
              <span
                className="font-mono text-[10px] tracking-[0.14em] uppercase"
                style={{ color: color.base }}
              >
                {tag}
              </span>
            </span>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close details"
              className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors duration-200 hover:bg-cream-deep hover:text-ink md:-mt-1 md:size-8"
            >
              <svg
                viewBox="0 0 16 16"
                className="size-4 md:size-3.5"
                aria-hidden="true"
              >
                <path
                  d="M3.5 3.5l9 9m0-9l-9 9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </button>
          </div>

          <h2 className="mt-2 font-display text-[24px] leading-tight font-normal tracking-[-0.01em] text-ink md:mt-3 md:text-[27px]">
            {site.name}
          </h2>

          <div className="mt-4 border-t border-hairline pt-4 md:mt-5">
            <p className="eyebrow">Address</p>
            <p className="mt-1.5 text-sm text-ink">{site.address}</p>
            {office && <p className="text-sm text-ink">{site.floor}</p>}
            <p className="text-sm text-ink-soft">
              {site.city} {site.zip}
            </p>
          </div>

          <div className="mt-4 border-t border-hairline pt-4 md:mt-5">
            <p className="eyebrow">Nearby sites</p>
            <ul className="mt-1.5 space-y-0.5 md:mt-2.5">
              {nearby.map(({ site: neighbour, miles }) => (
                <li key={neighbour.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(neighbour.id)}
                    className="-mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors duration-200 hover:bg-cream active:bg-cream-deep md:min-h-0"
                  >
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        background: BOROUGH_COLORS[neighbour.borough].base,
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">
                      {neighbour.name}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-ink-faint tabular-nums">
                      {formatDistance(miles)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <CoverageCard siteId={site.id} compact />
        </div>
      </div>

      {/* Actions live outside the scroll area so they stay reachable however
          little height the panel gets. */}
      <div className="safe-b-0 shrink-0 border-t border-hairline bg-paper px-5 py-3.5 md:px-6 md:py-4">
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => onExpand(site.id)}
            className="min-h-11 flex-1 rounded-xl bg-ink px-4 py-3 text-[13px] font-medium text-cream transition-colors duration-200 hover:bg-[#463a2c] active:bg-[#5a4a38]"
          >
            Full details
          </button>
          <button
            type="button"
            onClick={() => openDirections(site)}
            className="min-h-11 rounded-xl border border-hairline bg-paper px-4 py-3 text-[13px] text-ink-soft transition-colors duration-200 hover:bg-cream hover:text-ink active:bg-cream-deep"
          >
            Directions
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
