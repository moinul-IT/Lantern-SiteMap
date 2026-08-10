"use client";

import { motion } from "framer-motion";

type Props = {
  showLabels: boolean;
  onShowLabelsChange: (value: boolean) => void;
  clusterMode: boolean;
  onClusterModeChange: (value: boolean) => void;
};

function Switch({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint: string;
  on: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={hint}
      onClick={() => onChange(!on)}
      className={[
        "flex h-11 shrink-0 items-center gap-2.5 rounded-full border px-3.5 text-sm shadow-float transition-colors duration-200 md:h-9 md:text-[13px]",
        on
          ? "border-transparent bg-ink text-cream"
          : "border-hairline bg-paper text-ink-soft hover:text-ink",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "relative flex h-4 w-7 shrink-0 items-center rounded-full transition-colors duration-200",
          on ? "bg-cream/35" : "bg-cream-deep",
        ].join(" ")}
      >
        <motion.span
          layout
          transition={{
            type: "spring",
            stiffness: 420,
            damping: 34,
            mass: 0.6,
          }}
          className={[
            "absolute size-3 rounded-full",
            on ? "right-0.5 bg-cream" : "left-0.5 bg-ink-faint",
          ].join(" ")}
        />
      </span>
      {label}
    </button>
  );
}

export default function MapModeToggles({
  showLabels,
  onShowLabelsChange,
  clusterMode,
  onClusterModeChange,
}: Props) {
  return (
    <div className="touch-rail flex w-full max-w-full items-center gap-1.5 overflow-x-auto md:w-auto md:overflow-visible">
      <Switch
        label="Labels"
        hint="Always show site names on the map"
        on={showLabels}
        onChange={onShowLabelsChange}
      />
      <Switch
        label="Clusters"
        hint="Colour sites by cluster and outline each cluster"
        on={clusterMode}
        onChange={onClusterModeChange}
      />
    </div>
  );
}
