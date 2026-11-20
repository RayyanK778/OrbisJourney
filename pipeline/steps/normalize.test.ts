import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { square } from '../test-helpers.ts';
import { normalize, type CliopatriaProps } from './normalize.ts';

const feature = (Name: string, FromYear: number, ToYear: number, extra: Partial<CliopatriaProps> = {}) => ({
  type: 'Feature' as const,
  geometry: square(0, 0),
  properties: { Name, FromYear, ToYear, Area: 1, Type: 'POLITY', Wikipedia: '', Wikidata: '', SeshatID: '', Components: '', MemberOf: '', ...extra },
});

describe('normalize', () => {
  it('reads a source year 0 as 1 BCE, keeping the record adjacent to its successor', () => {
    const { records, yearZeroFixes } = normalize([feature('Roman Empire', -14, 0), feature('Roman Empire', 1, 5)], { min: -2000, max: 2000 });
    assert.deepEqual(records.map(r => [r.from, r.to]), [[-14, -1], [1, 5]]);
    assert.deepEqual(yearZeroFixes, [{ name: 'Roman Empire', field: 'to' }]);
  });

  it('keeps records that overlap the range and drops the rest', () => {
    const { records, outsideRange } = normalize(
      [feature('Old', -3000, -2500), feature('Straddles', -2100, -1900), feature('New', 2010, 2024)],
      { min: -2000, max: 2000 },
    );
    assert.deepEqual(records.map(r => r.name), ['Straddles']);
    assert.equal(outsideRange, 2);
  });

  it('detects groupings and splits list fields with or without spaces', () => {
    const [r] = normalize(
      [feature('(Holy Roman Empire)', 1305, 1313, { Components: 'A;B; C', MemberOf: '(X);(Y)', Wikidata: 'Q1' })],
      { min: -2000, max: 2000 },
    ).records;
    assert.equal(r.isGrouping, true);
    assert.deepEqual(r.components, ['A', 'B', 'C']);
    assert.deepEqual(r.memberOf, ['(X)', '(Y)']);
    assert.equal(r.wikidata, 'Q1');
    assert.equal(r.wikipedia, undefined);
  });
});
