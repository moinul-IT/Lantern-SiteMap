"use client";

import { motion } from "framer-motion";

export type View = "map" | "list" | "coverage";

const OPTIONS: { id: View; label: string }[] = [
  { id: "map", label: "Map" },
  { id: "list", label: "All sites" },
  { id: "coverage", label: "Coverage" },
];

export default function ViewToggle({
  value,
  onChange,
}: {
  value: View;
  onChange: (value: View) => void;
}) {
  return (
    <div
      role="group"
      aria-label="View"
      className="flex h-11 shrink-0 items-center gap-0.5 rounded-xl border border-hairline bg-cream-deep/70 p-1 shadow-float"
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
              "relative rounded-[9px] px-3.5 py-1.5 text-[13px] whitespace-nowrap transition-colors duration-200",
              active ? "text-ink" : "text-ink-soft hover:text-ink",
            ].join(" ")}
          >
            {active && (
              <motion.span
                layoutId="view-active-fill"
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
  );
}
