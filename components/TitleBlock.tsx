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
    <div className="flex items-center gap-2.5 md:items-end md:gap-4">
      <div className="min-w-0">
        {/* The eyebrow is the first thing to go on a phone — it's the least
            informative line and it forced the title to wrap. */}
        <p className="eyebrow hidden md:block">Lantern Community Services</p>
        <h1 className="font-display text-[17px] leading-none font-normal tracking-[-0.01em] whitespace-nowrap text-ink md:mt-0.5 md:text-[26px]">
          {title}
        </h1>
      </div>
      <div className="flex shrink-0 items-baseline gap-1.5 border-l border-hairline pl-2.5 md:pb-0.5 md:pl-4">
        {/* Fixed-width well so the label never shifts as the number changes. */}
        <span className="relative block h-4 min-w-[1.6ch] overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={count}
              initial={{ opacity: 0, y: -9 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 9 }}
              transition={{ duration: 0.24, ease: [0.22, 0.61, 0.36, 1] }}
              className="block font-mono text-sm leading-4 font-medium text-ink tabular-nums md:text-base"
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
