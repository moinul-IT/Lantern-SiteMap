/*
 * Copies MapLibre's tile worker into public/maplibre/ so the app can serve it
 * itself. Runs from `predev` and `prebuild`, so nothing has to be remembered.
 *
 * Why this exists: MapLibre parses every vector tile in a Web Worker, and the
 * worker is a real ES module that imports a sibling, `maplibre-gl-shared.mjs`,
 * by relative path. Bundlers copy the worker out as an opaque asset and do not
 * follow that import, so the sibling 404s and the worker dies on its first
 * line. Nothing catches it: the map keeps its canvas, resolves its style, and
 * simply never decodes a tile — a blank basemap with the pins still on it.
 *
 * Serving both files ourselves, side by side, takes the bundler out of it: the
 * relative import resolves the way the package intended. The pair is copied
 * rather than committed so it can never drift from the installed version.
 *
 * Sizes are what they are — the shared module is ~490 KB raw, and the main
 * thread loads its own bundled copy of the same code. That duplication is how
 * MapLibre ships; both halves gzip to a fraction of it, and the service worker
 * caches this pair on first load.
 */

import { createRequire } from "node:module";
import { mkdir, copyFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

/* The worker first: the shared module is its only import. */
const FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

const OUT_DIR = join(process.cwd(), "public", "maplibre");

/** Resolves the installed package's dist/ rather than guessing at node_modules. */
function distDir() {
  // The package exports "./dist/*", so this resolves without reaching past it.
  return dirname(require.resolve("maplibre-gl/dist/maplibre-gl-worker.mjs"));
}

/** Skips a copy whose destination already matches, keeping `npm run dev` quick. */
async function isCurrent(from, to) {
  try {
    const [src, dest] = await Promise.all([stat(from), stat(to)]);
    return src.size === dest.size && dest.mtimeMs >= src.mtimeMs;
  } catch {
    return false;
  }
}

const src = distDir();
await mkdir(OUT_DIR, { recursive: true });

let copied = 0;
for (const name of FILES) {
  const from = join(src, name);
  const to = join(OUT_DIR, name);
  if (await isCurrent(from, to)) continue;
  await copyFile(from, to);
  copied += 1;
}

console.log(
  copied === 0
    ? "maplibre worker: already current"
    : `maplibre worker: copied ${copied} file(s) to public/maplibre/`,
);
