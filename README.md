# OrbisJourney

An interactive world history globe: pick any year from 2000 BCE to 2000 CE and see the civilizations, states and empires of that moment.

The plan is in [BLUEPRINT.md](BLUEPRINT.md). The project is in Phase 0, a technical test, and the results are in [docs/phase-0-results.md](docs/phase-0-results.md).

## Requirements

- Node.js 22 or later
- Microsoft Edge, for the benchmark only

## Commands

```sh
npm install
npm run data:fetch    # download source data into data/raw/ and verify checksums
npm run data:spike -- --format=topojson --chunk=100   # build test data
npm run spike:dev     # open the test globe at http://localhost:5173
npm run spike:build   # production build of the test globe
npm run spike:bench   # benchmark the build in Edge (see spike/bench/run-bench.mjs)
npm run typecheck
```

The source data, generated data and builds are not committed. The commands above recreate them.

## Data and credits

- Borders: [Cliopatria](https://github.com/Seshat-Global-History-Databank/cliopatria), Seshat Global History Databank, CC BY 4.0. Version and checksum are pinned in [pipeline/sources.json](pipeline/sources.json).
- Land: [Natural Earth](https://www.naturalearthdata.com/), public domain.
- Map rendering: [MapLibre GL JS](https://maplibre.org/), BSD-3-Clause.
