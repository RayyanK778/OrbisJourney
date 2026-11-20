// Part of step 5: finds filled territories that cover the same ground in the same years.
// Shared borders produce tiny slivers, so only overlaps above the thresholds in config.ts
// are reported, and repeated findings for the same two names are merged into one.
//
// Comparing shapes is slow (about 2 minutes for the full data), so results are cached by
// a fingerprint of the two shapes. A rebuild with unchanged shapes reuses every result.
import crypto from 'node:crypto';
import polygonClipping, { type Geom } from 'polygon-clipping';
import { formatRange, nextYear } from '../../shared/years.ts';
import { CHECKS } from '../config.ts';
import { areaOfPolygons, bboxesIntersect, bboxOf, polygonsOf, type Bbox } from '../lib/geo.ts';
import { warning, type Issue } from '../lib/issues.ts';
import type { FinalRecord } from './validate.ts';

/** Overlap area in km² by pair of shape fingerprints; null when the comparison failed. */
export type OverlapCache = Record<string, number | null>;

/** Bump when the comparison changes, so stale cached results aren't reused. */
export const OVERLAP_CACHE_VERSION = 1;

export interface OverlapStats {
  candidates: number;
  computed: number;
  cached: number;
  failed: number;
  ms: number;
}

const fingerprint = (r: FinalRecord) =>
  crypto.createHash('sha1').update(JSON.stringify(r.geometry!.coordinates)).digest('hex').slice(0, 16);

/** Joins year spans that touch or overlap: [[1940,1940],[1941,1942]] -> [[1940,1942]] */
function mergeSpans(spans: [number, number][]): [number, number][] {
  const sorted = [...spans].sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const [from, to] of sorted) {
    const last = out[out.length - 1];
    if (last && from <= nextYear(last[1])) last[1] = Math.max(last[1], to);
    else out.push([from, to]);
  }
  return out;
}

/** Returns the warnings and a new cache holding only the pairs this build compared. */
export function findOverlaps(records: FinalRecord[], previous: OverlapCache): { issues: Issue[]; stats: OverlapStats; cache: OverlapCache } {
  const cache: OverlapCache = {};
  const t0 = performance.now();
  const leaves = records
    .filter(r => !r.isGrouping && r.geometry)
    .map(r => ({ r, bbox: bboxOf(r.geometry!) as Bbox, area: areaOfPolygons(polygonsOf(r.geometry!)), key: fingerprint(r) }))
    .sort((a, b) => a.r.from - b.r.from);

  const stats: OverlapStats = { candidates: 0, computed: 0, cached: 0, failed: 0, ms: 0 };
  const findings = new Map<string, { a: string; b: string; spans: [number, number][]; overlap: number; share: number }>();

  // Sweep through time, keeping the records whose years are still running
  let active: typeof leaves = [];
  for (const cur of leaves) {
    active = active.filter(a => a.r.to >= cur.r.from);
    for (const other of active) {
      if (other.r.entityId === cur.r.entityId || !bboxesIntersect(other.bbox, cur.bbox)) continue;
      stats.candidates++;
      const cacheKey = [other.key, cur.key].sort().join('|');
      let overlap = cache[cacheKey] ?? previous[cacheKey];
      if (overlap === undefined) {
        try {
          overlap = areaOfPolygons(polygonClipping.intersection(other.r.geometry!.coordinates as Geom, cur.r.geometry!.coordinates as Geom));
        } catch {
          overlap = null;
        }
        stats.computed++;
      } else stats.cached++;
      cache[cacheKey] = overlap;
      if (overlap === null) {
        stats.failed++;
        continue;
      }

      const share = overlap / Math.min(other.area, cur.area);
      if (overlap < CHECKS.overlapMinKm2 && !(share >= CHECKS.overlapMinShare && overlap >= 1)) continue;
      const [a, b] = [other.r.label, cur.r.label].sort();
      const span: [number, number] = [Math.max(other.r.from, cur.r.from), Math.min(other.r.to, cur.r.to)];
      const f = findings.get(`${a}|${b}`);
      if (!f) findings.set(`${a}|${b}`, { a, b, spans: [span], overlap, share });
      else {
        f.spans.push(span);
        if (overlap > f.overlap) Object.assign(f, { overlap, share });
      }
    }
    active.push(cur);
  }

  const issues: Issue[] = [...findings.values()].map(f =>
    warning('overlap',
      `"${f.a}" and "${f.b}" overlap by up to ${Math.round(f.overlap).toLocaleString('en-US')} km² (${Math.round(f.share * 100)}% of the smaller) in ${mergeSpans(f.spans).map(([x, y]) => formatRange(x, y)).join(', ')}.`,
      f.overlap));
  if (stats.failed)
    issues.push(warning('overlap-check-failed',
      `The overlap check could not compare ${stats.failed} pairs of shapes, probably because one of them has invalid geometry.`, stats.failed));
  stats.ms = performance.now() - t0;
  return { issues, stats, cache };
}
