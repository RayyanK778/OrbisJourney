import type { MultiPolygon, Polygon, Position } from 'geojson';

export type Bbox = [minX: number, minY: number, maxX: number, maxY: number];

/** Polygon rings as nested arrays, whether the geometry is a Polygon or a MultiPolygon. */
export const polygonsOf = (g: Polygon | MultiPolygon): Position[][][] =>
  g.type === 'Polygon' ? [g.coordinates] : g.coordinates;

export function bboxOf(g: Polygon | MultiPolygon): Bbox {
  const b: Bbox = [Infinity, Infinity, -Infinity, -Infinity];
  for (const poly of polygonsOf(g))
    for (const [x, y] of poly[0]) {
      if (x < b[0]) b[0] = x;
      if (y < b[1]) b[1] = y;
      if (x > b[2]) b[2] = x;
      if (y > b[3]) b[3] = y;
    }
  return b;
}

export const bboxesIntersect = (a: Bbox, b: Bbox): boolean =>
  a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];

const EARTH_RADIUS_KM = 6371.0088;
const rad = (d: number) => (d * Math.PI) / 180;

/**
 * Area of a ring on a sphere, in km² (the method of Chamberlain and Duquette, 2007,
 * also used by Turf.js). The sign depends on winding order.
 */
function ringArea(ring: Position[]): number {
  let total = 0;
  const n = ring.length;
  if (n < 3) return 0;
  for (let i = 0; i < n; i++) {
    const [x1] = ring[i === 0 ? n - 1 : i - 1];
    const [, y2] = ring[i];
    const [x3] = ring[(i + 1) % n];
    total += (rad(x3) - rad(x1)) * Math.sin(rad(y2));
  }
  return (total * EARTH_RADIUS_KM * EARTH_RADIUS_KM) / 2;
}

/** Area in km² of polygons given as nested rings (outer ring first, then holes). */
export const areaOfPolygons = (polys: Position[][][]): number =>
  polys.reduce((sum, [outer, ...holes]) => sum + Math.abs(ringArea(outer)) - holes.reduce((h, r) => h + Math.abs(ringArea(r)), 0), 0);

export const areaKm2 = (g: Polygon | MultiPolygon): number => areaOfPolygons(polygonsOf(g));
