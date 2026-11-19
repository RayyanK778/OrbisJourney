# OrbisJourney: Project Blueprint

**Status:** Draft 3. Phase 0 is complete, with results in [docs/phase-0-results.md](docs/phase-0-results.md).
**Last updated:** 2026-11-15

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

**Finding 8: the timeline must skip year 0.** No record starts in year 0, though 6 records end there and 7 start at year 1. The timeline goes from 1 BCE (stored as `-1`) straight to 1 CE (stored as `1`), which still selects the right records on both sides. The pipeline's checks should confirm nothing drops out at that transition.

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
  entityId: string;
  from: number;            // inclusive; BCE is negative; year 0 doesn't exist
  to: number;              // inclusive
  label: string;           // the name for this period, e.g. "Swedish Empire"
  groupId?: string;        // parent grouping, e.g. "british-empire"
  confidence: 1 | 2 | 3;   // 1 approximate, 2 moderate, 3 legally defined
  source: string;          // e.g. "cliopatria@0.2.1"
  correctionIds: string[]; // any corrections applied to this record
  geometry: MultiPolygon;
}
```

Initial confidence comes from the era, since Cliopatria has no per-record score. historical-basemaps labels all the sampled features from 2000 BCE to 1000 CE as approximate and those from 1914 and 2000 as legally defined, which supports this approach. The exact year boundaries between levels will be set in Phase 3.

### 3.4 Data pipeline

The pipeline is a repeatable set of Node.js scripts. Node is already installed, and Python isn't. [mapshaper](https://github.com/mbloch/mapshaper) handles geometry.

```text
1. Fetch      Download a pinned source version and verify its checksum
2. Normalize  Convert to the shared data model
3. Identify   Map source names to Entity IDs (generated, then curated)
4. Correct    Apply corrections from data/corrections/
5. Validate   Check geometry, dates and overlaps; flag sudden area jumps
6. Encode     Round coordinates and store shared borders once (TopoJSON).
              No simplification: the source is already coarse (Phase 0).
7. Chunk      Write per-century files and an index
8. Report     Publish coverage against the checklist, and a change log
```

- **Corrections never edit source data.** They are small reviewable files applied at build time, such as `{ match, change, reason, citation }`. This also meets the CC BY requirement to indicate changes.
- **Upstream updates are safe to adopt.** A new source version is a re-run of the pipeline, and any correction that no longer matches is reported.
- **Raw data stays out of git.** The 173 MB source file is over GitHub's 100 MB per-file limit, so the fetch script downloads it instead.

Current pin: Cliopatria zip, SHA-256 `e10a4e429fca708788ff9e7572a95fce801fae55852d217cffabc1c59cd4eed4`, downloaded 2026-11-06.

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
- **Contested subjects:** Modern disputes such as Taiwan, Kashmir, Crimea, Palestine and Western Sahara need a consistent policy: follow the cited source and add a neutral note where territory is disputed. Sensitive names and colonial terms get the same treatment.
- **An unfinished check:** I couldn't open the limitations section of the Cliopatria paper because the sites blocked automated access. Reading it is a Phase 1 task, and it may change parts of this section.

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
├─ pipeline/            # Data build scripts (section 3.4)
├─ data/
│  ├─ raw/              # Downloaded sources (not in git)
│  ├─ corrections/      # Reviewable fixes
│  ├─ entities/         # Curated identity mappings
│  └─ canon/            # Coverage checklist
└─ docs/                # Methodology and sources
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

- **Automated, on every data build:** Valid geometry, valid date ranges, no duplicate records for the same name and year, unexpected overlaps between filled territories, sudden area jumps, and every record mapped to an entity.
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
- [Cliopatria paper, *Scientific Data* (2025)](https://doi.org/10.1038/s41597-025-04516-9) (limitations section not yet read)
- [historical-basemaps](https://github.com/aourednik/historical-basemaps)
- [CShapes 2.0 at ETH Zurich](https://www.research-collection.ethz.ch/handle/20.500.11850/487987?show=full) and [BTAA catalog record](https://geo.btaa.org/catalog/b23a624e-f1ab-4989-8c94-f99f6e6fa414)
- [MapLibre globe example](https://maplibre.org/maplibre-gl-js/docs/examples/display-a-globe-with-a-vector-map/)
- [Web map library benchmark (2026 preprint, city-scale 3D data)](https://arxiv.org/abs/2602.23660)
