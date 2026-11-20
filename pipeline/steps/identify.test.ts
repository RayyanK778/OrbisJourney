import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sourceRecord } from '../test-helpers.ts';
import { identify } from './identify.ts';

const entityIds = (result: ReturnType<typeof identify>) => result.records.map(r => `${r.name}@${r.from}=${r.entityId}`);

describe('identify', () => {
  it('joins several source names into one curated entity', () => {
    const result = identify(
      [sourceRecord('Kingdom of Sweden', 1526, 1611), sourceRecord('Swedish Empire', 1612, 1814), sourceRecord('Norway', 1000, 1100)],
      { entities: [{ id: 'sweden', displayName: 'Sweden', kind: 'state', names: ['Kingdom of Sweden', 'Swedish Empire'] }] },
    );
    assert.deepEqual(entityIds(result), ['Kingdom of Sweden@1526=sweden', 'Swedish Empire@1612=sweden', 'Norway@1000=norway']);
    assert.deepEqual(result.entities.find(e => e.id === 'sweden')?.aliases, ['Kingdom of Sweden', 'Swedish Empire']);
    assert.equal(result.issues.length, 0);
  });

  it('splits one name between entities by year', () => {
    const result = identify(
      [sourceRecord('Later Zhou', -750, -257), sourceRecord('Later Zhou', 960, 960)],
      {
        entities: [
          { id: 'zhou', displayName: 'Zhou', kind: 'state', names: [{ name: 'Later Zhou', to: -1 }] },
          { id: 'later-zhou', displayName: 'Later Zhou', kind: 'state', names: [{ name: 'Later Zhou', from: 1 }] },
        ],
      },
    );
    assert.deepEqual(entityIds(result), ['Later Zhou@-750=zhou', 'Later Zhou@960=later-zhou']);
  });

  it('reports a rule that cuts through a record, or matches nothing', () => {
    const result = identify(
      [sourceRecord('Han Dynasty', -206, 5)],
      { entities: [{ id: 'han', displayName: 'Han', kind: 'state', names: [{ name: 'Han Dynasty', to: -1 }, 'Gone'] }] },
    );
    assert.deepEqual(result.issues.map(i => i.check).sort(), ['entity-rule-straddles', 'entity-rule-unmatched', 'entity-rule-unmatched']);
  });

  it('keeps generated IDs unique and marks groupings', () => {
    const result = identify(
      [sourceRecord('Han', -206, 5), sourceRecord('Hán', -204, -203), sourceRecord('(Netherlands)', 1900, 1910), sourceRecord('Netherlands', 1900, 1910)],
      { entities: [] },
    );
    const ids = Object.fromEntries(result.entities.map(e => [e.aliases[0], e.id]));
    assert.deepEqual(ids, { Han: 'han', 'Hán': 'han-2', '(Netherlands)': 'group-netherlands', Netherlands: 'netherlands' });
    assert.equal(result.entities.find(e => e.id === 'group-netherlands')?.kind, 'grouping');
  });

  it('links members to the grouping active when they start', () => {
    const result = identify(
      [sourceRecord('(British Empire)', 1900, 1910), sourceRecord('British Raj', 1905, 1910, { memberOf: ['(British Empire)', '(Missing)'] })],
      { entities: [] },
    );
    assert.deepEqual(result.records.find(r => r.name === 'British Raj')?.groupIds, ['group-british-empire']);
    assert.deepEqual(result.issues.map(i => i.check), ['group-missing']);
  });
});
