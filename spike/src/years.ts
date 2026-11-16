// Historical years skip 0: 1 BCE (stored as -1) is followed by 1 CE (stored as 1).
// Astronomical numbering has a year 0 (1 BCE = 0), which makes arithmetic simple,
// so conversions go through it.

export const MIN_YEAR = -2000;
export const MAX_YEAR = 2000;

export const toAstronomical = (year: number) => (year < 0 ? year + 1 : year);
export const fromAstronomical = (astro: number) => (astro <= 0 ? astro - 1 : astro);

export const clampYear = (year: number) => Math.min(MAX_YEAR, Math.max(MIN_YEAR, year === 0 ? 1 : year));

export const addYears = (year: number, delta: number) => clampYear(fromAstronomical(toAstronomical(year) + delta));

export const formatYear = (year: number) => (year < 0 ? `${-year} BCE` : `${year} CE`);
