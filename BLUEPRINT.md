# OrbisJourney: Project Blueprint

**Status:** Draft 4. Phases 0 and 1 are complete. Phase 0 results are in [docs/phase-0-results.md](docs/phase-0-results.md), and every data build writes [docs/data-report.md](docs/data-report.md).
**Last updated:** 2026-11-20

## 1. Goal

OrbisJourney is an interactive world history website. Visitors spin a 3D globe, choose any year from 2000 BCE to 2000 CE, and see the civilizations, states and empires of that moment drawn on the map.

### First release

- A 3D globe that can be rotated and zoomed
- A timeline control covering 2000 BCE to 2000 CE
- Borders of major civilizations, states and empires for the selected year
- A click on any territory shows its name, dates, data source and a link to read more

### Not in the first release

Accounts, a backend server, editing tools, and content layers such as cities, battles and trade routes. Section 11 keeps these as later ideas, and the architecture leaves room for them.

A separate layer for non-state cultures and peoples is out of scope (section 10).

## 2. The main challenge: what "accurate" can mean

The hard part of this project is the data, not the globe. Two parts of the original goal can't be met literally, so the project needs a working definition:

- **"Accurate borders":** Most pre-modern states had no surveyed borders. Their power faded across frontiers, overlapped with neighbors, and is often known only from sparse or disputed sources. A crisp line around a Bronze Age kingdom suggests more certainty than anyone has.
- **"All known major civilizations":** No dataset contains all of them, and "major" has no agreed definition.

**Working definition:** the map is accurate when each thing it shows is sourced, its uncertainty is visible, and its errors can be corrected.

| Principle | What it means in practice |
|---|---|
| **Traceable** | Every shape records its source dataset and version. Every manual correction records its reason and a citation. |
| **Honest about certainty** | Uncertain borders look uncertain, with soft edges rather than sharp lines. |
| **Honest about time** | The interface shows the date range a shape applies to, for example "borders as recorded for 1600–1401 BCE". |
| **Honest about blank space** | The map explains that blank areas mean "no polity in our data", not "nobody lived here". |
| **No invented history** | Borders never morph between two dates, because the in-between shapes would be fabricated. Changes use a simple crossfade. |
| **Measurable coverage** | "Major" is defined by a published checklist (section 3.5), so gaps can be counted and closed. |

## 3. Data

"Polity" below means any political entity: a state, empire, kingdom, confederation or similar.

### 3.1 Sources

| Source | Role | Coverage | License | Assessment |
|---|---|---|---|---|
| [Cliopatria](https://github.com/Seshat-Global-History-Databank/cliopatria) | **Primary borders** | 3400 BCE–2024 CE, with a year range on every record | CC BY 4.0 | Peer-reviewed and covers the whole timeline. Weak on early periods and outside Eurasia. |
| [historical-basemaps](https://github.com/aourednik/historical-basemaps) | **Checking only, not shipped** | 47 fixed snapshot years in our range | GPL-3.0 | A useful second opinion on borders and missing entries. Its cultures and peoples aren't used (section 10). |
| [CShapes 2.0](https://www.research-collection.ethz.ch/handle/20.500.11850/487987?show=full) | **Checking only, not shipped** | 1886–2019 | Reported as CC BY-NC or CC BY-NC-SA | Useful for checking modern borders. The non-commercial terms make it a poor fit to ship. |
| Natural Earth | **Globe surface** | Present day | Public domain | Terrain imagery with no modern borders or labels, which would be anachronistic. |

### 3.2 What the Cliopatria data shows

I downloaded v0.2.1 (`cliopatria_polities_only_v021.geojson`) and measured it directly. The file is 172.9 MB and has 13,797 records, of which 13,540 fall inside our date range, under 1,625 distinct names.

**Finding 1: early coverage is very thin.** Only a handful of polities exist in the data before about 750 BCE.

| Year | 2000 BCE | 1500 BCE | 1000 BCE | 500 BCE | 1 CE | 500 | 1000 | 1500 | 1800 | 1914 | 2000 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Active records | 4 | 11 | 12 | 48 | 46 | 62 | 133 | 141 | 130 | 79 | 192 |

Counts include grouping records (Finding 6). The 1914 dip appears to come from colonies being merged into large records such as "British Africa".

**Finding 2: coverage is heavily weighted toward Eurasia.** Records by approximate region, assigned by the center of each shape, so treat these as rough:

| Year | Middle East & N. Africa | Europe | S. Asia | E. Asia | Sub-Saharan Africa | N. & Meso-America | S. America | Oceania |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 2000 BCE | 3 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| 500 BCE | 4 | 9 | 14 | 19 | 0 | 2 | 0 | 0 |
| 1 CE | 8 | 14 | 8 | 9 | 1 | 3 | 0 | 0 |
| 1000 | 12 | 72 | 13 | 9 | 1 | 5 | 1 | 0 |
| 1500 | 16 | 61 | 15 | 7 | 6 | 4 | 1 | 0 |

A name search found no match for Great Zimbabwe, Mutapa, the Kingdom of Benin, Kerma, Norte Chico, Chavín, Moche, Tiwanaku, Wari, Cahokia or the Iroquois. Some may appear under other names, so the checklist audit must confirm this. historical-basemaps does include Norte Chico, Kerma, Chavín and Moche.

**Finding 3: border changes are unevenly spaced.** Early eras change in large steps, which matters for the timeline design.

| Period | 2000–1500 BCE | 1500–1000 BCE | 1000–500 BCE | 500–1 BCE | 1–500 | 500–1000 | 1000–1500 | 1500–2000 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Years with a recorded change | 6 | 8 | 13 | 68 | 76 | 88 | 65 | 171 |

Early dates can also differ from the usual scholarly ones. The data starts the Zhou Dynasty at 1000 BCE (conventionally about 1046 BCE) and the Olmec at 650 BCE (conventionally about 1500 BCE).

**Finding 4: labels contain errors even where sources are plentiful.** The 1914 data includes "Denmark-Norway" (dissolved in 1814), "Empire of Haiti" (a republic by then), "First Hellenic Republic" (Greece was a kingdom in 1914), "Kingdom of Great Britain" (the United Kingdom since 1801), and "United Principalities of Moldavia and Wallachia" (Romania by then). The shapes may be fine even where the labels aren't. A corrections system is therefore a core requirement.

Phase 1 found the errors run longer than 1914: "Kingdom of Great Britain" continues to 2024, and "Denmark-Norway" and "First Hellenic Republic" to 1940. All five are now fixed by corrections, along with the "Later Zhou" records from Finding 5.

**Finding 5: a name doesn't identify one polity.** Three separate problems need a curated identity layer:

- One continuous state can have several names. Sweden appears as "Kingdom of Sweden", "Swedish Empire" and "United Kingdoms of Sweden and Norway".
- One name can cover unrelated states. "Later Zhou" spans 750 BCE to 960 CE with a 1,216-year gap, and the early records appear to be the Eastern Zhou mislabeled.
- The Wikidata ID doesn't fix this, because the "Later Zhou" records share one ID across that same gap.

**Finding 6: some records are groupings, and they overlap their members.** 1,733 records list `Components`, such as "(British Empire)", which contains "British Raj", "British Africa" and others. They also cover alliances and vassalage. The other 12,064 records have no components and are the ones to fill with color. Drawing both would stack colors on top of each other.

**Finding 7: the data is lighter than the file size suggests.**

| Measure | Result |
|---|---|
| Vertices (border points) in a single year, across the 26 years sampled | 331 to about 34,000 |
| Median vertices per record | 102 |
| One file per century, coordinates rounded to 2 decimals, gzipped, no shape simplification | 14.7 MB total |
| Largest century file (1900s) | 3.21 MB |
| Century files before 1400 CE | under 0.5 MB each |

No tile server is needed. The whole site can run as static files. Phase 0 then found that storing each shared border once (TopoJSON) cuts the total to 2.62 MB and the largest century file to 0.37 MB.

**Finding 8: the timeline must skip year 0.** No record starts in year 0, though 6 records end there and 7 start at year 1. The timeline goes from 1 BCE (stored as `-1`) straight to 1 CE (stored as `1`). The Cliopatria paper doesn't say how it numbers years around 0, so the pipeline reads a source year 0 as 1 BCE. That keeps all six records adjacent to their successors, and Phase 1 confirmed nothing drops out at the transition.

**Finding 9: the overlap check finds shapes that are wrong, not just labels.** Phase 1 compares every pair of filled territories that exist at the same time. Most of the 350 overlaps it reports are real history, such as occupations and vassal states. Some are clear source errors:
- The "French Fifth Republic" covers Algeria until 2023.
- A territory labeled "Communist Party of China" stretches across Xinjiang in 1938–1945, an area the Soviet Union's shape also covers in 1940–1942.
- The "Kingdom of Great Britain" shape includes Oman from 1973.

The full list is in the data report, for review in Phase 3.

**Finding 10: borders don't follow coastlines.** The paper explains that the shapes were traced from map images at about 40 km² per pixel and smoothed to 0.07°. They will spill into the sea and leave gaps along coasts on our land layer. Phase 2 should decide whether to clip territories to the land layer when building.

### 3.3 Data model

Source records are transformed into two connected structures:

```ts
// Who: a curated identity that survives renames
interface Entity {
  id: string;              // our own stable ID, e.g. "sweden"
  displayName: string;
  aliases: string[];
  kind: "state" | "empire" | "city-states" | "civilization" | "grouping";
  wikidataId?: string;
  wikipediaTitle?: string;
}

// Where and when: one shape valid for a span of years
interface TerritoryRecord {
  id: string;              // source name and first year, e.g. "kingdom-of-sweden:1905"
  entityId: string;
  from: number;            // inclusive; BCE is negative; year 0 doesn't exist
  to: number;              // inclusive
  label: string;           // the name for this period, e.g. "Swedish Empire"
  sourceName: string;      // the name in the source, before corrections
  groupIds: string[];      // groupings it belongs to, e.g. ["group-british-empire"]
  confidence: 1 | 2 | 3;   // 1 approximate, 2 moderate, 3 legally defined
  source: string;          // e.g. "cliopatria@0.2.1"
  correctionIds: string[]; // any corrections applied to this record
  geometry: Polygon | MultiPolygon;
}
```

A record can belong to several groupings at once. The Kingdom of Bohemia in 1305, for example, is in both the Holy Roman Empire and a personal union with Poland.

The files the app loads carry these fields with one-letter keys to save space. [shared/schema.ts](shared/schema.ts) defines that format, and both the pipeline and the app import it.

Initial confidence comes from the era, since Cliopatria has no per-record score. historical-basemaps labels all the sampled features from 2000 BCE to 1000 CE as approximate and those from 1914 and 2000 as legally defined, which supports this approach. Phase 1 uses provisional boundaries: approximate before 1000 CE, moderate from 1000 to 1815, and legally defined from 1816. Phase 3 will set the real ones.

### 3.4 Data pipeline

The pipeline is a set of TypeScript files that Node runs directly, with one file per step in [pipeline/steps/](pipeline/steps/). `npm run data:build` runs every step. [mapshaper](https://github.com/mbloch/mapshaper) handles geometry.

```text
1. Fetch      Download a pinned source version and verify its checksum
2. Normalize  Convert to the shared data model; read source year 0 as 1 BCE
3. Identify   Map source names to entity IDs: curated entities first, then
              one generated entity for each remaining name
4. Correct    Apply corrections from data/corrections/, splitting records
              where a correction covers only some of their years
5. Validate   Errors stop the build: bad geometry or dates, duplicate IDs,
              and corrections or entity rules that match nothing.
              Warnings go to the report: overlapping territories, sudden
              area jumps, one entity filled twice at once
6. Encode     Round coordinates, place label points, and store shared
              borders once (TopoJSON). No simplification: the source is
              already coarse (Phase 0)
7. Chunk      Write per-century files, an index of years with border
              changes, and the entity and correction lists
8. Report     Write docs/data-report.md, which is committed so its diffs
              show how each build changed the data
```

- **Corrections never edit source data.** They are small reviewable files applied at build time, in the form `{ id, match, change, reason, citations }`. This also meets the CC BY requirement to indicate changes. [data/README.md](data/README.md) explains how to add one.
- **Upstream updates are safe to adopt.** A new source version is a re-run of the pipeline. Any correction or entity rule that no longer matches fails the build with an explanation.
- **Builds are reproducible.** Starting from nothing, `npm run data:build` produces byte-identical output, and an unchanged build rewrites an identical report. The first run takes about 3 minutes, mostly the overlap check. That check's results are cached by shape fingerprint, so later builds take about 15 seconds.
- **Raw data stays out of git.** The 173 MB source file is over GitHub's 100 MB per-file limit, so the fetch script downloads it instead.

Current pins, by commit or tag so they can't change underneath us:

- **Cliopatria v0.2.1:** commit `5f43337`, SHA-256 `e10a4e42…`
- **Natural Earth land 1:50m v5.1.2:** SHA-256 `e874b27a…`

### 3.5 Measuring coverage: the checklist

`data/canon/canon.csv` will define "major" as an explicit list. It would start at about 150 entries, each with expected dates, reference sources and a status of matched, partial, or missing.

- **Inclusion test:** The entity has substantial treatment in at least two standard world history references, and it was a dominant power in its region or period.
- **Scope:** Civilizations, states and empires only. Non-state cultures and peoples are excluded. Borderline cases such as Norte Chico, which some scholars call a civilization, stay out unless added deliberately during checklist review.
- **Regional minimums:** Every inhabited region gets a guaranteed share of entries, so the list doesn't repeat the Eurasian bias in the data.
- **Filling gaps, in order of preference:**
  1. An existing source
  2. A new shape traced from a cited, properly licensed atlas or paper, marked as approximate
  3. A marker with a note and no border, when no defensible shape exists

### 3.6 Known limitations to disclose

- **Present-day geography:** Coastlines, rivers and lakes are modern, though some have changed considerably, including the head of the Persian Gulf.
- **One version of events:** Cliopatria's authors say that its maps "reflect only one version" of past territories.
- **How the borders were made:** One author hand-drew the borders onto 508 map images in 2014, working from cited regional atlases and histories. The shapes were then traced from those images by software, at about 40 km² per pixel, and smoothed to 0.07°. The result doesn't follow coastlines (Finding 10).
- **Uncertainty isn't recorded:** The source has no measure of how certain a border is. Its authors note that uncertainty grows further back in time, and that the apparent stability of ancient borders, such as Egypt's across centuries, may reflect missing records rather than a stable state.
- **What's left out by design:** A polity is included only if written sources attest to it, so pre-literate states are missing, such as the Xia dynasty before 1600 BCE. Apart from rare exceptions, a polity must also cover at least 5,000 km² and last at least 50 years.
- **Year 0 is ambiguous:** The source doesn't say how it numbers years around 0. The pipeline's reading (Finding 8) could be off by one year at that boundary, which is far below the data's real precision.
- **Contested subjects:** Modern disputes such as Taiwan, Kashmir, Crimea, Palestine and Western Sahara need a consistent policy: follow the cited source and add a neutral note where territory is disputed. Sensitive names and colonial terms get the same treatment.

Sources: the [Cliopatria paper](https://doi.org/10.1038/s41597-025-04516-9), read in full during Phase 1, and the [repository README](https://github.com/Seshat-Global-History-Databank/cliopatria).

## 4. Technical architecture

### 4.1 Globe engine

**Decision: [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/examples/display-a-globe-with-a-vector-map/) with its globe projection.** Version 6.16 passed the Phase 0 test.

| Option | Strengths | Weaknesses | Verdict |
|---|---|---|---|
| **MapLibre GL JS** | Built for styled polygons, year filters and non-overlapping labels. Open source, no API key. | Less photorealistic. Not yet tested with our data. | **Use (confirmed in Phase 0)** |
| **CesiumJS** | True 3D Earth, the strongest realism and terrain. | Heavier, and designed for streaming 3D data rather than thousands of restyled polygons. | **Fallback** |
| **globe.gl / three.js** | Maximum visual freedom. | We'd have to build labels, picking and large-polygon handling ourselves. | Not recommended |

I found no published benchmark for this exact use, so Phase 0 tests the choice before we commit. MapLibre is also a good match for the data, which is suited to world and continent scales rather than street-level zoom.

### 4.2 Application stack

- **Interface:** React, TypeScript and Vite
- **Hosting:** Any static host, with no backend, database or map API costs
- **Shareable views:** The URL stores the year and camera position, for example `?year=-323&lat=33&lon=44&zoom=3`

### 4.3 How a year change works

```text
Timeline ──> Year state ──> Is the century's file loaded?
                                 │             │
                                 no           yes
                                 │             │
                       fetch + cache file      │
                                 └──────┬──────┘
                                        v
                       Filter records: from <= year <= to
                                        │
                                        v
                       Update globe layers, labels and URL
```

Neighboring centuries load in the background so that scrubbing stays smooth. Phase 0 settled the details:

- **Files:** TopoJSON, one per 100 years.
- **Updates:** only the territories active in the chosen year are sent to the map ("setData"). It was the only method tested without long freezes. Filtering a whole century froze for over a second at century boundaries, and a ±25-year window froze for up to 1.3 s on each reload.
- **Fast input:** while one year renders, only the latest requested year waits.

### 4.4 Project structure

```text
OrbisJourney/
├─ BLUEPRINT.md
├─ spike/               # Phase 0 test page and benchmark (reference only)
├─ app/                 # Website
│  └─ src/
│     ├─ globe/         # Map setup, layers, styling
│     ├─ timeline/      # Slider, stepper, playback
│     ├─ panels/        # Territory details, legend, credits
│     └─ data/          # Chunk loading and caching
├─ pipeline/            # Data build (section 3.4)
│  └─ steps/            # One file per step, with tests alongside
├─ shared/              # Used by pipeline and app: year handling, data file format
├─ data/
│  ├─ raw/              # Downloaded sources (not in git)
│  ├─ build/            # Site data written by the pipeline (not in git)
│  ├─ cache/            # Saved overlap-check results (not in git)
│  ├─ corrections/      # Reviewable fixes
│  ├─ entities/         # Curated identity mappings
│  └─ canon/            # Coverage checklist (Phase 3)
└─ docs/                # Methodology, phase results, generated data report
```

## 5. Feature specifications

### 5.1 Globe

- **Movement:** Drag to rotate, scroll or pinch to zoom, with zoom limited to the scale the data supports.
- **Appearance:** Natural-color terrain, a soft atmosphere and a dark space background, with no modern labels.
- **Interaction:** Hovering highlights a territory and clicking selects it, including when the globe is rotating.

### 5.2 Timeline

A linear 4,000-year slider gives only about 3 years per pixel at typical widths, so dragging alone can't select an exact year. The control therefore combines:

- **A slider** for fast movement, with a faint strip marking years when borders change
- **Exact entry:** A year box with a BCE/CE toggle, plus buttons for ±1, ±10 and ±100 years
- **Jump buttons** for the previous and next recorded border change
- **Playback** at several speeds
- **Keyboard control:** Full support, including screen reader announcements of the year

### 5.3 Borders

- **Fill:** Color comes from records without `Components`. Colors stay stable over time, and members of a grouping share a color family.
- **Groupings:** Empires, alliances and vassal relationships appear as an outline on hover or selection, rather than as a second fill.
- **Certainty:** Lower confidence means softer edges and lighter fills.
- **Labels:** Size follows territory area, collisions are handled automatically, and a territory keeps its period-correct name.
- **Year changes:** Quick crossfade only, with no shape interpolation.

### 5.4 Territory panel

Shows the period-correct name and other names, the entity's overall dates, the date range for the current shape, its parent grouping, the confidence level with a plain-language explanation, the source and any corrections, and a Wikipedia link.

### 5.5 Credits and methodology page

Required by the licenses and central to the site's credibility. It covers source attribution, how accuracy is defined, known limitations, the coverage report, and how to report an error.

## 6. Performance targets

Phase 0 tested these on a fast desktop, where all of them passed, apart from rare worst-case year changes in the 1900s. They still need testing on a typical laptop and a real phone ([results](docs/phase-0-results.md)).

| Measure | Target |
|---|---|
| Globe rotation | 60 fps on a typical laptop, 30+ on a mid-range phone |
| Year change, data already loaded | Under 100 ms |
| Year change, new century file | Under 500 ms on broadband |
| First view on broadband | Under 3 seconds |
| Largest century file | Under 1.5 MB gzipped |

## 7. Quality checks

- **Automated, on every data build:** Valid geometry, valid date ranges, no duplicate records for the same name and year, unexpected overlaps between filled territories, sudden area jumps, and every record mapped to an entity. All of these run from Phase 1. The geometry check covers structure and coordinate ranges, but not self-intersecting shapes yet.
- **Unit tests (`npm test`):** Year arithmetic across the BCE/CE boundary, splitting records for corrections, entity rules, and chunk and change-year calculations.
- **Benchmark-year review:** Compare 12 years with reference atlases and log the differences: 1500 BCE, 500 BCE, 323 BCE, 117 CE, 750, 1279, 1492, 1648, 1815, 1914, 1945 and 2000.
- **Cross-checks:** CShapes for 1886 onward, and historical-basemaps at matching years to surface disagreements for review.
- **Interface tests:** Year logic, especially the BCE/CE transition, and end-to-end tests of the timeline and territory selection.

## 8. Risks

| Risk | Likelihood | Impact | Response |
|---|---|---|---|
| The early globe looks empty and disappoints visitors | Certain without action | High | Clear messaging, curated gap-filling from the checklist, and a design that makes sparse periods look intentional |
| Curating identities and corrections takes longer than building the app | High | High | Prioritize by checklist and benchmark years, and ship with a visible status |
| Visible historical errors damage credibility | High | Medium | Show sources and uncertainty, and offer easy error reporting |
| Filling in gaps introduces our own bias or errors | Medium | High | Require citations and label hand-drawn shapes |
| Slow scrubbing on the globe | Medium | High | Phase 0 test, with Cesium or smaller chunks as fallbacks |
| License conflict from mixing data sources | Low | High | Ship only CC BY and public domain data for now, and check the license of any new source before use |
| A source changes or disappears | Low | Medium | Pinned versions and archived copies |

## 9. Roadmap

Each phase ends with a concrete test of whether it's done.

### Phase 0: Prove the approach
Create the GitHub repository (private at first, public since 2026-11-18), then render real Cliopatria data on a MapLibre globe, including the heaviest period (the 1900s), and scrub through the years.
**Done when:** Section 6 targets are met or a fallback is chosen, and the chunk size and update method are decided.
**Status: complete (2026-11-15).** MapLibre is confirmed, with TopoJSON in 100-year files updated by setData. Testing on a real phone and a typical laptop carries over into Phase 2.

### Phase 1: Data foundation
Build the pipeline, read the Cliopatria paper's limitations, generate initial entity mappings, and set up the corrections system and validation report.
**Done when:** One command reproduces all site data from the pinned sources, and known label errors from Finding 4 are fixed through corrections.
**Status: complete (2026-11-20).** `npm run data:build` rebuilt byte-identical output from an empty folder, and 12 corrections fix the Finding 4 labels and the Eastern Zhou. 8 curated entities cover those polities and Sweden, and the other 1,606 source names have generated entities.

Carried forward:
- **To Phase 2:** decide whether to clip territories to the coastline (Finding 10), and skip redraws in years with no border change, using the change-year list the pipeline now writes.
- **To Phase 3:** review the 823 validation warnings and the 165 shared Wikidata IDs in the data report.

### Phase 2: Working first version
Build the globe, timeline, border rendering, territory panel and credits page, and enable shareable URLs.
**Done when:** A visitor can reach any year from 2000 BCE to 2000 CE, click a territory, and see its source.

### Phase 3: Accuracy and coverage
Build the checklist, review benchmark years, close the highest-priority gaps, and set confidence levels.
**Done when:** The coverage report is published, every checklist entry has a status, and every benchmark year has been reviewed.

### Phase 4: Polish and launch
Add playback, search, a legend, mobile layout, accessibility, the error-report path, and deployment.
**Done when:** Section 6 targets and accessibility checks pass on desktop and mobile, and the site is live.

### Phase 5 onward
Features from section 11, chosen one at a time.

## 10. Decisions made

| # | Question | Decision | What follows from it |
|---|---|---|---|
| 1 | Show non-state cultures and peoples, such as the Bantu, Jōmon and Norte Chico, as a separate layer? | **No.** | The globe shows civilizations, states and empires only. Early periods stay sparse, so messaging and the checklist carry more weight. |
| 2 | Could this project ever be commercial, and is publishing data under GPL-3.0 acceptable? | **A passion project for now. Commercial use isn't ruled out, and GPL-3.0 is acceptable if it's ever needed.** | With no cultures layer, nothing GPL needs to ship. Non-commercial sources such as CShapes stay check-only, and licensing gets reviewed before any commercial launch. |
| 3 | Who is the main audience? | **Curious general public and students,** desktop first, with solid mobile support. | Shapes the tone, explanations and interface. |
| 4 | Where does the project live? | **Local and off OneDrive,** at `C:\Users\Rayyan\Desktop\OrbisJourney`. | This isn't the Desktop shown on screen, because Windows points that one at OneDrive. Files here have no OneDrive backup, so GitHub becomes the backup from Phase 0. |
| 5 | When should this go on GitHub, and public or private? | **Created as a private repository when Phase 0 started, then made public on 2026-11-18.** | Provides history and backup from the first line of code. Everything committed is visible to anyone, so licensing and attribution have to be right in the repository itself, not only on the finished site. |

## 11. Future feature ideas

The data model already keeps sources and identities separate, so these can be added as new layers:

- **Places and events:** Cities, battles, treaties, and events tied to the current year
- **Connections:** Trade routes, migrations, and the spread of religions and technologies
- **People and culture:** Rulers, notable figures, languages and artifacts
- **Exploration:** Follow one empire's rise and fall, compare two years side by side, or search by name
- **Learning:** Guided tours, quizzes and classroom modes
- **Community:** Reviewed corrections submitted by visitors and historians

## 12. References

- [Cliopatria repository](https://github.com/Seshat-Global-History-Databank/cliopatria) and [Zenodo archive](https://zenodo.org/records/13363121)
- [Cliopatria paper, *Scientific Data* (2025)](https://doi.org/10.1038/s41597-025-04516-9), open access, read in full in Phase 1
- [historical-basemaps](https://github.com/aourednik/historical-basemaps)
- [CShapes 2.0 at ETH Zurich](https://www.research-collection.ethz.ch/handle/20.500.11850/487987?show=full) and [BTAA catalog record](https://geo.btaa.org/catalog/b23a624e-f1ab-4989-8c94-f99f6e6fa414)
- [MapLibre globe example](https://maplibre.org/maplibre-gl-js/docs/examples/display-a-globe-with-a-vector-map/)
- [Web map library benchmark (2026 preprint, city-scale 3D data)](https://arxiv.org/abs/2602.23660)
