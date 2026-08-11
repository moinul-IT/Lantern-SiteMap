import {
  CLUSTERS,
  CLUSTER_COLORS,
  clusterLabel,
  type ClusterId,
  type Site,
} from "./sites";

export type Point = [number, number];

export type ClusterShape = {
  cluster: ClusterId;
  label: string;
  color: { base: string; soft: string };
  sites: Site[];
  /** Rounded-box outline enclosing the cluster's sites. */
  outline: Point[];
  centroid: Point;
  /** Where the cluster's name chip sits — top edge, clear of the pins. */
  labelAt: Point;
};

/*
 * Convex hulls read badly here: a cluster spanning two boroughs collapsed into a
 * sliver (Cluster 1 was 4.4:1, Cluster 4 3.2:1). These are padded rounded boxes
 * instead — blockier, and predictable at any zoom.
 *
 * Two hard rules, in order:
 *   1. a box always contains its own pins;
 *   2. no two boxes may intersect.
 * Padding and squareness are preferences that yield to both. Each edge moves
 * independently, so a box hemmed in on one side can still even itself out by
 * growing on a free side.
 */

/** Target: no side more than this multiple of the other, where room allows. */
const MAX_ASPECT = 1.9;
/** Smallest visual side, so a 1–2 site cluster still reads as an area. */
const MIN_SIDE = 0.014;
/** Breathing room around the outermost pins, as a share of the half-span. */
const PAD_RATIO = 0.16;
const MIN_PAD = 0.0035;
/** Cap stops the geographically huge clusters ballooning further. */
const MAX_PAD = 0.012;
/**
 * Keeps a pin off the rounded corner at minimum size. Deliberately tiny:
 * Clusters 3 and 4 interleave in the Bronx with only ~0.002 between their pins,
 * so anything spent here is gap that can't be opened later.
 */
const CONTAIN_SAFETY = 0.0002;
/** Daylight required between neighbours; must fit the tightest pair. */
const SEPARATION_GAP = 0.0004;
/** Corner rounding, as a share of the shorter side. */
const CORNER_RATIO = 0.22;
const STEPS_PER_CORNER = 6;
/** Aspect-repair growth. */
const GROW_STEP = 0.0008;
const GROW_ATTEMPTS = 60;

/**
 * In Web Mercator a degree of latitude covers more screen distance than a degree
 * of longitude, by 1/cos(lat). Scaling latitude by this puts both axes in
 * screen-proportional units, so a "square" box actually looks square.
 *
 * ONE scale is shared by every box on purpose. Deriving it per box from that
 * box's own centre puts each box in a slightly different frame, and since
 * latitudes here are ~40.8 a 0.2% difference in the factor shows up as a ~0.09
 * shift — enough to report two overlapping boxes as far apart.
 */
const REF_LAT = 40.75;
const K = 1 / Math.cos((REF_LAT * Math.PI) / 180);

type Box = {
  cluster: ClusterId;
  sites: Site[];
  /** Current edges, in screen-proportional units (x = lng, y = lat * K). */
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  /** Raw pin bounding box — edges may never cross these. */
  rx0: number;
  rx1: number;
  ry0: number;
  ry1: number;
};

const width = (b: Box) => b.x1 - b.x0;
const height = (b: Box) => b.y1 - b.y0;
const aspectOf = (b: Box) =>
  Math.max(width(b), height(b)) / Math.max(Math.min(width(b), height(b)), 1e-9);

/** Signed clearance: positive means a genuine gap on that axis. */
function gapX(a: Box, b: Box) {
  return Math.max(a.x0 - b.x1, b.x0 - a.x1);
}
function gapY(a: Box, b: Box) {
  return Math.max(a.y0 - b.y1, b.y0 - a.y1);
}

/** Boxes are clear when either axis holds at least the required gap. */
function clear(a: Box, b: Box) {
  return gapX(a, b) >= SEPARATION_GAP || gapY(a, b) >= SEPARATION_GAP;
}

/** Pulls the two facing edges inward until the pair is clear, or room runs out. */
function separate(boxes: Box[]) {
  for (let pass = 0; pass < 80; pass += 1) {
    let adjusted = false;

    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        if (clear(a, b)) continue;

        const needX = SEPARATION_GAP - gapX(a, b);
        const needY = SEPARATION_GAP - gapY(a, b);

        // Only the edges that actually face each other can give ground.
        const [loX, hiX] = a.x0 + a.x1 <= b.x0 + b.x1 ? [a, b] : [b, a];
        const roomX = loX.x1 - loX.rx1 + (hiX.rx0 - hiX.x0);

        const [loY, hiY] = a.y0 + a.y1 <= b.y0 + b.y1 ? [a, b] : [b, a];
        const roomY = loY.y1 - loY.ry1 + (hiY.ry0 - hiY.y0);

        const canX = roomX >= needX;
        const canY = roomY >= needY;

        // Both possible: take the cheaper. One possible: take it. Neither:
        // take whichever makes the most progress, so this can never stall.
        let axis: "x" | "y";
        if (canX && canY) axis = needX <= needY ? "x" : "y";
        else if (canX) axis = "x";
        else if (canY) axis = "y";
        else axis = roomY / needY >= roomX / needX ? "y" : "x";

        if (axis === "y") {
          const share = Math.min(needY, roomY);
          if (share <= 1e-9) continue;
          const loRoom = loY.y1 - loY.ry1;
          const hiRoom = hiY.ry0 - hiY.y0;
          const total = loRoom + hiRoom;
          if (total <= 1e-9) continue;
          loY.y1 -= (share * loRoom) / total;
          hiY.y0 += (share * hiRoom) / total;
        } else {
          const share = Math.min(needX, roomX);
          if (share <= 1e-9) continue;
          const loRoom = loX.x1 - loX.rx1;
          const hiRoom = hiX.rx0 - hiX.x0;
          const total = loRoom + hiRoom;
          if (total <= 1e-9) continue;
          loX.x1 -= (share * loRoom) / total;
          hiX.x0 += (share * hiRoom) / total;
        }
        adjusted = true;
      }
    }

    if (!adjusted) break;
  }
}

/**
 * Evens out boxes left lopsided by separation, by growing the short axis outward
 * one edge at a time and keeping only steps that stay clear of every neighbour.
 */
function repairAspect(boxes: Box[]) {
  for (const box of boxes) {
    const others = boxes.filter((other) => other !== box);

    for (let attempt = 0; attempt < GROW_ATTEMPTS; attempt += 1) {
      if (aspectOf(box) <= MAX_ASPECT) break;
      const growVertically = height(box) < width(box);

      // Try both edges of the short axis; keep whichever is allowed.
      const edges: (keyof Box)[] = growVertically ? ["y1", "y0"] : ["x1", "x0"];
      let grew = false;

      for (const edge of edges) {
        const before = box[edge] as number;
        (box[edge] as number) =
          edge === "y1" || edge === "x1"
            ? before + GROW_STEP
            : before - GROW_STEP;

        if (others.every((other) => clear(box, other))) {
          grew = true;
          break;
        }
        (box[edge] as number) = before;
      }

      if (!grew) break;
    }
  }
}

export function clusterShapes(sites: Site[]): ClusterShape[] {
  const boxes: Box[] = CLUSTERS.flatMap((cluster) => {
    const members = sites.filter((s) => s.cluster === cluster);
    if (members.length === 0) return [];

    const lats = members.map((s) => s.lat * K);
    const lngs = members.map((s) => s.lng);
    const rx0 = Math.min(...lngs) - CONTAIN_SAFETY;
    const rx1 = Math.max(...lngs) + CONTAIN_SAFETY;
    const ry0 = Math.min(...lats) - CONTAIN_SAFETY;
    const ry1 = Math.max(...lats) + CONTAIN_SAFETY;

    const padX = Math.min(
      Math.max(((rx1 - rx0) / 2) * PAD_RATIO, MIN_PAD),
      MAX_PAD,
    );
    const padY = Math.min(
      Math.max(((ry1 - ry0) / 2) * PAD_RATIO, MIN_PAD),
      MAX_PAD,
    );

    const box: Box = {
      cluster,
      sites: members,
      x0: rx0 - padX,
      x1: rx1 + padX,
      y0: ry0 - padY,
      y1: ry1 + padY,
      rx0,
      rx1,
      ry0,
      ry1,
    };

    // Minimum size, then even out, both symmetric about the centre.
    const bumpX = Math.max(0, (MIN_SIDE - width(box)) / 2);
    box.x0 -= bumpX;
    box.x1 += bumpX;
    const bumpY = Math.max(0, (MIN_SIDE - height(box)) / 2);
    box.y0 -= bumpY;
    box.y1 += bumpY;

    if (width(box) > height(box) * MAX_ASPECT) {
      const extra = (width(box) / MAX_ASPECT - height(box)) / 2;
      box.y0 -= extra;
      box.y1 += extra;
    } else if (height(box) > width(box) * MAX_ASPECT) {
      const extra = (height(box) / MAX_ASPECT - width(box)) / 2;
      box.x0 -= extra;
      box.x1 += extra;
    }

    return [box];
  });

  separate(boxes);
  repairAspect(boxes);

  return boxes.map((box) => {
    const radius = Math.min(width(box), height(box)) * 0.5 * CORNER_RATIO;
    const cx = (box.x0 + box.x1) / 2;
    const cy = (box.y0 + box.y1) / 2;
    return {
      cluster: box.cluster,
      label: clusterLabel(box.cluster),
      color: CLUSTER_COLORS[box.cluster],
      sites: box.sites,
      outline: roundedBox(box, radius).map(([x, y]) => [y / K, x] as Point),
      centroid: [cy / K, cx] as Point,
      // Sits on the top edge so it never lands on top of a pin.
      labelAt: [box.y1 / K, cx] as Point,
    };
  });
}

/** Rounded rectangle as a polygon, built in screen-proportional space. */
function roundedBox(box: Box, radius: number): Point[] {
  const r = Math.min(radius, width(box) / 2, height(box) / 2);

  const corners = [
    { x: box.x1 - r, y: box.y0 + r, from: -90 }, // bottom-right
    { x: box.x1 - r, y: box.y1 - r, from: 0 }, // top-right
    { x: box.x0 + r, y: box.y1 - r, from: 90 }, // top-left
    { x: box.x0 + r, y: box.y0 + r, from: 180 }, // bottom-left
  ];

  const points: Point[] = [];
  for (const corner of corners) {
    for (let step = 0; step <= STEPS_PER_CORNER; step += 1) {
      const angle =
        ((corner.from + (90 * step) / STEPS_PER_CORNER) * Math.PI) / 180;
      points.push([
        corner.x + Math.cos(angle) * r,
        corner.y + Math.sin(angle) * r,
      ]);
    }
  }
  return points;
}
