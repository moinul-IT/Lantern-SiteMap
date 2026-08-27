"use client";

import { useCallback, useId, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  MAPS_PROVIDERS,
  PROVIDER_LABELS,
  getProvider,
  getServerProvider,
  openDirections,
  setProvider,
  subscribeProvider,
  type MapsProvider,
} from "@/lib/directions";

/** The panel and the in-depth view label the same action differently. */
type Props = {
  place: { lat: number; lng: number };
  label: string;
  /**
   * Matches the height of whichever buttons this sits beside: "sm" for the map
   * panel's 44px row, "md" for the in-depth view's roomier 48px one. A mismatch
   * here reads as a misaligned row, since they share a baseline.
   */
  size?: "sm" | "md";
  /** Applied to the control as a whole, for each view's own row layout. */
  className?: string;
};

const SIZE_PADDING = { sm: "py-3", md: "py-3.5" } as const;

const EASE = [0.22, 0.61, 0.36, 1] as const;

/** Reads the shared choice, so every mounted copy of this control agrees. */
export function useMapsProvider() {
  return useSyncExternalStore(
    subscribeProvider,
    getProvider,
    getServerProvider,
  );
}

/**
 * Directions, with a choice of maps app.
 *
 * A split control rather than a menu on the main button: the common case stays
 * one tap on the provider already chosen, and the chevron is there for the
 * times it is wrong. Picking from the chooser both opens that provider and
 * remembers it, so switching costs one tap now and none later.
 *
 * The chooser expands the row inline instead of floating over it. DetailPanel
 * is `overflow-hidden` (that is what rounds its corners), so an absolutely
 * positioned popover would be clipped by the panel edge.
 */
export default function DirectionsButton({
  place,
  label,
  size = "md",
  className,
}: Props) {
  const provider = useMapsProvider();
  const [open, setOpen] = useState(false);
  const chooserId = useId();

  const go = useCallback(
    (chosen: MapsProvider) => {
      setProvider(chosen);
      setOpen(false);
      openDirections(place, chosen);
    },
    [place],
  );

  return (
    <div className={className}>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="chooser"
            id={chooserId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="overflow-hidden"
          >
            <div
              role="group"
              aria-label="Open directions in"
              className="mb-2.5 rounded-xl border border-hairline bg-cream/60 p-2"
            >
              <p className="eyebrow px-1 pb-1.5">Open in</p>
              {/* Stacked, not side by side, and that is load-bearing: the
                  control sizes to its max-content, which flex-wrap does not
                  reduce. Two pills in a row would make the control wider than
                  its own button and squeeze the sibling button into wrapping.
                  Stacked, the widest pill is narrower than the button row, so
                  opening this changes nothing about the row's width. It also
                  reads as the dropdown menu it effectively is. */}
              <div className="flex flex-col gap-1.5">
                {MAPS_PROVIDERS.map((option) => {
                  const active = option === provider;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => go(option)}
                      className={[
                        "flex min-h-11 items-center gap-2 rounded-lg border px-3 text-[13px] whitespace-nowrap transition-colors duration-200",
                        active
                          ? "border-transparent bg-ink text-cream"
                          : "border-hairline bg-paper text-ink-soft hover:text-ink active:bg-cream-deep",
                      ].join(" ")}
                    >
                      {/* Always rendered, so switching the choice does not
                          shift the labels sideways. */}
                      <svg
                        aria-hidden="true"
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        className={active ? "shrink-0" : "invisible shrink-0"}
                      >
                        <path
                          d="M2.5 6.4l2.3 2.3 4.7-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {PROVIDER_LABELS[option]}
                      {active && <span className="sr-only"> (current)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* One bordered group, split by a hairline, so it reads as a single
          control rather than two buttons that happen to be adjacent. */}
      <div className="flex min-h-11 overflow-hidden rounded-xl border border-hairline bg-paper">
        <button
          type="button"
          onClick={() => openDirections(place, provider)}
          className={`flex-1 px-4 ${SIZE_PADDING[size]} text-[13px] whitespace-nowrap text-ink-soft transition-colors duration-200 hover:bg-cream hover:text-ink active:bg-cream-deep`}
        >
          {label}
        </button>
        <button
          type="button"
          onClick={() => setOpen((wasOpen) => !wasOpen)}
          aria-expanded={open}
          aria-controls={open ? chooserId : undefined}
          // The visible control says only "Directions", so the chevron needs to
          // name what it does for anyone not seeing the chevron itself.
          aria-label="Choose which maps app to use"
          className="grid w-11 shrink-0 place-items-center border-l border-hairline text-ink-faint transition-colors duration-200 hover:bg-cream hover:text-ink active:bg-cream-deep"
        >
          <motion.svg
            aria-hidden="true"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <path
              d="M2.5 4.5L6 8l3.5-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        </button>
      </div>
    </div>
  );
}
