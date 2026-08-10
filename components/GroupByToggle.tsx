"use client";

import { motion } from "framer-motion";
import type { GroupBy } from "./AllSitesView";

const OPTIONS: { id: GroupBy; label: string }[] = [
  { id: "borough", label: "By borough" },
  { id: "cluster", label: "By cluster" },
];

export default function GroupByToggle({
  value,
  onChange,
}: {
  value: GroupBy;
  onChange: (value: GroupBy) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="eyebrow hidden shrink-0 md:block">Group</span>
      <div
        role="group"
        aria-label="Group sites by"
        className="flex h-11 shrink-0 items-center gap-0.5 rounded-xl border border-hairline bg-cream-deep/70 p-1 shadow-float md:h-9"
      >
        {OPTIONS.map((option) => {
          const active = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              aria-pressed={active}
              className={[
                "relative rounded-[9px] px-3 py-1.5 text-[13px] whitespace-nowrap transition-colors duration-200",
                active ? "text-ink" : "text-ink-soft hover:text-ink",
              ].join(" ")}
            >
              {active && (
                <motion.span
                  layoutId="groupby-active-fill"
                  aria-hidden="true"
                  className="absolute inset-0 rounded-[9px] bg-paper shadow-[0_1px_2px_rgb(51_41_31_/_0.12)]"
                  transition={{
                    type: "spring",
                    stiffness: 340,
                    damping: 34,
                    mass: 0.7,
                  }}
                />
              )}
              <span className="relative z-10">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
