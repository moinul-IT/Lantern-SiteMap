import L from "leaflet";
import {
  BOROUGH_COLORS,
  OFFICE_COLORS,
  clusterColorFor,
  type Office,
  type Site,
} from "./sites";

// Teardrop drawn in a 24×32 box: circular head centred at (12,12), tip at (12,32).
const TEARDROP =
  "M12 1.2c-5.9 0-10.8 4.8-10.8 10.8 0 2.6 1.1 5 2.6 7.2 " +
  "1.9 2.8 4.6 5.7 7.2 10.1 0.4 0.7 1.4 0.7 1.8 0 " +
  "2.6-4.4 5.3-7.3 7.2-10.1 1.5-2.2 2.6-4.6 2.6-7.2C22.8 6 17.9 1.2 12 1.2z";

export type ColorMode = "borough" | "cluster";

export function siteIcon(
  site: Site,
  selected: boolean,
  colorMode: ColorMode = "borough",
) {
  const cluster = colorMode === "cluster";
  const color = cluster
    ? clusterColorFor(site).base
    : BOROUGH_COLORS[site.borough].base;

  // In cluster mode a shelter is outside the model, so it reads as a hollow pin
  // rather than a filled one — visibly "not part of a cluster".
  const hollow = cluster && site.cluster === null;

  const body = hollow
    ? `<path d="${TEARDROP}" fill="#fdfbf7" stroke="${color}" stroke-width="2" />
       <circle cx="12" cy="12" r="3.4" fill="${color}" />`
    : `<path d="${TEARDROP}" fill="${color}" />
       <circle cx="12" cy="12" r="4.1" fill="#fdfbf7" />`;

  const html = `
    <div class="lantern-pin" data-selected="${selected}">
      <span class="lantern-pin__pulse" style="--pin:${color}"></span>
      <svg class="lantern-pin__shape" viewBox="0 0 24 32" aria-hidden="true">
        ${body}
      </svg>
    </div>`;

  return L.divIcon({
    html,
    className: "lantern-marker",
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -30],
  });
}

/** Chip sitting at a cluster's centroid, naming the cluster on the map. */
export function clusterBadgeIcon(label: string, color: string, count: number) {
  const html = `
    <span class="lantern-cluster-badge" style="--cluster:${color}">
      <span class="lantern-cluster-badge__dot"></span>
      ${label}
      <span class="lantern-cluster-badge__count">${String(count).padStart(2, "0")}</span>
    </span>`;

  return L.divIcon({
    html,
    className: "lantern-marker lantern-marker--badge",
    iconSize: [128, 26],
    iconAnchor: [64, 13],
  });
}

/**
 * The admin office gets a deliberately different marker: a squared badge with a
 * building glyph and a standing "ADMIN" label, so it never reads as one of the
 * borough-coloured housing pins.
 */
export function officeIcon(office: Office, selected: boolean) {
  const color = OFFICE_COLORS.base;

  // 2×2 window grid, centred in the 26-wide badge.
  const windows = [8.3, 14.1]
    .flatMap((x) => [8.3, 14.1].map((y) => [x, y]))
    .map(
      ([x, y]) =>
        `<rect x="${x}" y="${y}" width="3.6" height="3.6" rx="0.9" fill="#fdfbf7" />`,
    )
    .join("");

  const html = `
    <div class="lantern-office" data-selected="${selected}">
      <span class="lantern-office__label">${office.label}</span>
      <span class="lantern-office__mark">
        <span class="lantern-office__pulse" style="--pin:${color}"></span>
        <svg class="lantern-office__shape" viewBox="0 0 26 33" aria-hidden="true">
          <rect x="0.5" y="0.5" width="25" height="25" rx="7" fill="${color}" />
          <path d="M9.6 25.5h6.8L13 32.6z" fill="${color}" />
          ${windows}
        </svg>
      </span>
    </div>`;

  return L.divIcon({
    html,
    className: "lantern-marker lantern-marker--office",
    iconSize: [76, 51],
    iconAnchor: [38, 51],
    popupAnchor: [0, -49],
  });
}
