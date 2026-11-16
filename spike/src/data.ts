import type { FeatureCollection, MultiPolygon, Point, Polygon } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';

export interface RecordProps {
  i: number;
  n: string;
  a: number; // first year, inclusive
  b: number; // last year, inclusive
  g: 0 | 1;  // 1 = grouping of other records
  c: string;
}

export interface Chunk {
  polys: FeatureCollection<Polygon | MultiPolygon, RecordProps>;
  labels: FeatureCollection<Point, RecordProps>;
}

type ChunkFile =
  | Chunk
  | { topology: Topology<{ polys: GeometryCollection<RecordProps> }>; labels: Chunk['labels'] };

interface ChunkInfo {
  file: string;
  records: number;
  vertices: number;
  bytes: number;
  gzBytes: number;
}

export interface ChunkIndex {
  variant: string;
  format: 'geojson' | 'topojson';
  chunkSize: number;
  minYear: number;
  maxYear: number;
  chunks: Record<string, ChunkInfo>;
}

export interface FetchTiming {
  start: number;
  ms: number;      // request through parsed, decoded chunk
  decodeMs: number; // TopoJSON to GeoJSON conversion only
  prefetch: boolean;
}

const decode = (file: ChunkFile): { chunk: Chunk; decodeMs: number } => {
  if (!('topology' in file)) return { chunk: file, decodeMs: 0 };
  const t0 = performance.now();
  const polys = feature(file.topology, file.topology.objects.polys) as Chunk['polys'];
  return { chunk: { polys, labels: file.labels }, decodeMs: performance.now() - t0 };
};

/** Loads and caches time-chunk files, and prefetches the neighbors of whatever is in view. */
export class ChunkStore {
  readonly timings: FetchTiming[] = [];
  private readonly cache = new Map<number, Promise<Chunk>>();

  private constructor(private readonly base: string, readonly index: ChunkIndex) {}

  static async open(base: string): Promise<ChunkStore> {
    const res = await fetch(`${base}/index.json`);
    if (!res.ok) throw new Error(`No data at ${base} (HTTP ${res.status}). Run the data:spike script.`);
    return new ChunkStore(base, await res.json());
  }

  startFor(year: number): number {
    return Math.floor(year / this.index.chunkSize) * this.index.chunkSize;
  }

  get(start: number, prefetch = false): Promise<Chunk> {
    let chunk = this.cache.get(start);
    if (!chunk) {
      const info = this.index.chunks[start];
      if (!info) return Promise.reject(new Error(`No chunk starts at ${start}`));
      const t0 = performance.now();
      chunk = fetch(`${this.base}/${info.file}`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status} for ${info.file}`);
          return res.json() as Promise<ChunkFile>;
        })
        .then(file => {
          const { chunk, decodeMs } = decode(file);
          this.timings.push({ start, ms: performance.now() - t0, decodeMs, prefetch });
          return chunk;
        });
      chunk.catch(() => this.cache.delete(start));
      this.cache.set(start, chunk);
    }
    return chunk;
  }

  /** Starts loading the chunks either side of `start`; resolves when both are in memory. */
  prefetchAround(start: number): Promise<unknown> {
    const size = this.index.chunkSize;
    const neighbors = [start - size, start + size].filter(s => this.index.chunks[s]);
    return Promise.allSettled(neighbors.map(s => this.get(s, true)));
  }
}
