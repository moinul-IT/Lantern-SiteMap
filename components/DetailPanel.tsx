"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
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

type Props = {
  site: Place;
  onClose: () => void;
  onSelect: (id: string) => void;
  /** Opens the full in-depth view for this place. */
  onExpand: (id: string) => void;
};

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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // No reset needed for `recordNotice`: SiteExplorer keys this panel by site id,
  // so switching sites remounts it with fresh state.

  return (
    <motion.aside
      aria-label={`${site.name} details`}
      initial={{ opacity: 0, x: 44 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{
        opacity: 0,
        x: 32,
        transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
      }}
      transition={{ type: "spring", stiffness: 260, damping: 30, mass: 0.9 }}
      className="w-full overflow-hidden rounded-2xl border border-hairline bg-paper shadow-lift sm:w-[360px]"
    >
      {/* Rounded top corners come from the panel's own overflow-hidden. */}
      <SitePhoto site={site} />

      <div className="px-6 pt-5 pb-6">
        <div className="flex items-start justify-between gap-3">
          <span
            className="inline-flex items-center gap-2 rounded-full px-2.5 py-1"
            style={{ background: color.soft }}
          >
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full"
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
            className="-mt-1 -mr-2 flex size-8 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors duration-200 hover:bg-cream-deep hover:text-ink"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
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

        <h2 className="mt-3 font-display text-[27px] leading-tight font-normal tracking-[-0.01em] text-ink">
          {site.name}
        </h2>

        <div className="mt-5 border-t border-hairline pt-4">
          <p className="eyebrow">Address</p>
          <p className="mt-1.5 text-sm text-ink">{site.address}</p>
          {office && <p className="text-sm text-ink">{site.floor}</p>}
          <p className="text-sm text-ink-soft">
            {site.city} {site.zip}
          </p>
        </div>

        <div className="mt-5 border-t border-hairline pt-4">
          <p className="eyebrow">Nearby sites</p>
          <ul className="mt-2.5 space-y-0.5">
            {nearby.map(({ site: neighbour, miles }) => (
              <li key={neighbour.id}>
                <button
                  type="button"
                  onClick={() => onSelect(neighbour.id)}
                  className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors duration-200 hover:bg-cream"
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

        <div className="mt-6 flex gap-2.5">
          <button
            type="button"
            onClick={() => onExpand(site.id)}
            className="flex-1 rounded-xl bg-ink px-4 py-3 text-[13px] font-medium text-cream transition-colors duration-200 hover:bg-[#463a2c]"
          >
            Full details
          </button>
          <button
            type="button"
            onClick={() => openDirections(site)}
            className="rounded-xl border border-hairline bg-paper px-4 py-3 text-[13px] text-ink-soft transition-colors duration-200 hover:bg-cream hover:text-ink"
          >
            Directions
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
