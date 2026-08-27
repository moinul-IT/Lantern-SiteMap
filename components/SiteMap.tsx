"use client";

import { Fragment, useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  Polygon,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  clusterBadgeIcon,
  officeIcon,
  siteIcon,
  type ColorMode,
} from "@/lib/marker";
import { clusterShapes } from "@/lib/cluster-shape";
import type { Office, Place, Site } from "@/lib/sites";
import type { Located } from "@/lib/geo";

/*
 * Basemap tiles. This was CARTO's Voyager endpoint until it stopped being
 * keyless and began stamping "API KEY REQUIRED" across every tile; OSM's own
 * server needs no key, so the app still deploys with zero configuration.
 *
 * No `subdomains` or `detectRetina` because this endpoint has neither: one
 * hostname, and no @2x tiles, so retina detection would just fetch z+1 tiles to
 * scale down — four times the requests against a free community service.
 *
 * The OSM Tile Usage Policy applies, and changing provider means changing
 * TILE_HOSTS in public/sw.js too. See "Basemap tiles" in the README.
 */
const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const NYC_FALLBACK: L.LatLngExpression = [40.762, -73.91];

/** Insets so fitBounds keeps markers clear of the floating UI cards. */
const FIT_PADDING_TOP_LEFT: L.PointExpression = [96, 128];
const FIT_PADDING_BOTTOM_RIGHT: L.PointExpression = [96, 128];

type Props = {
  sites: Site[];
  /** The admin office, or null when the current filters hide it. */
  office: Office | null;
  selected: Place | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Px to shift the map centre east so the selected pin clears the detail panel. */
  panOffsetX?: number;
  /** Lift the selected pin above the mobile bottom sheet instead of behind it. */
  liftAboveSheet?: boolean;
  /** Changing this re-fits the viewport to the visible set. */
  fitToken?: number;
  /** Colour pins by borough, or by cluster with cluster outlines drawn. */
  colorMode?: ColorMode;
  /** Pin names stay visible without hover or selection. */
  showLabels?: boolean;
};

/** Eases to the selected place, keeping it clear of the detail panel. */
function FlyToSelected({
  site,
  panOffsetX = 0,
  liftAboveSheet = false,
}: {
  site: Located | null;
  panOffsetX?: number;
  liftAboveSheet?: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!site) return;

    // Shifting the centre east by half the panel width lands the pin in the
    // middle of the map area still visible beside the panel. On phones the
    // sheet covers the bottom instead, so the centre moves south to lift the
    // pin into the band that stays visible.
    const zoom = Math.max(map.getZoom(), 14);
    const lift = liftAboveSheet ? map.getSize().y * 0.26 : 0;
    const target = map
      .project([site.lat, site.lng], zoom)
      .add([panOffsetX / 2, lift]);
    const center = map.unproject(target, zoom);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      map.setView(center, zoom, { animate: false });
      return;
    }

    map.flyTo(center, zoom, { duration: 0.85, easeLinearity: 0.3 });
  }, [map, site, panOffsetX, liftAboveSheet]);

  return null;
}

/** Fits the viewport to whatever set of places is currently visible. */
function FitToSites({
  sites,
  fitToken,
}: {
  sites: Located[];
  fitToken?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (sites.length === 0) return;

    if (sites.length === 1) {
      map.setView([sites[0].lat, sites[0].lng], 15, { animate: true });
      return;
    }

    const bounds = L.latLngBounds(
      sites.map((s) => [s.lat, s.lng] as L.LatLngTuple),
    );
    map.fitBounds(bounds, {
      paddingTopLeft: FIT_PADDING_TOP_LEFT,
      paddingBottomRight: FIT_PADDING_BOTTOM_RIGHT,
      animate: true,
      maxZoom: 15,
    });
    // fitToken is a deliberate trigger: closing a pin re-frames the whole set.
  }, [map, sites, fitToken]);

  return null;
}

type PermanentTooltip = L.Tooltip & {
  _container?: HTMLElement;
  options: L.TooltipOptions;
};

/** Placement order tried before a label is given up on. */
const LABEL_DIRECTIONS: L.Direction[] = ["right", "left", "top", "bottom"];
/** Px of breathing room required between two label boxes. */
const LABEL_PADDING = 3;

function overlaps(a: DOMRect, b: DOMRect) {
  return !(
    a.right + LABEL_PADDING < b.left ||
    b.right + LABEL_PADDING < a.left ||
    a.bottom + LABEL_PADDING < b.top ||
    b.bottom + LABEL_PADDING < a.top
  );
}

/**
 * With 21 always-on labels many collide — Audubon and Savanna are ~100 ft apart.
 * Each label is tried right, left, above then below its pin, and only hidden if
 * every placement still clashes with a label already kept. Re-runs on zoom and
 * pan, so zooming in reveals the ones that were suppressed.
 */
function LabelDeclutter({
  active,
  priorityName,
}: {
  active: boolean;
  /** Display name of the selected place — its label is never suppressed. */
  priorityName: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!active) return;

    const collect = () => {
      const entries: { tip: PermanentTooltip; el: HTMLElement; lat: number }[] =
        [];

      map.eachLayer((layer) => {
        const marker = layer as L.Marker;
        if (typeof marker.getTooltip !== "function") return;
        const tip = marker.getTooltip() as PermanentTooltip | undefined;
        if (!tip?.options.permanent || !tip._container) return;
        entries.push({
          tip,
          el: tip._container,
          lat: marker.getLatLng?.().lat ?? 0,
        });
      });

      // Selected label always wins, then north to south for a stable order.
      // Matches on the rendered name, not the slug id, which never matched.
      const isPriority = (el: HTMLElement) =>
        priorityName !== null &&
        el.firstElementChild?.textContent?.trim() === priorityName;

      entries.sort((a, b) => {
        const diff = Number(isPriority(b.el)) - Number(isPriority(a.el));
        return diff !== 0 ? diff : b.lat - a.lat;
      });

      return entries;
    };

    const run = () => {
      const kept: DOMRect[] = [];

      for (const { tip, el } of collect()) {
        el.classList.remove("is-crowded-out");
        let placed = false;

        for (const direction of LABEL_DIRECTIONS) {
          tip.options.direction = direction;
          tip.update();
          const rect = el.getBoundingClientRect();
          if (rect.width === 0) continue;
          if (!kept.some((other) => overlaps(other, rect))) {
            kept.push(rect);
            placed = true;
            break;
          }
        }

        if (!placed) {
          // Reset to the default side so it reappears there once there's room.
          tip.options.direction = "right";
          tip.update();
          el.classList.add("is-crowded-out");
        }
      }
    };

    // This component's effect runs before the markers' (sibling effects fire in
    // tree order), so the tooltips don't exist yet on the first pass. The
    // observer on the tooltip pane is what actually triggers the first run, and
    // it also covers labels appearing later via filters.
    let queued: number | undefined;
    const schedule = () => {
      window.clearTimeout(queued);
      queued = window.setTimeout(run, 0);
    };

    const pane = map.getPane("tooltipPane");
    const observer = pane ? new MutationObserver(schedule) : null;
    observer?.observe(pane!, { childList: true });

    schedule();
    map.on("zoomend moveend resize", run);

    return () => {
      window.clearTimeout(queued);
      observer?.disconnect();
      map.off("zoomend moveend resize", run);
      // Leave nothing hidden behind when labels are switched off.
      map.eachLayer((layer) => {
        const marker = layer as L.Marker;
        if (typeof marker.getTooltip !== "function") return;
        const tip = marker.getTooltip() as PermanentTooltip | undefined;
        tip?._container?.classList.remove("is-crowded-out");
      });
    };
  }, [map, active, priorityName]);

  return null;
}

/**
 * Keeps Leaflet's internal size in sync. The ResizeObserver covers layout
 * changes; the orientation/resize listeners cover mobile browsers that rotate or
 * collapse their URL bar without the container box changing in time, which is
 * what leaves the map rendering half-blank.
 */
function ResizeWatcher() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const refresh = () => map.invalidateSize({ animate: false });

    const observer = new ResizeObserver(refresh);
    observer.observe(container);

    // Orientation changes settle a frame or two after the event fires.
    const onOrientation = () => {
      refresh();
      window.setTimeout(refresh, 250);
    };

    window.addEventListener("orientationchange", onOrientation);
    window.addEventListener("resize", refresh);
    window.visualViewport?.addEventListener("resize", refresh);

    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", onOrientation);
      window.removeEventListener("resize", refresh);
      window.visualViewport?.removeEventListener("resize", refresh);
    };
  }, [map]);

  return null;
}

export default function SiteMap({
  sites,
  office,
  selected,
  selectedId,
  onSelect,
  panOffsetX,
  liftAboveSheet,
  fitToken,
  colorMode = "borough",
  showLabels = false,
}: Props) {
  // The office is included in the fit so it never lands off-screen on load.
  const fitTargets = useMemo(
    () => (office ? [...sites, office] : sites),
    [sites, office],
  );

  const shapes = useMemo(
    () => (colorMode === "cluster" ? clusterShapes(sites) : []),
    [colorMode, sites],
  );
  return (
    <MapContainer
      center={NYC_FALLBACK}
      zoom={11}
      minZoom={9}
      maxZoom={18}
      zoomControl={false}
      scrollWheelZoom
      // Explicit so touch behaviour can't regress: one-finger drag, pinch zoom,
      // double-tap zoom. `tap` is left off — Leaflet's simulator double-fires
      // clicks on modern mobile browsers, which made markers hard to select.
      dragging
      touchZoom
      doubleClickZoom
      tapHold={false}
      className="h-full w-full"
    >
      <TileLayer url={OSM_TILES} attribution={OSM_ATTRIBUTION} maxZoom={19} />
      <ZoomControl position="bottomright" />
      <FitToSites sites={fitTargets} fitToken={fitToken} />
      <FlyToSelected
        site={selected}
        panOffsetX={panOffsetX}
        liftAboveSheet={liftAboveSheet}
      />
      <ResizeWatcher />
      <LabelDeclutter
        active={showLabels}
        priorityName={selected?.name ?? null}
      />

      {/* Cluster areas sit under the pins so they never block a tap. */}
      {shapes.map((shape) => (
        <Fragment key={`shape-${shape.cluster}`}>
          {shape.outline.length >= 3 && (
            <Polygon
              positions={shape.outline}
              interactive={false}
              // Leaflet's default simplification flattens the corner arcs into
              // sharp cuts at low zoom; 0 keeps the rounding.
              smoothFactor={0}
              pathOptions={{
                color: shape.color.base,
                weight: 1.5,
                opacity: 0.55,
                fillColor: shape.color.base,
                fillOpacity: 0.09,
                dashArray: "5 4",
              }}
            />
          )}
          <Marker
            position={shape.labelAt}
            icon={clusterBadgeIcon(
              shape.label,
              shape.color.base,
              shape.sites.length,
            )}
            interactive={false}
            zIndexOffset={-500}
          />
        </Fragment>
      ))}

      {sites.map((site) => (
        <SiteMarker
          key={site.id}
          site={site}
          selected={site.id === selectedId}
          onSelect={onSelect}
          colorMode={colorMode}
          showLabels={showLabels}
        />
      ))}

      {office && (
        <OfficeMarker
          office={office}
          selected={office.id === selectedId}
          onSelect={onSelect}
        />
      )}
    </MapContainer>
  );
}

function OfficeMarker({
  office,
  selected,
  onSelect,
}: {
  office: Office;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const icon = useMemo(() => officeIcon(office, selected), [office, selected]);
  const eventHandlers = useMemo(
    () => ({ click: () => onSelect(office.id) }),
    [onSelect, office.id],
  );

  return (
    <Marker
      position={[office.lat, office.lng]}
      icon={icon}
      // Above every housing pin, so the label never gets buried.
      zIndexOffset={selected ? 1600 : 1200}
      riseOnHover
      eventHandlers={eventHandlers}
      alt={office.name}
    >
      <Tooltip
        direction="right"
        offset={[14, -22]}
        opacity={1}
        className="lantern-tooltip"
      >
        <span className="block text-[13px] font-medium text-ink">
          {office.name}
        </span>
        <span className="block font-mono text-[11px] text-ink-faint">
          {office.address} · {office.floor}
        </span>
      </Tooltip>
    </Marker>
  );
}

function SiteMarker({
  site,
  selected,
  onSelect,
  colorMode,
  showLabels,
}: {
  site: Site;
  selected: boolean;
  onSelect: (id: string) => void;
  colorMode: ColorMode;
  showLabels: boolean;
}) {
  const icon = useMemo(
    () => siteIcon(site, selected, colorMode),
    [site, selected, colorMode],
  );
  const eventHandlers = useMemo(
    () => ({ click: () => onSelect(site.id) }),
    [onSelect, site.id],
  );

  return (
    <Marker
      position={[site.lat, site.lng]}
      icon={icon}
      zIndexOffset={selected ? 1000 : 0}
      riseOnHover
      eventHandlers={eventHandlers}
      alt={site.name}
    >
      <Tooltip
        // Leaflet only reads `permanent` when the tooltip is created, so the key
        // forces a remount when the Labels switch flips.
        key={showLabels ? "permanent" : "hover"}
        direction="right"
        offset={[10, -14]}
        opacity={1}
        permanent={showLabels}
        className={`lantern-tooltip${showLabels ? " lantern-tooltip--label" : ""}`}
      >
        {/* Labels mode shows the same name + address card as hover, just pinned
            open, so the basic details are readable without touching the pin. */}
        <span className="block text-[13px] font-medium text-ink">
          {site.name}
        </span>
        <span className="block font-mono text-[11px] text-ink-faint">
          {site.address}
        </span>
      </Tooltip>
    </Marker>
  );
}
