// Phase 0 test page: real Cliopatria borders on a MapLibre globe, with two ways of
// switching years so they can be measured against each other (see spike/bench/).
//
// URL parameters: ?variant=topojson-100y&method=filter|setData|window&year=1914
//
// Methods:
//   filter   the whole chunk is in the map source; a layer filter picks the year
//   setData  only the year's active records are in the map source
//   window   records active within ±WINDOW_YEARS are in the map source and a layer
//            filter picks the year; the source is replaced only on leaving the window
import { Map as MapLibreMap, Popup, setWorkerUrl, type GeoJSONSource, type MapOptions } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import { ChunkStore, type Chunk, type RecordProps } from './data';
import { addYears, clampYear, formatYear, fromAstronomical, MAX_YEAR, MIN_YEAR, toAstronomical } from './years';

setWorkerUrl(workerUrl);

type StyleSpec = Exclude<MapOptions['style'], string | undefined>;
type Filter = Parameters<MapLibreMap['setFilter']>[1];
type Method = 'filter' | 'setData' | 'window';

const params = new URLSearchParams(location.search);
const variant = params.get('variant') ?? 'topojson-100y';
const methodParam = params.get('method');
// setData is the Phase 0 choice (docs/phase-0-results.md); the others stay for comparison
const method: Method = methodParam === 'filter' || methodParam === 'window' ? methodParam : 'setData';
const WINDOW_YEARS = 25;
const initialYear = clampYear(Number(params.get('year') ?? 1914) || 1914);

const POLITY_LAYERS = ['polity-fill', 'polity-line', 'polity-label'];
const EMPTY = { type: 'FeatureCollection' as const, features: [] };

const leafOnly: Filter = ['==', ['get', 'g'], 0];
const leafInYear = (year: number): Filter => ['all', ['==', ['get', 'g'], 0], ['<=', ['get', 'a'], year], ['>=', ['get', 'b'], year]];

const style: StyleSpec = {
  version: 8,
  projection: { type: 'globe' },
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sky: {
    'sky-color': '#0b1026',
    'horizon-color': '#2a3a66',
    'fog-color': '#2a3a66',
    'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0],
  },
  sources: {
    land: { type: 'geojson', data: 'data/land.json', attribution: 'Land: Natural Earth' },
    polities: { type: 'geojson', data: EMPTY, promoteId: 'i', attribution: 'Borders: <a href="https://github.com/Seshat-Global-History-Databank/cliopatria">Cliopatria</a> (CC BY 4.0)' },
    labels: { type: 'geojson', data: EMPTY },
  },
  layers: [
    { id: 'ocean', type: 'background', paint: { 'background-color': '#9cb9cc' } },
    { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#ebe5d3' } },
    { id: 'polity-fill', type: 'fill', source: 'polities', filter: leafOnly, paint: { 'fill-color': ['get', 'c'], 'fill-opacity': 0.72 } },
    { id: 'polity-line', type: 'line', source: 'polities', filter: leafOnly, paint: { 'line-color': '#4a3b2c', 'line-width': 0.8, 'line-opacity': 0.7 } },
    {
      id: 'polity-label',
      type: 'symbol',
      source: 'labels',
      filter: leafOnly,
      layout: { 'text-field': ['get', 'n'], 'text-font': ['Open Sans Semibold'], 'text-size': 11, 'text-max-width': 8 },
      paint: { 'text-color': '#2b2118', 'text-halo-color': 'rgba(255,255,255,0.8)', 'text-halo-width': 1.2 },
    },
  ],
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const ui = {
  year: $<HTMLOutputElement>('year'),
  slider: $<HTMLInputElement>('slider'),
  input: $<HTMLInputElement>('year-input'),
  era: $<HTMLSelectElement>('era'),
  stats: $<HTMLDivElement>('stats'),
  method: $<HTMLSelectElement>('method'),
  variant: $<HTMLSelectElement>('variant'),
};

const map = new MapLibreMap({
  container: 'map',
  style,
  center: [30, 30],
  zoom: 1.6,
  minZoom: 0.8,
  maxZoom: 6,
  fadeDuration: 0, // labels appear immediately, so timings measure data and layout only
});

const store = await ChunkStore.open(`data/${variant}`);
const polySource = () => map.getSource('polities') as GeoJSONSource;
const labelSource = () => map.getSource('labels') as GeoJSONSource;

// --- Year changes -------------------------------------------------------------
// Requests are coalesced: while one update renders, only the latest requested year waits.

let shownYear: number | null = null;
let shownChunk: number | null = null;
let targetYear = initialYear;
let busy = false;
let activeCount = 0;
let lastUpdateMs = 0;
const waiters: Array<() => void> = [];

const idle = () => new Promise<void>(resolve => {
  map.once('idle', () => resolve());
  map.triggerRepaint();
});

const isActive = (year: number) => (f: { properties: RecordProps }) => f.properties.a <= year && f.properties.b >= year;

let windowRange: [number, number] | null = null;

/** Leaf records active at any point in [from, to], gathered from every chunk the range touches. */
async function recordsBetween(from: number, to: number): Promise<Chunk> {
  const starts = new Set([store.startFor(from), store.startFor(to)]);
  for (let s = store.startFor(from); s <= store.startFor(to); s += store.index.chunkSize) starts.add(s);
  const chunks = await Promise.all([...starts].filter(s => store.index.chunks[s]).map(s => store.get(s)));
  const keep = (f: { properties: RecordProps }) => f.properties.g === 0 && f.properties.b >= from && f.properties.a <= to;
  const seenPolys = new Set<number>();
  const seenLabels = new Set<number>();
  const firstTime = (seen: Set<number>) => (f: { properties: RecordProps }) => !seen.has(f.properties.i) && !!seen.add(f.properties.i);
  return {
    polys: { type: 'FeatureCollection', features: chunks.flatMap(c => c.polys.features.filter(keep)).filter(firstTime(seenPolys)) },
    labels: { type: 'FeatureCollection', features: chunks.flatMap(c => c.labels.features.filter(keep)).filter(firstTime(seenLabels)) },
  };
}

async function render(year: number) {
  const start = store.startFor(year);
  const chunk: Chunk = await store.get(start);
  if (method === 'window') {
    if (!windowRange || year < windowRange[0] || year > windowRange[1]) {
      const range: [number, number] = [addYears(year, -WINDOW_YEARS), addYears(year, WINDOW_YEARS)];
      const windowed = await recordsBetween(...range);
      await Promise.all([polySource().setData(windowed.polys), labelSource().setData(windowed.labels)]);
      windowRange = range;
    }
    for (const id of POLITY_LAYERS) map.setFilter(id, leafInYear(year));
  } else if (method === 'filter') {
    if (start !== shownChunk) {
      await Promise.all([polySource().setData(chunk.polys), labelSource().setData(chunk.labels)]);
      shownChunk = start;
    }
    for (const id of POLITY_LAYERS) map.setFilter(id, leafInYear(year));
  } else {
    const active = isActive(year);
    await Promise.all([
      polySource().setData({ ...chunk.polys, features: chunk.polys.features.filter(active) }),
      labelSource().setData({ ...chunk.labels, features: chunk.labels.features.filter(active) }),
    ]);
    shownChunk = start;
  }
  activeCount = chunk.polys.features.filter(f => f.properties.g === 0 && isActive(year)(f)).length;
  void store.prefetchAround(start);
  await idle();
}

async function pump() {
  busy = true;
  while (shownYear !== targetYear) {
    const year = targetYear;
    const t0 = performance.now();
    await render(year);
    lastUpdateMs = performance.now() - t0;
    shownYear = year;
    updateStats();
  }
  busy = false;
  waiters.splice(0).forEach(resolve => resolve());
}

function requestYear(year: number) {
  targetYear = clampYear(year);
  syncControls();
  history.replaceState(null, '', `?${new URLSearchParams({ variant, method, year: String(targetYear) })}`);
  if (!busy && map.isStyleLoaded()) void pump();
}

const whenShown = () => (shownYear === targetYear && !busy ? Promise.resolve() : new Promise<void>(r => waiters.push(r)));

// --- Controls -------------------------------------------------------------------

function syncControls() {
  ui.year.textContent = formatYear(targetYear);
  ui.slider.value = String(toAstronomical(targetYear));
  ui.input.value = String(Math.abs(targetYear));
  ui.era.value = targetYear < 0 ? 'BCE' : 'CE';
}

function updateStats() {
  const kb = (n: number) => `${Math.round(n / 1024)} KB`;
  const info = store.index.chunks[store.startFor(shownYear ?? targetYear)];
  ui.stats.textContent = `${activeCount} territories · update ${lastUpdateMs.toFixed(0)} ms · chunk ${kb(info?.gzBytes ?? 0)} gzip`;
}

ui.slider.min = String(toAstronomical(MIN_YEAR));
ui.slider.max = String(toAstronomical(MAX_YEAR));
ui.slider.addEventListener('input', () => requestYear(fromAstronomical(Number(ui.slider.value))));
const fromInput = () => requestYear((ui.era.value === 'BCE' ? -1 : 1) * Math.abs(Number(ui.input.value) || 1));
ui.input.addEventListener('change', fromInput);
ui.era.addEventListener('change', fromInput);
document.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(btn =>
  btn.addEventListener('click', () => requestYear(addYears(targetYear, Number(btn.dataset.step)))),
);
ui.method.value = method;
ui.variant.value = variant;
const reloadWith = () => { location.search = `?${new URLSearchParams({ variant: ui.variant.value, method: ui.method.value, year: String(targetYear) })}`; };
ui.method.addEventListener('change', reloadWith);
ui.variant.addEventListener('change', reloadWith);
syncControls();

// --- Picking --------------------------------------------------------------------

const popup = new Popup({ closeButton: false, maxWidth: '260px' });
map.on('click', 'polity-fill', e => {
  const p = e.features?.[0]?.properties as RecordProps | undefined;
  if (!p) return;
  popup.setLngLat(e.lngLat).setHTML(`<strong></strong><br><span></span>`).addTo(map);
  const el = popup.getElement();
  el.querySelector('strong')!.textContent = p.n;
  el.querySelector('span')!.textContent = `This shape: ${formatYear(p.a)} – ${formatYear(p.b)}`;
});
map.on('mouseenter', 'polity-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
map.on('mouseleave', 'polity-fill', () => { map.getCanvas().style.cursor = ''; });

// --- Benchmark hooks (driven by spike/bench/run-bench.mjs) ------------------------

async function spin(ms: number) {
  const frameGaps: number[] = [];
  let renders = 0;
  const onRender = () => { renders++; };
  map.on('render', onRender);
  await new Promise<void>(resolve => {
    let last = performance.now();
    const end = last + ms;
    const step = (t: number) => {
      frameGaps.push(t - last);
      last = t;
      const c = map.getCenter();
      map.jumpTo({ center: [c.lng + 0.6, c.lat] });
      if (t < end) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
  map.off('render', onRender);
  frameGaps.sort((x, y) => x - y);
  return {
    renderFps: renders / (ms / 1000),
    p95FrameMs: frameGaps[Math.floor(frameGaps.length * 0.95)],
    maxFrameMs: frameGaps[frameGaps.length - 1],
  };
}

const spike = {
  ready: false,
  firstViewMs: 0,
  variant,
  method,
  async setYear(year: number) {
    const t0 = performance.now();
    requestYear(year);
    await whenShown();
    return performance.now() - t0;
  },
  async sweep(from: number, to: number) {
    const times: number[] = [];
    for (let y = from; y <= to; y = addYears(y, 1)) {
      times.push(await spike.setYear(y));
      if (y === MAX_YEAR) break;
    }
    return times;
  },
  prefetched: () => store.prefetchAround(store.startFor(targetYear)),
  spin,
  fetchTimings: () => store.timings,
  activeCount: () => activeCount,
};
Object.assign(window, { spike });

map.on('load', async () => {
  void pump();
  await whenShown();
  spike.firstViewMs = performance.now();
  spike.ready = true;
});
