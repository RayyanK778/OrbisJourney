// Step 4: Correct. Applies the reviewable fixes in data/corrections/ without editing the
// source data. A correction matches records by their source name, optionally within a
// span of years. Where that span covers only part of a record, the record is split, and
// both parts keep the same shape. Corrections apply in order: files by name, then
// entries in each file.
import { formatOpenRange, isYear, nextYear, previousYear } from '../../shared/years.ts';
import { error, type Issue } from '../lib/issues.ts';
import type { IdentifiedRecord } from './identify.ts';

export interface Correction {
  id: string;
  match: { name: string; from?: number; to?: number };
  change: { label: string };
  reason: string;
  citations: { title: string; url: string }[];
}

export interface CorrectionFile {
  corrections: Correction[];
}

export interface CorrectedRecord extends IdentifiedRecord {
  label: string;
  correctionIds: string[];
}

export interface CorrectionResult {
  records: CorrectedRecord[];
  issues: Issue[];
  /** What each correction did, for the report. */
  applied: { correction: Correction; file: string; records: number; splits: number }[];
}

export function applyCorrections(
  input: IdentifiedRecord[],
  files: { file: string; data: CorrectionFile }[],
): CorrectionResult {
  let records: CorrectedRecord[] = input.map(r => ({ ...r, label: r.name, correctionIds: [] }));
  const issues: Issue[] = [];
  const applied: CorrectionResult['applied'] = [];
  const seen = new Set<string>();

  for (const { file, data } of files) {
    for (const c of data.corrections) {
      if (seen.has(c.id)) issues.push(error('correction-duplicate-id', `Correction ID "${c.id}" is used twice (${file}).`));
      seen.add(c.id);
      if (!c.reason?.trim() || !c.citations?.length)
        issues.push(error('correction-incomplete', `Correction "${c.id}" needs a reason and at least one citation (${file}).`));
      for (const y of [c.match.from, c.match.to])
        if (y !== undefined && !isYear(y))
          issues.push(error('correction-year', `Correction "${c.id}": ${y} is not a valid year (whole number, not 0).`));

      const lo = c.match.from ?? -Infinity;
      const hi = c.match.to ?? Infinity;
      let matched = 0;
      let splits = 0;
      const next: CorrectedRecord[] = [];
      for (const r of records) {
        if (r.name !== c.match.name || r.to < lo || r.from > hi) {
          next.push(r);
          continue;
        }
        matched++;
        // The parts of the record before and after the correction's span stay unchanged
        if (r.from < lo) {
          next.push({ ...r, to: previousYear(lo) });
          splits++;
        }
        next.push({
          ...r,
          from: Math.max(r.from, lo),
          to: Math.min(r.to, hi),
          label: c.change.label,
          correctionIds: [...r.correctionIds, c.id],
        });
        if (r.to > hi) {
          next.push({ ...r, from: nextYear(hi) });
          splits++;
        }
      }
      records = next;
      applied.push({ correction: c, file, records: matched, splits });
      if (matched === 0)
        issues.push(error('correction-unmatched',
          `Correction "${c.id}" (${file}) matches no records named "${c.match.name}" (${formatOpenRange(c.match.from, c.match.to)}). The source may have changed.`));
    }
  }
  return { records, issues, applied };
}
