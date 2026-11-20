import path from 'node:path';
import type { Confidence } from '../shared/schema.ts';
import { MAX_YEAR, MIN_YEAR } from '../shared/years.ts';

export const ROOT = path.resolve(import.meta.dirname, '..');
export const PATHS = {
  manifest: path.join(ROOT, 'pipeline', 'sources.json'),
  raw: path.join(ROOT, 'data', 'raw'),
  entities: path.join(ROOT, 'data', 'entities', 'entities.json'),
  corrections: path.join(ROOT, 'data', 'corrections'),
  build: path.join(ROOT, 'data', 'build'),
  report: path.join(ROOT, 'docs', 'data-report.md'),
};

export const YEAR_RANGE = { min: MIN_YEAR, max: MAX_YEAR };

/** Years per chunk file. Phase 0 chose 100 (docs/phase-0-results.md). */
export const CHUNK_SIZE = 100;

/** Coordinates are rounded to this many degrees, about 1.1 km at the equator. */
export const PRECISION = 0.01;

/**
 * PROVISIONAL. Cliopatria has no per-record certainty, so confidence starts from the era
 * of the record's first year. Blueprint section 3.3 leaves the exact boundaries to Phase 3.
 */
export const PROVISIONAL_CONFIDENCE: { before: number; level: Confidence }[] = [
  { before: 1000, level: 1 },
  { before: 1816, level: 2 },
  { before: Infinity, level: 3 },
];

export const confidenceFor = (from: number): Confidence =>
  PROVISIONAL_CONFIDENCE.find(rule => from < rule.before)!.level;

/** Thresholds for validation warnings. */
export const CHECKS = {
  /** Flag consecutive records of one entity whose area changes by at least this factor... */
  areaJumpRatio: 2,
  /** ...and by at least this many km², so small polities don't flood the list. */
  areaJumpMinKm2: 100_000,
  /** Flag two filled territories that overlap by at least this many km²... */
  overlapMinKm2: 2_500,
  /** ...or by at least this share of the smaller territory. Either condition is enough. */
  overlapMinShare: 0.1,
  /** Rows of each warning type shown in docs/data-report.md. The full list is in data/build/. */
  reportRows: 30,
};
