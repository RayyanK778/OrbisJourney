// Step 3: Identify. Gives every record an entity: a stable identity that survives renames.
//
// Curated entities in data/entities/entities.json claim source names, optionally only
// within a span of years (for names that cover unrelated polities, like "Later Zhou").
// Every name left unclaimed gets an entity generated from it, one entity per name.
import type { Entity, EntityKind } from '../../shared/schema.ts';
import { formatOpenRange, formatRange, isYear } from '../../shared/years.ts';
import { error, warning, type Issue } from '../lib/issues.ts';
import { mostCommon, slug, stripParens } from '../lib/text.ts';
import type { SourceRecord } from './normalize.ts';

export interface NameRule {
  name: string;
  /** Only records entirely within these years, inclusive. */
  from?: number;
  to?: number;
}

export interface CuratedEntity {
  id: string;
  displayName: string;
  kind: EntityKind;
  wikidataId?: string;
  wikipediaTitle?: string;
  names: (string | NameRule)[];
  note?: string;
}

export interface CuratedFile {
  entities: CuratedEntity[];
}

export interface IdentifiedRecord extends SourceRecord {
  entityId: string;
  groupIds: string[];
}

export interface IdentifyResult {
  records: IdentifiedRecord[];
  entities: Entity[];
  issues: Issue[];
  /** How many records each curated rule claimed, for the report. */
  curatedClaims: { entityId: string; rule: string; records: number }[];
}

const describeRule = (r: NameRule) =>
  r.from === undefined && r.to === undefined ? r.name : `${r.name} (${formatOpenRange(r.from, r.to)})`;

/** Guesses an entity kind from a name. Generated entities only; curated ones state it. */
export function guessKind(name: string, isGrouping: boolean): EntityKind {
  if (isGrouping) return 'grouping';
  if (/city-states/i.test(name)) return 'city-states';
  if (/\b(empire|caliphate|khaganate|sultanate)\b/i.test(name)) return 'empire';
  if (/\b(civilization|culture)\b/i.test(name)) return 'civilization';
  return 'state';
}

export function identify(source: SourceRecord[], curated: CuratedFile): IdentifyResult {
  const issues: Issue[] = [];
  const entityOf = new Map<SourceRecord, string>();
  const entities: Entity[] = [];
  const usedIds = new Set<string>();
  const curatedClaims: IdentifyResult['curatedClaims'] = [];

  // --- Curated entities ---
  for (const c of curated.entities) {
    if (usedIds.has(c.id)) issues.push(error('entity-duplicate-id', `Curated entity ID "${c.id}" is used twice.`));
    usedIds.add(c.id);
    const claimed: SourceRecord[] = [];
    for (const raw of c.names) {
      const rule: NameRule = typeof raw === 'string' ? { name: raw } : raw;
      for (const y of [rule.from, rule.to])
        if (y !== undefined && !isYear(y))
          issues.push(error('entity-rule-year', `Entity "${c.id}": ${y} is not a valid year (whole number, not 0).`));
      const lo = rule.from ?? -Infinity;
      const hi = rule.to ?? Infinity;
      let count = 0;
      for (const r of source) {
        if (r.name !== rule.name || r.to < lo || r.from > hi) continue;
        if (r.from < lo || r.to > hi) {
          issues.push(error('entity-rule-straddles',
            `Entity "${c.id}": the rule "${describeRule(rule)}" cuts through the record "${r.name}" ${formatRange(r.from, r.to)}. Move the rule's year limits to a record boundary.`));
          continue;
        }
        const previous = entityOf.get(r);
        if (previous) {
          issues.push(error('entity-claimed-twice', `"${r.name}" ${formatRange(r.from, r.to)} is claimed by both "${previous}" and "${c.id}".`));
          continue;
        }
        entityOf.set(r, c.id);
        claimed.push(r);
        count++;
      }
      curatedClaims.push({ entityId: c.id, rule: describeRule(rule), records: count });
      if (count === 0)
        issues.push(error('entity-rule-unmatched',
          `Entity "${c.id}": the rule "${describeRule(rule)}" matches no records. The source may have renamed it.`));
    }
    entities.push({
      id: c.id,
      displayName: c.displayName,
      aliases: [...new Set(claimed.map(r => r.name))],
      kind: c.kind,
      wikidataId: c.wikidataId ?? mostCommon(claimed.map(r => r.wikidata)),
      wikipediaTitle: c.wikipediaTitle ?? mostCommon(claimed.map(r => r.wikipedia)),
      curated: true,
    });
  }

  // --- Generated entities, one per unclaimed name, in order of first appearance ---
  const unclaimed = new Map<string, SourceRecord[]>();
  for (const r of [...source].sort((a, b) => a.from - b.from || a.name.localeCompare(b.name))) {
    if (entityOf.has(r)) continue;
    const list = unclaimed.get(r.name) ?? [];
    list.push(r);
    unclaimed.set(r.name, list);
  }
  for (const [name, records] of unclaimed) {
    // Groupings get a prefix so "(Netherlands)" and "Netherlands" stay distinguishable
    const base = `${records[0].isGrouping ? 'group-' : ''}${slug(stripParens(name)) || 'unnamed'}`;
    let id = base;
    for (let i = 2; usedIds.has(id); i++) id = `${base}-${i}`;
    usedIds.add(id);
    for (const r of records) entityOf.set(r, id);
    entities.push({
      id,
      displayName: stripParens(name),
      aliases: [name],
      kind: guessKind(name, records[0].isGrouping),
      wikidataId: mostCommon(records.map(r => r.wikidata)),
      wikipediaTitle: mostCommon(records.map(r => r.wikipedia)),
      curated: false,
    });
  }

  // --- Groupings: MemberOf names to entity IDs ---
  // A grouping name could belong to different entities in different years, so the
  // lookup picks the grouping record that is active when the member record starts.
  const groupsByName = new Map<string, SourceRecord[]>();
  for (const r of source) if (r.isGrouping) groupsByName.set(r.name, [...(groupsByName.get(r.name) ?? []), r]);
  const dangling = new Map<string, number>();

  const records: IdentifiedRecord[] = source.map(r => {
    const groupIds: string[] = [];
    for (const groupName of r.memberOf) {
      const candidates = groupsByName.get(groupName);
      if (!candidates) {
        dangling.set(groupName, (dangling.get(groupName) ?? 0) + 1);
        continue;
      }
      const match = candidates.find(g => g.from <= r.from && g.to >= r.from) ?? candidates[0];
      const id = entityOf.get(match)!;
      if (!groupIds.includes(id)) groupIds.push(id);
    }
    return { ...r, entityId: entityOf.get(r)!, groupIds };
  });
  for (const [name, n] of dangling)
    issues.push(warning('group-missing', `${n} records list "${name}" under MemberOf, but no grouping record has that name.`, n));

  return { records, entities, issues, curatedClaims };
}
