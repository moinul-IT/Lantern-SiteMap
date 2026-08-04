"use client";

import { AnimatePresence, motion } from "framer-motion";

export default function TitleBlock({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-end gap-4">
      <div>
        <p className="eyebrow">Lantern Community Services</p>
        <h1 className="mt-0.5 font-display text-[26px] leading-none font-normal tracking-[-0.01em] text-ink">
          {title}
        </h1>
      </div>
      <div className="flex items-baseline gap-1.5 border-l border-hairline pb-0.5 pl-4">
        {/* Fixed-width well so the label never shifts as the number changes. */}
        <span className="relative block h-4 min-w-[1.6ch] overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={count}
              initial={{ opacity: 0, y: -9 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 9 }}
              transition={{ duration: 0.24, ease: [0.22, 0.61, 0.36, 1] }}
              className="block font-mono text-base leading-4 font-medium text-ink tabular-nums"
            >
              {String(count).padStart(2, "0")}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="eyebrow">{count === 1 ? "site" : "sites"}</span>
      </div>
    </div>
  );
}
