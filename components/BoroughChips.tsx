"use client";

import { motion } from "framer-motion";
import { BOROUGHS, BOROUGH_COLORS, type Borough } from "@/lib/sites";
import type { BoroughFilter } from "@/lib/filter";

type Props = {
  value: BoroughFilter;
  onChange: (value: BoroughFilter) => void;
};

const FILTERS: BoroughFilter[] = ["All", ...BOROUGHS];

function dotColor(filter: BoroughFilter, active: boolean) {
  if (active) return "rgb(247 242 233 / 0.8)";
  return filter === "All"
    ? "var(--color-ink-faint)"
    : BOROUGH_COLORS[filter as Borough].base;
}

function fillColor(filter: BoroughFilter) {
  return filter === "All" ? "#33291f" : BOROUGH_COLORS[filter as Borough].base;
}

export default function BoroughChips({ value, onChange }: Props) {
  return (
    // Mobile: one non-wrapping rail that scrolls with momentum, so the chips can
    // never wrap into the map or get clipped by the title card.
    <div className="touch-rail w-full max-w-full overflow-x-auto md:w-auto md:max-w-none md:overflow-visible">
      <div
        role="group"
        aria-label="Filter by borough"
        className="flex w-max items-center gap-1.5 md:w-auto md:flex-wrap"
      >
        {FILTERS.map((filter) => {
          const active = value === filter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => onChange(filter)}
              aria-pressed={active}
              className={[
                // 44px tap target on touch, back to 36px on desktop.
                "relative flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm shadow-float md:h-9 md:px-3.5 md:text-[13px]",
                "transition-colors duration-200",
                active
                  ? "border-transparent text-cream"
                  : "border-hairline bg-paper text-ink-soft hover:text-ink",
              ].join(" ")}
            >
              {/* The fill is one element that travels between chips. -inset-px so it
                covers the border box and no hairline shows through over the map. */}
              {active && (
                <motion.span
                  layoutId="chip-active-fill"
                  aria-hidden="true"
                  className="absolute -inset-px rounded-full"
                  initial={false}
                  animate={{ backgroundColor: fillColor(filter) }}
                  transition={{
                    layout: {
                      type: "spring",
                      stiffness: 320,
                      damping: 34,
                      mass: 0.7,
                    },
                    backgroundColor: {
                      duration: 0.25,
                      ease: [0.22, 0.61, 0.36, 1],
                    },
                  }}
                />
              )}
              <span
                aria-hidden="true"
                className="relative z-10 size-2 shrink-0 rounded-full transition-colors duration-200"
                style={{ background: dotColor(filter, active) }}
              />
              <span className="relative z-10">{filter}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
