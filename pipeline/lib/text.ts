/** "(Personal union of Kingdom of Bohemia with Kingdom of Poland)" -> "personal-union-of-kingdom-of-bohemia-with-kingdom-of-poland" */
export const slug = (name: string): string =>
  name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Gives every name a unique slug. Names whose slugs collide, such as "Han" and "Hán",
 * get numbered suffixes in sorted order: "han", "han-2". `base` builds the plain slug.
 */
export function uniqueSlugs(names: Iterable<string>, base: (name: string) => string = slug): Map<string, string> {
  const result = new Map<string, string>();
  const used = new Set<string>();
  for (const name of [...new Set(names)].sort((a, b) => base(a).localeCompare(base(b)) || (a < b ? -1 : a > b ? 1 : 0))) {
    const b = base(name) || 'unnamed';
    let s = b;
    for (let i = 2; used.has(s); i++) s = `${b}-${i}`;
    used.add(s);
    result.set(name, s);
  }
  return result;
}

/** "(British Empire)" -> "British Empire" */
export const stripParens = (name: string): string => name.replace(/^\((.*)\)$/, '$1');

/** Splits Cliopatria's list fields, which use ";" with or without a following space. */
export const splitList = (value: string | null | undefined): string[] =>
  (value ?? '').split(';').map(s => s.trim()).filter(Boolean);

/** The most frequent value, ties going to the one seen first. Empty strings are ignored. */
export const mostCommon = (values: (string | null | undefined)[]): string | undefined => {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | undefined;
  for (const [v, n] of counts) if (best === undefined || n > counts.get(best)!) best = v;
  return best;
};
