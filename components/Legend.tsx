"use client";

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
  const present = BOROUGHS.filter((borough) => counts[borough] > 0);
  if (present.length === 0 && !office) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1], delay: 0.1 }}
      className="w-[172px] rounded-2xl border border-hairline bg-paper/95 p-4 shadow-float backdrop-blur-sm"
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
            <span className="flex-1 text-[13px] text-ink">{office.label}</span>
            <span className="font-mono text-[11px] text-ink-faint tabular-nums">
              01
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
