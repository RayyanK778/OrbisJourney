// Steps 6 and 7: Encode and Chunk. Rounds coordinates, places one label point inside each
// filled territory, and writes TopoJSON chunk files (100 years each, chosen in Phase 0)
// plus the index, entity and correction files the app needs.
//
// There is no simplification: Cliopatria's border points are already about 23 km apart.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon } from 'geojson';
import mapshaper from 'mapshaper';
import {
  SCHEMA_VERSION,
  type BuildIndex,
  type ChunkFile,
  type ChunkInfo,
  type ChunkLabelProps,
  type ChunkTerritoryProps,
  type CorrectionInfo,
  type Entity,
  type SourceInfo,
} from '../../shared/schema.ts';
import { CHUNK_SIZE, PRECISION, YEAR_RANGE } from '../config.ts';
import { changeYears, chunkStart } from '../lib/timeline.ts';
import type { Correction } from './correct.ts';
import type { FinalRecord } from './validate.ts';

export interface EncodeResult {
  index: BuildIndex;
  landGzipBytes: number;
}

const gzipSize = (s: string) => zlib.gzipSync(s, { level: 9 }).length;

async function mapshaperRun(commands: string, input: Record<string, string>): Promise<Record<string, string>> {
  const out = await mapshaper.applyCommands(commands, input);
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [path.parse(k).name, v.toString()]));
}

export async function encode(args: {
  records: FinalRecord[];
  entities: Entity[];
  corrections: Correction[];
  sources: SourceInfo[];
  landGeojson: string;
  outDir: string;
}): Promise<EncodeResult> {
  const { outDir } = args;
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(outDir, 'chunks'), { recursive: true });
  const write = (file: string, json: unknown) => {
    const text = JSON.stringify(json);
    fs.writeFileSync(path.join(outDir, file), text);
    return text;
  };

  // Land: the globe surface, with every attribute dropped
  const land = (await mapshaperRun(`-i land.json -drop fields=* -o format=geojson precision=${PRECISION} land.json`, { 'land.json': args.landGeojson })).land;
  fs.writeFileSync(path.join(outDir, 'land.json'), land);

  // Territories, numbered in time order so the numbers are stable between identical builds
  const records = [...args.records].sort((a, b) => a.from - b.from || a.id.localeCompare(b.id));
  const territories: FeatureCollection<Polygon | MultiPolygon, ChunkTerritoryProps> = {
    type: 'FeatureCollection',
    features: records.map((r, n) => ({
      type: 'Feature',
      geometry: r.geometry!,
      properties: {
        n,
        id: r.id,
        e: r.entityId,
        l: r.label,
        a: r.from,
        b: r.to,
        g: r.isGrouping ? 1 : 0,
        q: r.confidence,
        ...(r.groupIds.length ? { m: r.groupIds } : {}),
        ...(r.correctionIds.length ? { x: r.correctionIds } : {}),
      },
    })),
  };

  // Round once for everything, so borders shared between chunks stay identical
  const rounded: typeof territories = JSON.parse(
    (await mapshaperRun(`-i territories.json -o format=geojson precision=${PRECISION} territories.json`, {
      'territories.json': JSON.stringify(territories),
    })).territories,
  );
  // One label point inside each filled shape (in its largest part, for multipart shapes)
  const leaves = { ...rounded, features: rounded.features.filter(f => f.properties.g === 0) };
  const labelPoints: FeatureCollection<Point, ChunkTerritoryProps> = JSON.parse(
    (await mapshaperRun(`-i labels.json -points inner -o format=geojson precision=${PRECISION} labels.json`, {
      'labels.json': JSON.stringify(leaves),
    })).labels,
  );
  const labels: Feature<Point, ChunkLabelProps>[] = labelPoints.features.map(f => ({
    type: 'Feature',
    geometry: f.geometry,
    properties: { n: f.properties.n, l: f.properties.l, a: f.properties.a, b: f.properties.b },
  }));

  // Chunks
  const chunks: Record<string, ChunkInfo> = {};
  for (let start = chunkStart(YEAR_RANGE.min, CHUNK_SIZE); start <= YEAR_RANGE.max; start += CHUNK_SIZE) {
    const end = start + CHUNK_SIZE - 1;
    const inChunk = (p: { a: number; b: number }) => p.b >= start && p.a <= end;
    const chunkTerritories = { ...rounded, features: rounded.features.filter(f => inChunk(f.properties)) };
    const topology = JSON.parse(
      (await mapshaperRun(`-i territories.json -o format=topojson precision=${PRECISION} territories.json`, {
        'territories.json': JSON.stringify(chunkTerritories),
      })).territories,
    );
    const body: ChunkFile = {
      territories: topology,
      labels: { type: 'FeatureCollection', features: labels.filter(f => inChunk(f.properties)) },
    };
    const file = `chunks/c${start}.json`;
    const text = write(file, body);
    chunks[start] = { file, records: chunkTerritories.features.length, gzipBytes: gzipSize(text) };
  }

  const index: BuildIndex = {
    schemaVersion: SCHEMA_VERSION,
    minYear: YEAR_RANGE.min,
    maxYear: YEAR_RANGE.max,
    chunkSize: CHUNK_SIZE,
    chunks,
    changeYears: changeYears(records.filter(r => !r.isGrouping), YEAR_RANGE.min, YEAR_RANGE.max),
    sources: args.sources,
  };
  write('index.json', index);
  write('entities.json', [...args.entities].sort((a, b) => a.id.localeCompare(b.id)));
  const corrections: CorrectionInfo[] = args.corrections.map(c => ({ id: c.id, reason: c.reason, citations: c.citations }));
  write('corrections.json', corrections);

  return { index, landGzipBytes: gzipSize(land) };
}
