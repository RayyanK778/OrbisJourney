// Step 5: Validate. Errors stop the build. Warnings are listed in docs/data-report.md for
// review, because many of them will be real history rather than mistakes.
import type { Position } from 'geojson';
import type { Confidence } from '../../shared/schema.ts';
import { formatRange, isYear, nextYear } from '../../shared/years.ts';
import { CHECKS } from '../config.ts';
import { polygonsOf } from '../lib/geo.ts';
import { error, warning, type Issue } from '../lib/issues.ts';
import type { CorrectedRecord } from './correct.ts';

/** A territory record: one shape valid for a span of years (blueprint section 3.3). */
export interface FinalRecord extends CorrectedRecord {
  /** Stable ID: the slug of the source name and the first year, e.g. "kingdom-of-sweden:1905" */
  id: string;
  confidence: Confidence;
  /** Source dataset and version, e.g. "cliopatria@0.2.1" */
  source: string;
}

const describe = (r: FinalRecord) => `"${r.label}" ${formatRange(r.from, r.to)}`;

function geometryProblem(r: FinalRecord): string | null {
  const g = r.geometry;
  if (!g) return 'has no geometry';
  if (g.type !== 'Polygon' && g.type !== 'MultiPolygon') return `has a ${(g as { type: string }).type} instead of a polygon`;
  const polys = polygonsOf(g);
  if (polys.length === 0) return 'has an empty geometry';
  const badPoint = (p: Position) =>
    p.length < 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90;
  for (const poly of polys)
    for (const ring of poly) {
      if (ring.length < 4) return 'has a ring with fewer than 4 points';
      if (ring.some(badPoint)) return 'has a coordinate that is missing or out of range';
      const [a, b] = [ring[0], ring[ring.length - 1]];
      if (a[0] !== b[0] || a[1] !== b[1]) return 'has a ring that is not closed';
    }
  return null;
}

/** Groups items by a key, keeping input order within each group. */
const groupBy = <T>(items: T[], key: (t: T) => string) => {
  const m = new Map<string, T[]>();
  for (const t of items) m.set(key(t), [...(m.get(key(t)) ?? []), t]);
  return m;
};

/** Pairs of records in the same group whose years overlap. */
function overlappingInTime(group: FinalRecord[]): [FinalRecord, FinalRecord][] {
  const sorted = [...group].sort((a, b) => a.from - b.from);
  const pairs: [FinalRecord, FinalRecord][] = [];
  for (let i = 0; i < sorted.length; i++)
    for (let j = i + 1; j < sorted.length && sorted[j].from <= sorted[i].to; j++) pairs.push([sorted[i], sorted[j]]);
  return pairs;
}

export function validate(records: FinalRecord[]): Issue[] {
  const issues: Issue[] = [];

  // Geometry and dates
  for (const r of records) {
    const problem = geometryProblem(r);
    if (problem) issues.push(error('geometry', `${describe(r)} ${problem}.`));
    if (!isYear(r.from) || !isYear(r.to)) issues.push(error('dates', `${describe(r)} has an invalid year (must be a whole number, not 0).`));
    else if (r.from > r.to) issues.push(error('dates', `${describe(r)} ends before it starts.`));
    if (r.isGrouping !== r.components.length > 0)
      issues.push(warning('grouping-shape',
        `${describe(r)} ${r.isGrouping ? 'has a grouping name but lists no components' : 'lists components but has no grouping name'}.`));
  }

  // Record IDs must be unique, since the app and corrections refer to them
  for (const [id, group] of groupBy(records, r => r.id))
    if (group.length > 1) issues.push(error('duplicate-id', `${group.length} records share the ID "${id}".`));

  // The same source name twice in one year would draw the polity twice
  for (const group of groupBy(records, r => r.name).values())
    for (const [a, b] of overlappingInTime(group))
      issues.push(error('duplicate-name-year', `"${a.name}" has two records in the same years: ${formatRange(a.from, a.to)} and ${formatRange(b.from, b.to)}.`));

  // One entity filled twice at once usually means two names were merged wrongly
  const leaves = records.filter(r => !r.isGrouping);
  for (const group of groupBy(leaves, r => r.entityId).values())
    for (const [a, b] of overlappingInTime(group))
      if (a.name !== b.name)
        issues.push(warning('entity-overlap', `Entity "${a.entityId}" is filled twice at once: ${describe(a)} and ${describe(b)}.`));

  // Sudden area changes between consecutive records of one entity
  for (const group of groupBy(leaves, r => r.entityId).values()) {
    const sorted = [...group].sort((a, b) => a.from - b.from);
    for (let i = 1; i < sorted.length; i++) {
      const [a, b] = [sorted[i - 1], sorted[i]];
      if (b.from !== nextYear(a.to) || !(a.area > 0) || !(b.area > 0)) continue;
      const ratio = Math.max(a.area, b.area) / Math.min(a.area, b.area);
      const change = Math.abs(b.area - a.area);
      if (ratio >= CHECKS.areaJumpRatio && change >= CHECKS.areaJumpMinKm2)
        issues.push(warning('area-jump',
          `"${a.entityId}" goes from ${Math.round(a.area).toLocaleString('en-US')} km² (${describe(a)}) to ${Math.round(b.area).toLocaleString('en-US')} km² (${describe(b)}), ×${(b.area / a.area).toFixed(2)}.`,
          change));
    }
  }

  return issues;
}
