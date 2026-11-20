// Step 2: Normalize. Converts Cliopatria features into plain records with tidy fields.
//
// Year 0: Cliopatria writes years as plain integers, negative for BCE. Its paper doesn't
// say how year 0 is handled, and 6 records end at year 0 while 7 start at year 1. We
// read a source 0 as 1 BCE (stored as -1), which keeps every one of those records
// adjacent to its successor. See blueprint section 3.2, finding 8.
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import { splitList } from '../lib/text.ts';

export interface CliopatriaProps {
  Name: string;
  FromYear: number;
  ToYear: number;
  Area: number;
  Type: string;
  Wikipedia: string;
  Wikidata: string;
  SeshatID: string;
  Components: string;
  MemberOf: string;
}

export interface SourceRecord {
  name: string;
  from: number;
  to: number;
  /** km², computed by Cliopatria in an equal-area projection (EPSG:6933) */
  area: number;
  type: string;
  isGrouping: boolean;
  wikipedia?: string;
  wikidata?: string;
  seshatIds: string[];
  components: string[];
  memberOf: string[];
  geometry: Polygon | MultiPolygon | null;
}

export interface NormalizeResult {
  records: SourceRecord[];
  totalInSource: number;
  outsideRange: number;
  yearZeroFixes: { name: string; field: 'from' | 'to' }[];
}

/** Source year to historical year: a source 0 becomes 1 BCE. */
const fixYear = (year: number) => (year === 0 ? -1 : year);

export function normalize(
  features: Feature<Polygon | MultiPolygon | null, CliopatriaProps>[],
  range: { min: number; max: number },
): NormalizeResult {
  const yearZeroFixes: NormalizeResult['yearZeroFixes'] = [];
  const records: SourceRecord[] = [];
  for (const f of features) {
    const p = f.properties;
    if (p.FromYear === 0) yearZeroFixes.push({ name: p.Name, field: 'from' });
    if (p.ToYear === 0) yearZeroFixes.push({ name: p.Name, field: 'to' });
    const from = fixYear(p.FromYear);
    const to = fixYear(p.ToYear);
    if (to < range.min || from > range.max) continue;
    records.push({
      name: p.Name.trim(),
      from,
      to,
      area: p.Area,
      type: p.Type,
      // Cliopatria marks composite entities by putting their name in parentheses
      isGrouping: p.Name.trim().startsWith('('),
      wikipedia: p.Wikipedia || undefined,
      wikidata: p.Wikidata || undefined,
      seshatIds: splitList(p.SeshatID),
      components: splitList(p.Components),
      memberOf: splitList(p.MemberOf),
      geometry: f.geometry,
    });
  }
  return { records, totalInSource: features.length, outsideRange: features.length - records.length, yearZeroFixes };
}
