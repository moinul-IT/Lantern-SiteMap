"use client";

import { motion } from "framer-motion";
import { BOROUGH_COLORS, type Site } from "@/lib/sites";

type Props = {
  results: Site[];
  onSelect: (id: string) => void;
};

export default function SearchResults({ results, onSelect }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
      className="w-full overflow-hidden rounded-xl border border-hairline bg-paper shadow-lift md:w-[300px]"
    >
      {results.length === 0 ? (
        <p className="px-3.5 py-3 text-[13px] text-ink-faint">
          No matching sites
        </p>
      ) : (
        <ul className="max-h-[40vh] overflow-y-auto overscroll-contain md:max-h-[264px]">
          {results.map((site, index) => (
            <motion.li
              key={site.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.22,
                delay: Math.min(index, 8) * 0.028,
                ease: [0.22, 0.61, 0.36, 1],
              }}
              className="border-b border-hairline last:border-b-0"
            >
              <button
                type="button"
                onClick={() => onSelect(site.id)}
                className="flex min-h-11 w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors duration-200 hover:bg-cream active:bg-cream-deep"
              >
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: BOROUGH_COLORS[site.borough].base }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">
                    {site.name}
                  </span>
                  <span className="block truncate text-[11px] text-ink-faint">
                    {site.address}
                  </span>
                </span>
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
