// Builds the Phase 0 test data: Cliopatria records for 2000 BCE–2000 CE with one label
// point per record, split into fixed-size time chunks.
//
//   node pipeline/build-spike-data.mjs --format=topojson --chunk=100
//
// --format  geojson | topojson. TopoJSON stores each shared border once; consecutive
//           records of the same polity mostly repeat their borders, so it is far smaller.
// --chunk   years per chunk file
// Output goes to spike/public/data/<format>-<chunk>y/, plus a shared land.json.
//
// There is no simplification step: Cliopatria's vertices are already about 23 km apart
// (median), so tolerances of 1–2.5 km removed under 4% of them.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import mapshaper from 'mapshaper';

const ROOT = path.resolve(import.meta.dirname, '..');
const RAW = path.join(ROOT, 'data', 'raw');
const OUT = path.join(ROOT, 'spike', 'public', 'data');
const MIN_YEAR = -2000;
const MAX_YEAR = 2000;
const PRECISION = 0.01; // about 1.1 km at the equator

const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
const format = args.format ?? 'topojson';
const chunkSize = Number(args.chunk ?? 100);
if (!['geojson', 'topojson'].includes(format)) throw new Error(`Unknown --format=${format}`);
const variant = `${format}-${chunkSize}y`;

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'pipeline', 'sources.json'), 'utf8'));
const gz = s => zlib.gzipSync(s, { level: 9 }).length;
const mb = n => (n / 1e6).toFixed(2);

// Muted palette; a record's color comes from a hash of its name so it stays stable over time
const PALETTE = ['#c98b6b', '#9fb37a', '#7fa7c4', '#d4b26a', '#b08cb8', '#8fbfb0', '#d39a9a', '#a6a07c', '#7d93b8', '#c4a585', '#94b894', '#b89878'];
const colorFor = name => {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return PALETTE[(h >>> 0) % PALETTE.length];
};

const run = async (commands, input) => {
  const out = await mapshaper.applyCommands(commands, input);
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [path.parse(k).name, v.toString()]));
};

// --- Land -------------------------------------------------------------------
fs.mkdirSync(OUT, { recursive: true });
const landSrc = fs.readFileSync(path.join(RAW, 'naturalEarthLand', manifest.sources.naturalEarthLand.file), 'utf8');
const landJson = (await run(`-i land.json -drop fields=* -o format=geojson precision=${PRECISION} land.json`, { 'land.json': landSrc })).land;
fs.writeFileSync(path.join(OUT, 'land.json'), landJson);
console.log(`land.json: ${mb(landJson.length)} MB raw, ${mb(gz(landJson))} MB gzip`);

// --- Polities ---------------------------------------------------------------
const rawDir = path.join(RAW, 'cliopatria');
const geojsonFile = fs.readdirSync(rawDir).find(f => f.endsWith('.geojson'));
if (!geojsonFile) throw new Error('No Cliopatria .geojson in data/raw/cliopatria. Run `npm run data:fetch` first.');
const src = JSON.parse(fs.readFileSync(path.join(rawDir, geojsonFile), 'utf8'));

const records = src.features
  .filter(f => f.properties.ToYear >= MIN_YEAR && f.properties.FromYear <= MAX_YEAR)
  .map((f, i) => ({
    type: 'Feature',
    geometry: f.geometry,
    properties: {
      i,                                   // stable numeric id, for picking and feature state
      n: f.properties.Name,
      a: f.properties.FromYear,            // inclusive
      b: f.properties.ToYear,              // inclusive
      g: f.properties.Components ? 1 : 0,  // 1 = grouping of other records; not filled
      c: colorFor(f.properties.Name),
    },
  }));
console.log(`${geojsonFile}: ${records.length} records in range`);

const t0 = Date.now();
const layers = await run(`-i polys.json -points inner + name=labels -o format=geojson precision=${PRECISION} target=*`, {
  'polys.json': JSON.stringify({ type: 'FeatureCollection', features: records }),
});
const polys = JSON.parse(layers.polys);
const labels = JSON.parse(layers.labels);
console.log(`rounded coordinates and placed labels in ${((Date.now() - t0) / 1000).toFixed(1)} s`);

const vertexCount = g => {
  let n = 0;
  const walk = a => { if (typeof a[0] === 'number') n++; else a.forEach(walk); };
  if (g) walk(g.coordinates);
  return n;
};

const dir = path.join(OUT, variant);
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

const chunks = {};
let totalGz = 0;
for (let start = MIN_YEAR; start <= MAX_YEAR; start += chunkSize) {
  const end = start + chunkSize - 1;
  const overlaps = f => f.geometry && f.properties.b >= start && f.properties.a <= end;
  const chunkPolys = { type: 'FeatureCollection', features: polys.features.filter(overlaps) };
  const chunkLabels = { type: 'FeatureCollection', features: labels.features.filter(f => overlaps(f) && f.properties.g === 0) };

  const body = format === 'geojson'
    ? { polys: chunkPolys, labels: chunkLabels }
    : {
      topology: JSON.parse((await run(`-i polys.json -o format=topojson precision=${PRECISION} polys.json`, { 'polys.json': JSON.stringify(chunkPolys) })).polys),
      labels: chunkLabels,
    };
  const json = JSON.stringify(body);
  const file = `c${start}.json`;
  fs.writeFileSync(path.join(dir, file), json);
  const gzBytes = gz(json);
  totalGz += gzBytes;
  chunks[start] = {
    file,
    records: chunkPolys.features.length,
    vertices: chunkPolys.features.reduce((s, f) => s + vertexCount(f.geometry), 0),
    bytes: json.length,
    gzBytes,
  };
}

const index = {
  variant,
  format,
  chunkSize,
  minYear: MIN_YEAR,
  maxYear: MAX_YEAR,
  precision: PRECISION,
  source: { id: 'cliopatria', version: manifest.sources.cliopatria.version, file: geojsonFile, sha256: manifest.sources.cliopatria.sha256 },
  chunks,
};
fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(index, null, 2));

const largest = Object.entries(chunks).sort((x, y) => y[1].gzBytes - x[1].gzBytes).slice(0, 4);
console.log(`${variant}: ${Object.keys(chunks).length} chunks, ${mb(totalGz)} MB gzip in total`);
console.log(`largest: ${largest.map(([s, c]) => `${s}: ${mb(c.gzBytes)} MB gz, ${c.records} records`).join(' | ')}`);
