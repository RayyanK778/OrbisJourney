// Small builders for tests, so each test only spells out the fields it cares about.
import type { Polygon } from 'geojson';
import type { IdentifiedRecord } from './steps/identify.ts';
import type { SourceRecord } from './steps/normalize.ts';

/** A square polygon with its lower-left corner at (x, y). */
export const square = (x: number, y: number, size = 1): Polygon => ({
  type: 'Polygon',
  coordinates: [[[x, y], [x + size, y], [x + size, y + size], [x, y + size], [x, y]]],
});

export const sourceRecord = (name: string, from: number, to: number, extra: Partial<SourceRecord> = {}): SourceRecord => ({
  name,
  from,
  to,
  area: 1000,
  type: 'POLITY',
  isGrouping: name.startsWith('('),
  seshatIds: [],
  components: [],
  memberOf: [],
  geometry: square(0, 0),
  ...extra,
});

export const identifiedRecord = (name: string, from: number, to: number, entityId = 'e'): IdentifiedRecord => ({
  ...sourceRecord(name, from, to),
  entityId,
  groupIds: [],
});
