"use client";

import { useState } from "react";
import Image from "next/image";
import {
  BOROUGH_COLORS,
  OFFICE_COLORS,
  isOffice,
  siteInitials,
  type Place,
} from "@/lib/sites";

/**
 * Photos are LOCAL static files only (e.g. "/photos/amber-hall.jpg"). No Street
 * View, Places, or any other external image service is ever contacted. When
 * `photo` is null — or a local file is missing — we draw a branded monogram
 * block in the place's own colour instead of a broken image.
 */
export default function SitePhoto({
  site,
  variant = "panel",
}: {
  site: Place;
  variant?: "panel" | "hero";
}) {
  const [failed, setFailed] = useState(false);
  const office = isOffice(site);
  const color = office ? OFFICE_COLORS : BOROUGH_COLORS[site.borough];
  const showPlaceholder = !site.photo || failed;
  const height = variant === "hero" ? "h-[196px]" : "h-[132px]";
  const monogramSize = variant === "hero" ? "text-[64px]" : "text-[44px]";
  const tag = office ? site.label : site.borough;

  if (showPlaceholder) {
    return (
      <div
        role="img"
        aria-label={`${site.name} — no photo on file`}
        className={`relative w-full overflow-hidden ${height}`}
        style={{
          background: `linear-gradient(148deg, ${color.soft} 0%, ${color.soft} 45%, #fdfbf7 130%)`,
        }}
      >
        {/* Off-centre tonal disc keeps the block from reading as flat fill. */}
        <span
          aria-hidden="true"
          className={`absolute rounded-full opacity-[0.13] ${
            variant === "hero"
              ? "-top-20 -right-12 size-56"
              : "-top-14 -right-10 size-40"
          }`}
          style={{ background: color.base }}
        />
        <span
          aria-hidden="true"
          className={`absolute inset-0 flex items-center justify-center font-display leading-none select-none ${monogramSize}`}
          style={{ color: color.base, opacity: 0.82 }}
        >
          {siteInitials(site)}
        </span>
        <span
          aria-hidden="true"
          className="absolute bottom-2.5 left-4 font-mono text-[9px] tracking-[0.14em] uppercase"
          style={{ color: color.base, opacity: 0.55 }}
        >
          {tag}
        </span>
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px"
          style={{ background: color.base, opacity: 0.16 }}
        />
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden bg-cream-deep ${height}`}>
      <Image
        src={site.photo!}
        alt={site.name}
        fill
        sizes={variant === "hero" ? "560px" : "360px"}
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
