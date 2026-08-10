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

const CARTO_VOYAGER =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
  '&copy; <a href="https://carto.com/attributions">CARTO</a>';

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
}: {
  site: Located | null;
  panOffsetX?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!site) return;

    // Shifting the centre east by half the panel width lands the pin in the
    // middle of the map area still visible beside the panel.
    const zoom = Math.max(map.getZoom(), 14);
    const target = map
      .project([site.lat, site.lng], zoom)
      .add([panOffsetX / 2, 0]);
    const center = map.unproject(target, zoom);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      map.setView(center, zoom, { animate: false });
      return;
    }

    map.flyTo(center, zoom, { duration: 0.85, easeLinearity: 0.3 });
  }, [map, site, panOffsetX]);

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
      <TileLayer
        url={CARTO_VOYAGER}
        attribution={CARTO_ATTRIBUTION}
        subdomains="abcd"
        detectRetina
      />
      <ZoomControl position="bottomright" />
      <FitToSites sites={fitTargets} fitToken={fitToken} />
      <FlyToSelected site={selected} panOffsetX={panOffsetX} />
      <ResizeWatcher />

      {/* Cluster areas sit under the pins so they never block a tap. */}
      {shapes.map((shape) => (
        <Fragment key={`shape-${shape.cluster}`}>
          {shape.outline.length >= 3 && (
            <Polygon
              positions={shape.outline}
              interactive={false}
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
            position={shape.centroid}
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
