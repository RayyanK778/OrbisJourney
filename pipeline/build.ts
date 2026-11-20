// Builds all site data from the pinned sources (blueprint section 3.4).
//
//   npm run data:build      fetches and verifies the sources, then runs this file
//
// Writes data/build/ (site data, not committed) and docs/data-report.md (committed).
// Exits with code 1 if validation finds errors; the report then explains them.
import fs from 'node:fs';
import path from 'node:path';
import type { SourceInfo } from '../shared/schema.ts';
import { confidenceFor, PATHS, ROOT, YEAR_RANGE } from './config.ts';
import { slug, stripParens, uniqueSlugs } from './lib/text.ts';
import { applyCorrections, type CorrectionFile } from './steps/correct.ts';
import { encode, type EncodeResult } from './steps/encode.ts';
import { identify, type CuratedFile } from './steps/identify.ts';
import { normalize } from './steps/normalize.ts';
import { findOverlaps, OVERLAP_CACHE_VERSION, type OverlapCache } from './steps/overlaps.ts';
import { renderReport } from './steps/report.ts';
import { validate, type FinalRecord } from './steps/validate.ts';

const started = performance.now();
const log = (msg: string) => console.log(`[${((performance.now() - started) / 1000).toFixed(1).padStart(5)} s] ${msg}`);
const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8'));

// --- 1. Sources (downloaded and checksum-verified by fetch-sources.mjs) ---
interface ManifestSource { description: string; version: string; license: string; url: string; file: string; sha256: string; attribution: string }
const manifest = readJson<{ sources: Record<string, ManifestSource> }>(PATHS.manifest);
const sources: SourceInfo[] = Object.entries(manifest.sources).map(([id, s]) => ({
  id, version: s.version, sha256: s.sha256, license: s.license, attribution: s.attribution, url: s.url,
}));
const clio = manifest.sources.cliopatria;
const clioDir = path.join(PATHS.raw, 'cliopatria');
const clioFile = fs.existsSync(clioDir) && fs.readdirSync(clioDir).find(f => f.endsWith('.geojson'));
if (!clioFile) throw new Error('Cliopatria data is missing. Run `npm run data:build`, which downloads it first.');
log(`reading ${clioFile}`);
const source = readJson<{ features: Parameters<typeof normalize>[0] }>(path.join(clioDir, clioFile));

// --- 2. Normalize ---
const normalized = normalize(source.features, YEAR_RANGE);
log(`normalized ${normalized.records.length} of ${normalized.totalInSource} records`);

// --- 3. Identify ---
const identified = identify(normalized.records, readJson<CuratedFile>(PATHS.entities));
log(`identified ${identified.entities.length} entities`);

// --- 4. Correct ---
const correctionFiles = fs.readdirSync(PATHS.corrections).filter(f => f.endsWith('.json')).sort()
  .map(file => ({ file, data: readJson<CorrectionFile>(path.join(PATHS.corrections, file)) }));
const corrected = applyCorrections(identified.records, correctionFiles);
log(`applied ${corrected.applied.length} corrections`);

// Record IDs come from the source name. "(Netherlands)" and "Netherlands" are different
// polities, so groupings get a prefix; "Han" and "Hán" become "han" and "han-2".
const nameKeys = uniqueSlugs(corrected.records.map(r => r.name), name => `${name.startsWith('(') ? 'group-' : ''}${slug(stripParens(name))}`);
const records: FinalRecord[] = corrected.records.map(r => ({
  ...r,
  id: `${nameKeys.get(r.name)}:${r.from}`,
  confidence: confidenceFor(r.from),
  source: `cliopatria@${clio.version}`,
}));
// Corrected labels are names the entity went by, too
const entityById = new Map(identified.entities.map(e => [e.id, e]));
for (const r of records) {
  const e = entityById.get(r.entityId)!;
  if (!e.aliases.includes(r.label)) e.aliases.push(r.label);
}

// --- 5. Validate ---
const cacheFile = path.join(ROOT, 'data', 'cache', `overlaps-v${OVERLAP_CACHE_VERSION}.json`);
const previousCache: OverlapCache = fs.existsSync(cacheFile) ? readJson(cacheFile) : {};
log(`checking overlaps (${Object.keys(previousCache).length ? 'with cache' : 'no cache yet, about 2 minutes'})`);
const overlaps = findOverlaps(records, previousCache);
fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
fs.writeFileSync(cacheFile, JSON.stringify(overlaps.cache));
const issues = [...identified.issues, ...corrected.issues, ...validate(records), ...overlaps.issues];
const errors = issues.filter(i => i.level === 'error');
log(`validated: ${errors.length} errors, ${issues.length - errors.length} warnings`);

// --- 6–7. Encode and chunk (only when valid) ---
let encoded: EncodeResult | null = null;
if (errors.length === 0) {
  encoded = await encode({
    records,
    entities: identified.entities,
    corrections: corrected.applied.map(a => a.correction),
    sources,
    landGeojson: fs.readFileSync(path.join(PATHS.raw, 'naturalEarthLand', manifest.sources.naturalEarthLand.file), 'utf8'),
    outDir: PATHS.build,
  });
  fs.writeFileSync(path.join(PATHS.build, 'validation.json'), JSON.stringify(issues, null, 2));
  log(`wrote ${Object.keys(encoded.index.chunks).length} chunks to ${path.relative(ROOT, PATHS.build)}`);
} else {
  // Remove the previous build so nothing stale is mistaken for current data
  fs.rmSync(PATHS.build, { recursive: true, force: true });
}

// --- 8. Report ---
fs.writeFileSync(PATHS.report, renderReport({ sources, normalized, identified, corrected, records, issues, overlapStats: overlaps.stats, encoded }));
log(`wrote ${path.relative(ROOT, PATHS.report)}`);

if (errors.length) {
  console.error(`\nBuild failed with ${errors.length} errors:`);
  for (const e of errors) console.error(`  ${e.check}: ${e.message}`);
  process.exit(1);
}
