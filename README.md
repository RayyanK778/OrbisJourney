# OrbisJourney

An interactive world history globe: pick any year from 2000 BCE to 2000 CE and see the civilizations, states and empires of that moment.

The plan is in [BLUEPRINT.md](BLUEPRINT.md). Phases 0 (technical test) and 1 (data foundation) are complete. The latest data build is summarized in [docs/data-report.md](docs/data-report.md).

## Requirements

- Node.js 22.18 or later, which runs the TypeScript pipeline directly
- Microsoft Edge, for the Phase 0 benchmark only

## Commands

```sh
npm install
npm run data:build    # download and verify the sources, then build all site data into data/build/
npm test              # unit tests for the pipeline and year handling
npm run typecheck
```

The first `data:build` takes about 3 minutes, mostly for the overlap check. Later builds reuse its results and take about 15 seconds. The build fails if validation finds errors, and the report explains them.

The Phase 0 test globe still works for reference:

```sh
npm run data:spike -- --format=topojson --chunk=100   # build its test data
npm run spike:dev     # open it at http://localhost:5173
npm run spike:bench   # benchmark a production build in Edge (run spike:build first)
```

Downloaded sources, generated data and builds are not committed. The commands above recreate them.

## Layout

| Folder | Contents |
|---|---|
| `pipeline/` | The data build: one file per step in `pipeline/steps/`, run by `pipeline/build.ts` |
| `shared/` | Code and types used by both the pipeline and the future app: year handling and the data file format |
| `data/` | Corrections and curated entities (see [data/README.md](data/README.md)), plus the uncommitted downloads and build output |
| `docs/` | Phase results and the generated data report |
| `spike/` | The Phase 0 test globe and benchmark |

## Data and credits

- Borders: [Cliopatria](https://github.com/Seshat-Global-History-Databank/cliopatria), Seshat Global History Databank, CC BY 4.0 ([paper](https://doi.org/10.1038/s41597-025-04516-9)). Version and checksum are pinned in [pipeline/sources.json](pipeline/sources.json). Changes made to it are listed in [data/corrections/](data/corrections/).
- Land: [Natural Earth](https://www.naturalearthdata.com/), public domain.
- Map rendering: [MapLibre GL JS](https://maplibre.org/), BSD-3-Clause.
