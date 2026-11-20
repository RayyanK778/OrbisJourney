# Data

The site's data is built from pinned source files by `npm run data:build`. Nothing here edits the source data. The fixes and identities in this folder are applied on top of it at build time, so they stay reviewable and survive source updates.

| Folder | In git | What it holds |
|---|---|---|
| `corrections/` | Yes | Fixes to the source, one file per polity or topic |
| `entities/` | Yes | Curated identities that join several source names |
| `raw/` | No | Downloaded sources, checked against their pinned checksums |
| `build/` | No | Site data written by the build |
| `cache/` | No | Saved overlap-check results, which make rebuilds take seconds instead of minutes |

After any change, run `npm run data:build` and read [docs/data-report.md](../docs/data-report.md). The build fails, and the report says why, if a correction or entity rule no longer matches the source.

## Adding a correction

Add an entry to the relevant file in `corrections/`, or create a new file:

```json
{
  "corrections": [
    {
      "id": "denmark-norway-ended-1814",
      "match": { "name": "Denmark-Norway", "from": 1815 },
      "change": { "label": "Kingdom of Denmark" },
      "reason": "Why the source is wrong, in a sentence or two.",
      "citations": [{ "title": "Treaty of Kiel", "url": "https://en.wikipedia.org/wiki/Treaty_of_Kiel" }]
    }
  ]
}
```

- **`id`:** permanent and unique. The site shows it next to corrected territories.
- **`match.name`:** the name exactly as it appears in the source, before any corrections.
- **`match.from` and `match.to`:** optional, both inclusive. Leave either out for an open end. Where the span covers only part of a record, the record is split, and both parts keep the same shape.
- **`change.label`:** the corrected name. Labels are the only thing corrections can change so far.
- **`reason` and `citations`:** required. They meet the CC BY requirement to indicate changes, and they let anyone check the fix.

Years are negative for BCE and there is no year 0, so 1 BCE is `-1`. A new name applies from the year the change happened.

## Adding a curated entity

An entity is one polity's identity across renames. By default every source name becomes its own entity. To join several names, add an entry to `entities/entities.json`:

```json
{
  "id": "sweden",
  "displayName": "Sweden",
  "kind": "state",
  "wikidataId": "Q34",
  "wikipediaTitle": "Sweden",
  "names": ["Kingdom of Sweden", "Swedish Empire", { "name": "Later Zhou", "to": -1 }]
}
```

- **`id`:** permanent, lowercase, with hyphens. Links and colors depend on it.
- **`kind`:** `state`, `empire`, `city-states`, `civilization` or `grouping`.
- **`names`:** the source names that belong to this entity. Use the `{ "name", "from", "to" }` form when one name covers unrelated polities in different years. The year limits must fall between records, not inside one.

The report's review queue lists names that share a Wikidata ID, which is a good place to find candidates. Don't merge on the Wikidata ID alone, because some of the source's links are wrong.
