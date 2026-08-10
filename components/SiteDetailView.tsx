"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import SitePhoto from "./SitePhoto";
import { formatDistance, nearestSites } from "@/lib/geo";
import { openDirections } from "@/lib/directions";
import {
  BOROUGH_COLORS,
  CLUSTER_COLORS,
  OFFICE_COLORS,
  SITES,
  clusterLabel,
  isOffice,
  type Place,
} from "@/lib/sites";

type Props = {
  place: Place;
  onClose: () => void;
  onViewOnMap: (id: string) => void;
  onOpenPlace: (id: string) => void;
};

const EASE = [0.22, 0.61, 0.36, 1] as const;

/** Staggered reveal for each block as the view comes in. */
function Section({
  children,
  index,
  className = "",
}: {
  children: React.ReactNode;
  index: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, delay: 0.06 + index * 0.055, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function SiteDetailView({
  place,
  onClose,
  onViewOnMap,
  onOpenPlace,
}: Props) {
  const office = isOffice(place);
  const color = office ? OFFICE_COLORS : BOROUGH_COLORS[place.borough];
  const tag = office ? place.label : place.borough;
  const nearby = nearestSites(place, SITES, 5);
  const [recordNotice, setRecordNotice] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-hairline bg-paper shadow-lift">
      <div className="relative">
        <SitePhoto site={place} variant="hero" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close site details"
          className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-full border border-hairline bg-paper/90 text-ink-soft shadow-float backdrop-blur-sm transition-colors duration-200 hover:bg-paper hover:text-ink active:bg-cream-deep md:size-9"
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

      <div className="px-5 pt-5 pb-6 md:px-7 md:pt-6 md:pb-7">
        <Section index={0}>
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

          <h2 className="mt-3 font-display text-[27px] leading-[1.12] font-normal tracking-[-0.015em] text-ink md:text-[34px]">
            {place.name}
          </h2>
        </Section>

        <Section
          index={1}
          className="mt-6 grid gap-6 border-t border-hairline pt-5 sm:grid-cols-2"
        >
          <div>
            <p className="eyebrow">Address</p>
            <p className="mt-1.5 text-sm text-ink">{place.address}</p>
            {office && <p className="text-sm text-ink">{place.floor}</p>}
            <p className="text-sm text-ink-soft">
              {place.city} {place.zip}
            </p>
          </div>
          <div>
            <p className="eyebrow">{office ? "Function" : "Classification"}</p>
            {office ? (
              <p className="mt-1.5 text-sm text-ink">Administrative office</p>
            ) : (
              <>
                <p className="mt-1.5 text-sm text-ink">{place.type}</p>
                <p className="text-sm text-ink-soft">
                  {place.cluster ? (
                    <span
                      className="inline-flex items-center gap-1.5"
                      style={{ color: CLUSTER_COLORS[place.cluster].base }}
                    >
                      <span
                        aria-hidden="true"
                        className="size-2 rounded-[2px]"
                        style={{
                          background: CLUSTER_COLORS[place.cluster].base,
                        }}
                      />
                      {clusterLabel(place.cluster)}
                    </span>
                  ) : (
                    "Not in the cluster model"
                  )}
                </p>
                <p className="mt-0.5 text-sm text-ink-soft">
                  {place.borough}, New York City
                </p>
                {place.programs && place.programs.length > 0 && (
                  <p className="mt-1 font-mono text-[11px] text-ink-faint">
                    {place.programs.join(" · ")}
                  </p>
                )}
              </>
            )}
            <p className="mt-1 font-mono text-[11px] text-ink-faint tabular-nums">
              {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
            </p>
          </div>
        </Section>

        <Section index={2} className="mt-6 border-t border-hairline pt-5">
          <p className="eyebrow">
            {office ? "Closest sites to this office" : "Nearby sites"}
          </p>
          <ul className="mt-2.5 space-y-0.5">
            {nearby.map(({ site: neighbour, miles }, i) => (
              <motion.li
                key={neighbour.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: 0.22 + i * 0.045,
                  ease: EASE,
                }}
              >
                <button
                  type="button"
                  onClick={() => onOpenPlace(neighbour.id)}
                  className="-mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors duration-200 hover:bg-cream active:bg-cream-deep focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ink/40"
                >
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full"
                    style={{
                      background: BOROUGH_COLORS[neighbour.borough].base,
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">
                      {neighbour.name}
                    </span>
                    <span className="block truncate text-[11px] text-ink-faint">
                      {neighbour.address}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-ink-faint tabular-nums">
                    {formatDistance(miles)}
                  </span>
                </button>
              </motion.li>
            ))}
          </ul>
        </Section>

        <Section index={3} className="mt-6 flex flex-wrap gap-2.5 md:mt-7">
          <button
            type="button"
            onClick={() => onViewOnMap(place.id)}
            className="min-h-11 flex-1 rounded-xl bg-ink px-4 py-3.5 text-[13px] font-medium text-cream transition-colors duration-200 hover:bg-[#463a2c] active:bg-[#5a4a38]"
          >
            View on map
          </button>
          <button
            type="button"
            onClick={() => openDirections(place)}
            className="min-h-11 flex-1 rounded-xl border border-hairline bg-paper px-4 py-3.5 text-[13px] text-ink-soft transition-colors duration-200 hover:bg-cream hover:text-ink active:bg-cream-deep md:flex-none"
          >
            Get directions
          </button>
          <button
            type="button"
            onClick={() => {
              console.log("Open site record →", place.id);
              setRecordNotice(true);
            }}
            className="min-h-11 flex-1 rounded-xl border border-hairline bg-paper px-4 py-3.5 text-[13px] text-ink-soft transition-colors duration-200 hover:bg-cream hover:text-ink active:bg-cream-deep md:flex-none"
          >
            Site record
          </button>
        </Section>

        <AnimatePresence>
          {recordNotice && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="overflow-hidden font-mono text-[11px] text-ink-faint"
            >
              <span className="mt-3 block">
                Site records aren’t connected yet
              </span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
