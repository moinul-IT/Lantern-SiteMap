import type { StyleSpecification } from "maplibre-gl";

/*
 * The basemap, as a MapLibre vector style.
 *
 * Why hand-written rather than a hosted style URL: this app's content is the
 * pins, and the raster basemaps we tried buried them. OSM's standard tiles are
 * the worst of it — every shop, cafe and bus stop drawn at full saturation —
 * and CARTO's Voyager, which was quiet enough, stopped being keyless and
 * started stamping "API KEY REQUIRED" across every tile.
 *
 * Vector tiles solve both at once. Nothing is drawn unless a layer below asks
 * for it, so "cluttered" becomes a choice we make rather than one we filter
 * afterwards, and the colours are real style properties instead of the CSS
 * `filter` hack the raster tiles needed. There is deliberately no POI layer at
 * all, and no house numbers, transit stops or route shields.
 *
 * Tiles come from OpenFreeMap: keyless, no signup, no rate limit, planet
 * rebuilt roughly weekly from OSM. The schema is standard OpenMapTiles, so
 * swapping in another OpenMapTiles host means changing TILES/GLYPHS below and
 * the matching entry in public/sw.js — nothing else. See "Basemap" in README.
 */

/**
 * TileJSON endpoint, *not* a tile URL template.
 *
 * OpenFreeMap serves each planet rebuild from its own dated path, and this
 * document is what says which one is current — the undated
 * `/planet/{z}/{x}/{y}.pbf` answers 200 with an empty body, so a hardcoded
 * template fails silently: every request succeeds and the map draws nothing.
 * Pointing the source at the TileJSON instead means MapLibre resolves the
 * current release itself and keeps following it as new ones are published.
 *
 * It also carries the source's zoom range. The tiles stop at z14 (MapLibre
 * numbering); MapLibre overzooms the geometry past that rather than giving up,
 * so the map stays sharp — vector lines, not stretched pixels — all the way to
 * the app's maxZoom of 18.
 *
 * The hostname is also matched in public/sw.js, which caches the three kinds of
 * request below separately. See "Basemap" in the README.
 */
const TILE_JSON = "https://tiles.openfreemap.org/planet";
const GLYPHS = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

/**
 * Credit line. MapLibre's own attribution control is switched off by
 * maplibre-gl-leaflet, so this is handed to Leaflet's control instead — see
 * VectorBasemap in components/SiteMap.tsx. It is also set on the source, which
 * is what any other consumer of this style would read.
 */
export const basemapAttribution =
  '<a href="https://openfreemap.org/">OpenFreeMap</a> · &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Leaflet zoom → MapLibre zoom.
 *
 * maplibre-gl-leaflet drives the GL map one level below Leaflet's, because
 * MapLibre's tiles are 512px where Leaflet's grid is 256px: the same ground
 * scale, numbered differently. Every zoom in this file is therefore written as
 * the Leaflet level the user is actually on and converted here, so the numbers
 * read against minZoom/maxZoom and the fly-to targets in components/SiteMap.tsx
 * rather than against an invisible internal scale.
 */
const z = (leafletZoom: number) => leafletZoom - 1;

/*
 * Mirrors the @theme block in app/globals.css — the basemap has to sit under
 * the same paper the cards and pins are drawn on. Duplicated as literals
 * because a GL style is JSON handed to a canvas renderer: it cannot read CSS
 * custom properties. If the palette moves there, move it here too.
 */
const LAND = "#f7f2e9"; // --color-cream
const PAPER = "#fdfbf7"; // --color-paper, the road fill
const HAIRLINE = "#e4dbcb"; // --color-hairline, the heaviest road casing
const INK = "#33291f";
const INK_SOFT = "#6b5f52";
const INK_FAINT = "#9a8f82";

/* Desaturated to sit beside the palette above rather than shout over it. */
const WATER = "#cadde5";
const WATER_INK = "#7796a3";
const GREEN = "#dfe7d5";
const BUILDING = "#ede4d5";
const BUILDING_EDGE = "#e3d9c7";
const CASING_SOFT = "#ece4d6"; // minor roads
const CASING_MID = "#e7dece"; // secondary/tertiary
const MOTORWAY = "#f3e2c6"; // the one road fill that is not paper
const MOTORWAY_EDGE = "#e4cda6";
const RAIL = "#ddd3c2";

const REGULAR = ["Noto Sans Regular"];
const BOLD = ["Noto Sans Bold"];

/** OSM names here are latin; `name_en` first so the English form wins if both exist. */
const NAME: unknown = ["coalesce", ["get", "name_en"], ["get", "name"]];

/** `class` is one of `values`. */
const classIn = (...values: string[]): unknown => [
  "match",
  ["get", "class"],
  values,
  true,
  false,
];

/**
 * How important a settlement has to be to earn a label, loosening as you zoom.
 *
 * OpenMapTiles ranks places by prominence, and around here the numbers fall into
 * clean bands: New York is 1, Newark 7, Paterson and Stamford 8 — and then a
 * wall of 11s and 12s arrives all at once (Yonkers, Elizabeth, Hempstead,
 * Levittown, Hicksville, Valley Stream, Perth Amboy…). Drawing that wall over
 * the whole tri-state area is most of what made the old basemap feel busy, and
 * none of it tells you anything about a site in the Bronx.
 *
 * So: the metropolis and its nearest cities at the opening view, the next tier
 * once you have zoomed into a borough, everything by the time you are looking
 * at a single site.
 *
 * The first step is at 13 rather than 12 because the opening fit lands between
 * 11 and 12 depending on the window, and from 12 the neighbourhood layer is
 * already labelling the ground you actually care about.
 */
const RANK_CAP: unknown = ["step", ["zoom"], 8, z(13), 12, z(15), 99];

/** Places of `classes` that clear the rank cap for the current zoom. */
const rankedPlaces = (...classes: string[]): unknown => [
  "all",
  classIn(...classes),
  ["<=", ["coalesce", ["get", "rank"], 99], RANK_CAP],
];

/**
 * A zoom ramp, taking [leafletZoom, value] pairs.
 *
 * Vector widths and text sizes are in screen px at a given zoom, so each road
 * tier needs its own curve or everything is a hairline when zoomed out and a
 * motorway when zoomed in. `exponential(1.5)` grows a little faster than the
 * zoom, which is what keeps the network legible as it densifies.
 */
const ramp = (stops: [number, number][]): unknown => [
  "interpolate",
  ["exponential", 1.5],
  ["zoom"],
  ...stops.flatMap(([leafletZoom, value]) => [z(leafletZoom), value]),
];

/*
 * Layer order is paint order: background, then areas, then roads (every casing
 * before every fill, so junctions join cleanly instead of each road drawing its
 * own outline over its neighbour), then labels last.
 */
export const basemapStyle: StyleSpecification = {
  version: 8,
  name: "Lantern paper",
  glyphs: GLYPHS,
  sources: {
    openmaptiles: {
      type: "vector",
      url: TILE_JSON,
      attribution: basemapAttribution,
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": LAND },
    },

    /* ── Areas ────────────────────────────────────────────────────────── */
    {
      id: "landcover",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landcover",
      filter: classIn("wood", "forest", "grass", "scrub", "farmland") as never,
      paint: { "fill-color": GREEN, "fill-opacity": 0.6 },
    },
    {
      id: "park",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "park",
      paint: { "fill-color": GREEN, "fill-opacity": 0.75 },
    },
    {
      id: "water",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "water",
      // Culverts and covered channels are not open water; drawing them puts
      // blue through blocks that read as dry at street level.
      filter: ["!=", ["get", "brunnel"], "tunnel"],
      paint: { "fill-color": WATER },
    },
    {
      id: "waterway",
      type: "line",
      source: "openmaptiles",
      "source-layer": "waterway",
      filter: ["!=", ["get", "brunnel"], "tunnel"],
      paint: {
        "line-color": WATER,
        "line-width": ramp([
          [10, 0.6],
          [15, 2],
          [18, 6],
        ]) as never,
      },
    },
    {
      id: "building",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "building",
      // Below this, footprints are a grey wash rather than information.
      minzoom: z(15),
      paint: {
        "fill-color": BUILDING,
        "fill-outline-color": BUILDING_EDGE,
        // Faded in over one level so they arrive rather than snap on.
        "fill-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          z(15),
          0,
          z(16),
          1,
        ] as never,
      },
    },

    /* ── Road casings ─────────────────────────────────────────────────── */
    {
      id: "road-minor-casing",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: z(13),
      filter: classIn("minor", "service", "track") as never,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": CASING_SOFT,
        "line-width": ramp([
          [13, 1.6],
          [16, 6],
          [18, 16],
        ]) as never,
      },
    },
    {
      id: "road-secondary-casing",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: z(11),
      filter: classIn("secondary", "tertiary") as never,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": CASING_MID,
        "line-width": ramp([
          [11, 1.4],
          [14, 4],
          [18, 20],
        ]) as never,
      },
    },
    {
      id: "road-primary-casing",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: z(9),
      filter: classIn("primary", "trunk") as never,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": HAIRLINE,
        "line-width": ramp([
          [9, 1.4],
          [14, 6],
          [18, 26],
        ]) as never,
      },
    },
    {
      id: "road-motorway-casing",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: z(7),
      filter: classIn("motorway") as never,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": MOTORWAY_EDGE,
        "line-width": ramp([
          [7, 1],
          [11, 3],
          [15, 8],
          [18, 30],
        ]) as never,
      },
    },

    /* ── Rail and road fills ──────────────────────────────────────────── */
    {
      id: "rail",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: z(13),
      filter: classIn("rail", "transit") as never,
      paint: {
        "line-color": RAIL,
        "line-width": ramp([
          [13, 0.7],
          [18, 2.4],
        ]) as never,
        "line-dasharray": [3, 2],
      },
    },
    {
      id: "road-minor",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: z(13),
      filter: classIn("minor", "service", "track") as never,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": PAPER,
        "line-width": ramp([
          [13, 0.6],
          [16, 4],
          [18, 13],
        ]) as never,
      },
    },
    {
      id: "road-secondary",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: z(11),
      filter: classIn("secondary", "tertiary") as never,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": PAPER,
        "line-width": ramp([
          [11, 0.5],
          [14, 2.4],
          [18, 16],
        ]) as never,
      },
    },
    {
      id: "road-primary",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: z(9),
      filter: classIn("primary", "trunk") as never,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": PAPER,
        "line-width": ramp([
          [9, 0.5],
          [14, 4],
          [18, 21],
        ]) as never,
      },
    },
    {
      id: "road-motorway",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: z(7),
      filter: classIn("motorway") as never,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": MOTORWAY,
        "line-width": ramp([
          [7, 0.5],
          [11, 1.8],
          [15, 6],
          [18, 25],
        ]) as never,
      },
    },

    /*
     * Borough lines. admin_level 4 is the state and 5-6 the county — which in
     * this city is the borough, and the single most useful piece of context on
     * a map whose pins are coloured by exactly that. Maritime segments are
     * dropped: they trace the harbour rather than anything anyone can see.
     */
    {
      id: "boundary",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      filter: [
        "all",
        [">=", ["get", "admin_level"], 4],
        ["<=", ["get", "admin_level"], 6],
        ["!=", ["get", "maritime"], 1],
      ],
      layout: { "line-join": "round" },
      paint: {
        "line-color": INK_FAINT,
        "line-opacity": 0.4,
        "line-dasharray": [4, 3],
        "line-width": ramp([
          [9, 0.6],
          [15, 1.4],
        ]) as never,
      },
    },

    /* ── Labels ───────────────────────────────────────────────────────── */
    {
      id: "water-label",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "water_name",
      minzoom: z(12),
      layout: {
        "text-field": NAME as never,
        "text-font": REGULAR,
        "text-size": 11,
        "text-letter-spacing": 0.08,
        "text-max-width": 7,
      },
      paint: {
        "text-color": WATER_INK,
        "text-halo-color": LAND,
        "text-halo-width": 1,
      },
    },
    {
      id: "road-label",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "transportation_name",
      // Street names only once a site is selected and the map has flown in to
      // 14; any earlier and they are the clutter this style exists to avoid.
      minzoom: z(14),
      filter: classIn(
        "motorway",
        "trunk",
        "primary",
        "secondary",
        "tertiary",
        "minor",
      ) as never,
      layout: {
        "text-field": NAME as never,
        "text-font": REGULAR,
        "text-size": ramp([
          [14, 9.5],
          [18, 12],
        ]) as never,
        "symbol-placement": "line",
        "text-rotation-alignment": "map",
        "text-padding": 4,
      },
      paint: {
        "text-color": INK_FAINT,
        "text-halo-color": PAPER,
        "text-halo-width": 1.4,
      },
    },
    {
      id: "place-neighbourhood",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      minzoom: z(12),
      filter: classIn("suburb", "neighbourhood", "quarter") as never,
      layout: {
        "text-field": NAME as never,
        "text-font": REGULAR,
        "text-size": ramp([
          [12, 10],
          [16, 13],
        ]) as never,
        "text-letter-spacing": 0.06,
        "text-max-width": 8,
        "text-transform": "uppercase",
      },
      paint: {
        "text-color": INK_SOFT,
        "text-halo-color": LAND,
        "text-halo-width": 1.6,
      },
    },
    {
      id: "place-town",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      // Above this the neighbourhood layer carries the labelling on its own.
      maxzoom: z(15),
      // Nothing here outranks 11, so the cap keeps the whole layer off the
      // opening view and lets it in a borough at a time.
      filter: rankedPlaces("town", "village") as never,
      layout: {
        "text-field": NAME as never,
        "text-font": REGULAR,
        "text-size": 11,
        "text-max-width": 8,
      },
      paint: {
        "text-color": INK_SOFT,
        "text-halo-color": LAND,
        "text-halo-width": 1.6,
      },
    },
    {
      id: "place-city",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      maxzoom: z(15),
      filter: rankedPlaces("city") as never,
      layout: {
        "text-field": NAME as never,
        "text-font": BOLD,
        "text-size": ramp([
          [10, 12],
          [14, 15],
        ]) as never,
        "text-letter-spacing": 0.04,
        "text-max-width": 8,
      },
      paint: {
        "text-color": INK,
        "text-halo-color": LAND,
        "text-halo-width": 1.8,
      },
    },
  ],
};
