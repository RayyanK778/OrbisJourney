import { nextYear } from '../../shared/years.ts';

/**
 * Every year in (min, max] in which the set of active records differs from the year
 * before: a record starts that year, or one ended the year before. Sorted ascending.
 */
export function changeYears(records: { from: number; to: number }[], min: number, max: number): number[] {
  const years = new Set<number>();
  for (const r of records) {
    years.add(r.from);
    years.add(nextYear(r.to));
  }
  return [...years].filter(y => y > min && y <= max).sort((a, b) => a - b);
}

/** First year of the chunk holding `year`, e.g. 1914 -> 1900, -323 -> -400, -1 -> -100, 1 -> 0. */
export const chunkStart = (year: number, size: number): number => Math.floor(year / size) * size;
