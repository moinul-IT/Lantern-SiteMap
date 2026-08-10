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
  /** Outline enclosing the cluster's sites; empty when fewer than 3 points. */
  outline: Point[];
  centroid: Point;
};

/** Andrew's monotone chain. Returns points in counter-clockwise order. */
function convexHull(points: Point[]): Point[] {
  if (points.length < 3) return [...points];

  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Point, a: Point, b: Point) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const build = (pts: Point[]) => {
    const stack: Point[] = [];
    for (const p of pts) {
      while (
        stack.length >= 2 &&
        cross(stack[stack.length - 2], stack[stack.length - 1], p) <= 0
      ) {
        stack.pop();
      }
      stack.push(p);
    }
    return stack;
  };

  const lower = build(sorted);
  const upper = build([...sorted].reverse());
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function centroidOf(points: Point[]): Point {
  const lat = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const lng = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  return [lat, lng];
}

/**
 * Pushes the hull outward from its centroid so the outline sits around the pins
 * instead of running straight through them, with a floor so tight clusters
 * (Audubon/Savanna are ~100 ft apart) still read as an area.
 */
function inflate(
  hull: Point[],
  centroid: Point,
  factor = 0.28,
  minDeg = 0.004,
) {
  return hull.map(([lat, lng]) => {
    const dLat = lat - centroid[0];
    const dLng = lng - centroid[1];
    const dist = Math.hypot(dLat, dLng) || 1e-9;
    const grow = Math.max(dist * factor, minDeg);
    return [lat + (dLat / dist) * grow, lng + (dLng / dist) * grow] as Point;
  });
}

/** Builds one shape per cluster present in `sites`. Shelters are excluded. */
export function clusterShapes(sites: Site[]): ClusterShape[] {
  return CLUSTERS.flatMap((cluster) => {
    const members = sites.filter((s) => s.cluster === cluster);
    if (members.length === 0) return [];

    const points: Point[] = members.map((s) => [s.lat, s.lng]);
    const centroid = centroidOf(points);
    const hull = convexHull(points);

    return [
      {
        cluster,
        label: clusterLabel(cluster),
        color: CLUSTER_COLORS[cluster],
        sites: members,
        outline: hull.length >= 3 ? inflate(hull, centroid) : [],
        centroid,
      },
    ];
  });
}
