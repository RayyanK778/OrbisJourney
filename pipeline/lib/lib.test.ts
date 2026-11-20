import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { square } from '../test-helpers.ts';
import { areaKm2 } from './geo.ts';
import { slug, splitList, uniqueSlugs } from './text.ts';
import { changeYears, chunkStart } from './timeline.ts';

describe('changeYears', () => {
  it('lists the years in which the active set changes, never year 0', () => {
    const records = [
      { from: -14, to: -1 }, // starts in 14 BCE, ends in 1 BCE: changes in 14 BCE and 1 CE
      { from: 1, to: 5 }, // ends in 5 CE: change in 6 CE
      { from: -2000, to: 2000 }, // present throughout: no change
    ];
    assert.deepEqual(changeYears(records, -2000, 2000), [-14, 1, 6]);
  });
});

describe('chunkStart', () => {
  it('puts BCE years in the right chunk', () => {
    assert.equal(chunkStart(1914, 100), 1900);
    assert.equal(chunkStart(-323, 100), -400);
    assert.equal(chunkStart(-1, 100), -100);
    assert.equal(chunkStart(-100, 100), -100);
    assert.equal(chunkStart(-101, 100), -200);
    assert.equal(chunkStart(1, 100), 0);
  });
});

describe('text helpers', () => {
  it('slugs names', () => {
    assert.equal(slug('(Personal union of Kingdom of Bohemia with Kingdom of Poland)'), 'personal-union-of-kingdom-of-bohemia-with-kingdom-of-poland');
    assert.equal(slug("Kingdom of Hawaï'i"), 'kingdom-of-hawai-i');
  });

  it('gives colliding names distinct slugs', () => {
    assert.deepEqual([...uniqueSlugs(['Hán', 'Han', 'Han'])], [['Han', 'han'], ['Hán', 'han-2']]);
  });

  it('splits list fields', () => {
    assert.deepEqual(splitList('(A);(B); (C)'), ['(A)', '(B)', '(C)']);
    assert.deepEqual(splitList(''), []);
  });
});

describe('areaKm2', () => {
  it('measures a 1° square at the equator as about 12,364 km²', () => {
    assert.ok(Math.abs(areaKm2(square(0, 0)) - 12_364) < 15);
  });
});
