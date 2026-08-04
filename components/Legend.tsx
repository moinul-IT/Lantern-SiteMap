"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  BOROUGHS,
  BOROUGH_COLORS,
  OFFICE_COLORS,
  type Borough,
  type Office,
} from "@/lib/sites";

export default function Legend({
  counts,
  office,
}: {
  counts: Record<Borough, number>;
  office: Office | null;
}) {
  // Collapsed by default on phones so it stops covering the map. The md:
  // overrides below force it open on desktop regardless of this state, which
  // also keeps first paint identical on server and client.
  const [open, setOpen] = useState(false);

  const present = BOROUGHS.filter((borough) => counts[borough] > 0);
  if (present.length === 0 && !office) return null;

  const total =
    present.reduce((sum, b) => sum + counts[b], 0) + (office ? 1 : 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1], delay: 0.1 }}
      className="flex flex-col items-start gap-2"
      data-open={open}
    >
      {/* Tappable summary — phones only. */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex h-11 items-center gap-2 rounded-full border border-hairline bg-paper/95 px-4 shadow-float backdrop-blur-sm md:hidden"
      >
        <span aria-hidden="true" className="flex items-center -space-x-1">
          {present.map((borough) => (
            <span
              key={borough}
              className="size-2.5 rounded-full ring-[1.5px] ring-paper"
              style={{ background: BOROUGH_COLORS[borough].base }}
            />
          ))}
          {office && (
            <span
              className="size-2.5 rounded-[3px] ring-[1.5px] ring-paper"
              style={{ background: OFFICE_COLORS.base }}
            />
          )}
        </span>
        <span className="text-sm text-ink">Legend</span>
        <span className="font-mono text-[11px] text-ink-faint tabular-nums">
          {total}
        </span>
        <svg
          viewBox="0 0 12 12"
          aria-hidden="true"
          className={`size-3 text-ink-faint transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M2.5 7.5L6 4l3.5 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </button>

      <div
        className={[
          "w-[172px] overflow-hidden rounded-2xl border border-hairline bg-paper/95 shadow-float backdrop-blur-sm",
          "transition-all duration-300 ease-out",
          open
            ? "max-h-[60vh] p-4 opacity-100"
            : "max-h-0 border-transparent p-0 opacity-0",
          // Desktop: always open, never collapsed.
          "md:max-h-none md:overflow-visible md:border-hairline md:p-4 md:opacity-100",
        ].join(" ")}
      >
        <p className="eyebrow">Borough</p>
        <ul className="mt-2.5 space-y-2">
          {present.map((borough) => (
            <li key={borough} className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: BOROUGH_COLORS[borough].base }}
              />
              <span className="flex-1 text-[13px] text-ink">{borough}</span>
              <span className="font-mono text-[11px] text-ink-faint tabular-nums">
                {String(counts[borough]).padStart(2, "0")}
              </span>
            </li>
          ))}
        </ul>

        {/* The office is a different class of pin, so it sits below a divider
            with a squared swatch matching its marker. */}
        {office && (
          <div className="mt-3 border-t border-hairline pt-3">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ background: OFFICE_COLORS.base }}
              />
              <span className="flex-1 text-[13px] text-ink">
                {office.label}
              </span>
              <span className="font-mono text-[11px] text-ink-faint tabular-nums">
                01
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
