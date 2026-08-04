"use client";

import { motion } from "framer-motion";
import { closestSite, formatDistance } from "@/lib/geo";
import {
  BOROUGHS,
  BOROUGH_COLORS,
  OFFICE_COLORS,
  SITES,
  type Office,
  type Place,
  type Site,
} from "@/lib/sites";

type Props = {
  sites: Site[];
  office: Office | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const EASE = [0.22, 0.61, 0.36, 1] as const;

type Column = {
  key: string;
  title: string;
  color: { base: string; soft: string };
  squared: boolean;
  places: Place[];
};

export default function AllSitesView({
  sites,
  office,
  selectedId,
  onSelect,
}: Props) {
  const columns: Column[] = BOROUGHS.map((borough) => ({
    key: borough,
    title: borough,
    color: BOROUGH_COLORS[borough],
    squared: false,
    places: sites.filter((site) => site.borough === borough) as Place[],
  })).filter((column) => column.places.length > 0);

  if (office) {
    columns.push({
      key: "admin",
      title: office.label,
      color: OFFICE_COLORS,
      squared: true,
      places: [office],
    });
  }

  if (columns.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-ink-faint">No sites match this search.</p>
      </div>
    );
  }

  return (
    <div className="grid flex-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-4">
      {columns.map((column, columnIndex) => (
        <motion.section
          key={column.key}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.36,
            delay: columnIndex * 0.06,
            ease: EASE,
          }}
          className="overflow-hidden rounded-2xl border border-hairline bg-paper shadow-float"
        >
          <header className="flex items-center gap-2.5 border-b border-hairline px-5 py-4">
            <span
              aria-hidden="true"
              className={`size-2.5 shrink-0 ${column.squared ? "rounded-[3px]" : "rounded-full"}`}
              style={{ background: column.color.base }}
            />
            <h2 className="flex-1 font-display text-lg leading-none font-normal text-ink">
              {column.title}
            </h2>
            <span className="font-mono text-[11px] text-ink-faint tabular-nums">
              {String(column.places.length).padStart(2, "0")}
            </span>
          </header>

          <ul>
            {column.places.map((place, rowIndex) => {
              // Nearest neighbour is measured against every site, not just the
              // ones passing the current filter.
              const nearest = closestSite(place, SITES);
              const active = place.id === selectedId;

              return (
                <motion.li
                  key={place.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay:
                      columnIndex * 0.06 + 0.08 + Math.min(rowIndex, 9) * 0.03,
                    ease: EASE,
                  }}
                  className="border-b border-hairline last:border-b-0"
                >
                  {/* Native button: Enter and Space activate it for free. */}
                  <button
                    type="button"
                    onClick={() => onSelect(place.id)}
                    aria-label={`View details for ${place.name}`}
                    className={[
                      "flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors duration-200",
                      "focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ink/40",
                      active ? "bg-cream-deep/60" : "hover:bg-cream/70",
                    ].join(" ")}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {place.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] text-ink-faint">
                        {place.address}
                      </span>
                    </span>

                    {nearest && (
                      <span className="shrink-0 text-right">
                        <span className="block font-mono text-[11px] text-ink-soft tabular-nums">
                          {formatDistance(nearest.miles)}
                        </span>
                        <span className="mt-0.5 block max-w-[130px] truncate text-[11px] text-ink-faint">
                          {nearest.site.name}
                        </span>
                      </span>
                    )}
                  </button>
                </motion.li>
              );
            })}
          </ul>
        </motion.section>
      ))}
    </div>
  );
}
