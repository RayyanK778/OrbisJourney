// The data model (blueprint section 3.3) and the format of the files the pipeline writes
// to data/build/. The app reads the same files, so both sides import these types.
import type { FeatureCollection, Point } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';

/** 1 approximate, 2 moderate, 3 legally defined. */
export type Confidence = 1 | 2 | 3;

export type EntityKind = 'state' | 'empire' | 'city-states' | 'civilization' | 'grouping';

/** Who: a curated identity that survives renames. */
export interface Entity {
  id: string;
  displayName: string;
  /** Every name the entity appears under, in the source or after corrections. */
  aliases: string[];
  kind: EntityKind;
  wikidataId?: string;
  wikipediaTitle?: string;
  /** False when the pipeline generated the entity from a single source name. */
  curated: boolean;
}

// --- Files in data/build/ -----------------------------------------------------------
// A territory record is one shape valid for a span of years. The pipeline's full version
// is FinalRecord in pipeline/steps/validate.ts; the app receives the fields below.

export const SCHEMA_VERSION = 1;

/**
 * Properties of one territory inside a chunk file. Keys are one letter because they are
 * repeated for every record; gzip removes most of the remaining repetition.
 */
export interface ChunkTerritoryProps {
  /** Record number, unique across the whole build. Usable as a MapLibre feature ID. */
  n: number;
  /** Stable record ID: the slug of the source name and the first year, e.g. "kingdom-of-sweden:1905". Groupings start with "group-". */
  id: string;
  /** Entity ID */
  e: string;
  /** Label */
  l: string;
  /** From year, inclusive */
  a: number;
  /** To year, inclusive */
  b: number;
  /** 1 when the record is a grouping, drawn as an outline rather than filled */
  g: 0 | 1;
  /** Confidence */
  q: Confidence;
  /** Grouping entity IDs, when there are any */
  m?: string[];
  /** Correction IDs, when there are any */
  x?: string[];
}

/** Label points carry what a symbol layer needs to place and filter its text. */
export interface ChunkLabelProps {
  n: number;
  l: string;
  a: number;
  b: number;
}

export interface ChunkFile {
  territories: Topology<{ territories: GeometryCollection<ChunkTerritoryProps> }>;
  /** One point per filled (non-grouping) record, placed inside its shape. */
  labels: FeatureCollection<Point, ChunkLabelProps>;
}

export interface ChunkInfo {
  file: string;
  records: number;
  gzipBytes: number;
}

export interface SourceInfo {
  id: string;
  version: string;
  sha256: string;
  license: string;
  attribution: string;
  url: string;
}

export interface BuildIndex {
  schemaVersion: number;
  minYear: number;
  maxYear: number;
  chunkSize: number;
  /** Keyed by the chunk's first year, e.g. "1900" covers 1900–1999 and "-100" covers 100–1 BCE. */
  chunks: Record<string, ChunkInfo>;
  /**
   * Every year in which the set of filled territories differs from the year before.
   * Used for "previous/next change" buttons and to skip redraws when nothing changed.
   */
  changeYears: number[];
  sources: SourceInfo[];
}

export interface CorrectionInfo {
  id: string;
  reason: string;
  citations: { title: string; url: string }[];
}
