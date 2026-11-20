// Years are stored as historical years: negative for BCE, positive for CE, and no year 0.
// 1 BCE is stored as -1 and is followed directly by 1 CE, stored as 1.
//
// Astronomical numbering has a year 0 (1 BCE = 0, 2 BCE = -1), which makes arithmetic
// simple, so every calculation converts to it and back.

export const MIN_YEAR = -2000;
export const MAX_YEAR = 2000;

export const isYear = (year: number): boolean => Number.isInteger(year) && year !== 0;

export const toAstronomical = (year: number): number => (year < 0 ? year + 1 : year);
export const fromAstronomical = (astro: number): number => (astro <= 0 ? astro - 1 : astro);

/** Moves `delta` years forward (or back, if negative), skipping the year 0 that doesn't exist. */
export const addYears = (year: number, delta: number): number => fromAstronomical(toAstronomical(year) + delta);

/** The year before or after `year`. The year before 1 CE is 1 BCE. */
export const previousYear = (year: number): number => addYears(year, -1);
export const nextYear = (year: number): number => addYears(year, 1);

/** Number of years from `from` to `to`, both inclusive. */
export const span = (from: number, to: number): number => toAstronomical(to) - toAstronomical(from) + 1;

export const clampYear = (year: number): number =>
  Math.min(MAX_YEAR, Math.max(MIN_YEAR, year === 0 ? 1 : year));

export const formatYear = (year: number): string => (year < 0 ? `${-year} BCE` : `${year} CE`);

export const formatRange = (from: number, to: number): string =>
  from === to ? formatYear(from) : `${formatYear(from)} – ${formatYear(to)}`;

/** Like formatRange, but either end may be open: "1815 CE onward", "until 257 BCE". */
export const formatOpenRange = (from?: number, to?: number): string => {
  if (from === undefined && to === undefined) return 'all years';
  if (from === undefined) return `until ${formatYear(to!)}`;
  if (to === undefined) return `${formatYear(from)} onward`;
  return formatRange(from, to);
};
