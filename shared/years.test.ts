import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { addYears, clampYear, formatOpenRange, formatRange, formatYear, fromAstronomical, isYear, nextYear, previousYear, span, toAstronomical } from './years.ts';

describe('year arithmetic skips year 0', () => {
  it('goes from 1 BCE straight to 1 CE and back', () => {
    assert.equal(nextYear(-1), 1);
    assert.equal(previousYear(1), -1);
  });

  it('adds and subtracts across the boundary', () => {
    assert.equal(addYears(-5, 10), 6); // 5 BCE + 10 years = 6 CE
    assert.equal(addYears(6, -10), -5);
    assert.equal(addYears(-1, 2), 2);
    assert.equal(addYears(-100, 100), 1);
    assert.equal(addYears(1914, -1), 1913);
    assert.equal(addYears(-500, -1), -501);
  });

  it('converts to and from astronomical numbering', () => {
    assert.equal(toAstronomical(-1), 0);
    assert.equal(toAstronomical(-2), -1);
    assert.equal(toAstronomical(1), 1);
    for (const y of [-2000, -101, -2, -1, 1, 2, 1999]) assert.equal(fromAstronomical(toAstronomical(y)), y);
  });

  it('counts years inclusively without a year 0', () => {
    assert.equal(span(-1, 1), 2);
    assert.equal(span(-14, 5), 19);
    assert.equal(span(1900, 1900), 1);
  });

  it('rejects 0 and fractions as years', () => {
    assert.equal(isYear(0), false);
    assert.equal(isYear(1.5), false);
    assert.equal(isYear(-1), true);
  });

  it('clamps to the supported range and never returns 0', () => {
    assert.equal(clampYear(0), 1);
    assert.equal(clampYear(-5000), -2000);
    assert.equal(clampYear(3000), 2000);
  });
});

describe('year formatting', () => {
  it('writes BCE and CE', () => {
    assert.equal(formatYear(-323), '323 BCE');
    assert.equal(formatYear(1914), '1914 CE');
    assert.equal(formatRange(1900, 1900), '1900 CE');
    assert.equal(formatRange(-14, 5), '14 BCE – 5 CE');
  });

  it('writes open-ended ranges', () => {
    assert.equal(formatOpenRange(1815), '1815 CE onward');
    assert.equal(formatOpenRange(undefined, -1), 'until 1 BCE');
    assert.equal(formatOpenRange(), 'all years');
  });
});
