import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { identifiedRecord } from '../test-helpers.ts';
import { applyCorrections, type Correction } from './correct.ts';

const correction = (match: Correction['match'], label: string, id = 'fix'): Correction => ({
  id,
  match,
  change: { label },
  reason: 'Test',
  citations: [{ title: 'Source', url: 'https://example.org' }],
});

const run = (records: ReturnType<typeof identifiedRecord>[], ...corrections: Correction[]) =>
  applyCorrections(records, [{ file: 'test.json', data: { corrections } }]);

const spans = (result: ReturnType<typeof run>) => result.records.map(r => `${r.from}..${r.to} ${r.label}`);

describe('applyCorrections', () => {
  it('relabels a whole record and records the correction', () => {
    const result = run([identifiedRecord('Denmark-Norway', 1864, 1921)], correction({ name: 'Denmark-Norway', from: 1815 }, 'Kingdom of Denmark'));
    assert.deepEqual(spans(result), ['1864..1921 Kingdom of Denmark']);
    assert.deepEqual(result.records[0].correctionIds, ['fix']);
    assert.equal(result.records[0].name, 'Denmark-Norway', 'the source name is kept');
  });

  it('splits a record that the correction only partly covers', () => {
    const result = run([identifiedRecord('Empire of Haiti', 1805, 1830)], correction({ name: 'Empire of Haiti', from: 1807, to: 1819 }, 'Haiti'));
    assert.deepEqual(spans(result), ['1805..1806 Empire of Haiti', '1807..1819 Haiti', '1820..1830 Empire of Haiti']);
    assert.equal(result.applied[0].records, 1);
    assert.equal(result.applied[0].splits, 2);
  });

  it('splits correctly across year 0', () => {
    const result = run([identifiedRecord('Han Dynasty', -14, 5)], correction({ name: 'Han Dynasty', from: 1 }, 'Later Han'));
    assert.deepEqual(spans(result), ['-14..-1 Han Dynasty', '1..5 Later Han']);
  });

  it('applies several corrections to pieces of the same record', () => {
    const result = run(
      [identifiedRecord('First Hellenic Republic', 1822, 1940)],
      correction({ name: 'First Hellenic Republic', from: 1832, to: 1923 }, 'Kingdom of Greece', 'a'),
      correction({ name: 'First Hellenic Republic', from: 1924, to: 1934 }, 'Second Hellenic Republic', 'b'),
      correction({ name: 'First Hellenic Republic', from: 1935 }, 'Kingdom of Greece', 'c'),
    );
    assert.deepEqual(spans(result), [
      '1822..1831 First Hellenic Republic',
      '1832..1923 Kingdom of Greece',
      '1924..1934 Second Hellenic Republic',
      '1935..1940 Kingdom of Greece',
    ]);
  });

  it('reports a correction that matches nothing, so source changes are noticed', () => {
    const result = run([identifiedRecord('Sweden', 1900, 1910)], correction({ name: 'Swedn' }, 'Sweden'));
    assert.deepEqual(result.issues.map(i => i.check), ['correction-unmatched']);
  });

  it('rejects year 0 and corrections without a citation', () => {
    const bad = { ...correction({ name: 'Sweden', from: 0 }, 'X'), citations: [] };
    const result = run([identifiedRecord('Sweden', 1900, 1910)], bad);
    assert.deepEqual(result.issues.map(i => i.check).sort(), ['correction-incomplete', 'correction-year']);
  });
});
