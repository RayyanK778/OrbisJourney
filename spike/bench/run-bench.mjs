// Phase 0 benchmark: serves spike/dist with gzip and drives Microsoft Edge through
// the page's window.spike hooks, then prints a summary and writes results JSON.
//
//   npm run spike:build && npm run spike:bench -- --variants=topojson-100y,geojson-100y --methods=filter,setData,window
//
// Options: --variants, --methods, --headed (show the browser window), --out=<dir>
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import zlib from 'node:zlib';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DIST = path.join(ROOT, 'spike', 'dist');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const variants = String(args.variants ?? 'topojson-100y').split(',');
const methods = String(args.methods ?? 'filter,setData,window').split(',');
const outDir = path.resolve(String(args.out ?? path.join(ROOT, 'spike', 'bench', 'results')));

// "Broadband": 25 Mbps down, 5 Mbps up, 40 ms round trip
const NETWORK = { offline: false, latency: 40, downloadThroughput: 25e6 / 8, uploadThroughput: 5e6 / 8 };
const PHONE_CPU_SLOWDOWN = 4;

if (!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error('spike/dist is missing. Run `npm run spike:build` first.');

// --- Static server with gzip ---------------------------------------------------
const notFound = new Set();
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const file = path.join(DIST, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    notFound.add(url.pathname);
    res.writeHead(404).end();
    return;
  }
  const type = TYPES[path.extname(file)] ?? 'application/octet-stream';
  const body = fs.readFileSync(file);
  const gzip = /gzip/.test(req.headers['accept-encoding'] ?? '') && type !== 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store', ...(gzip ? { 'Content-Encoding': 'gzip' } : {}) });
  res.end(gzip ? zlib.gzipSync(body) : body);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

// --- Helpers -------------------------------------------------------------------
const stats = xs => {
  const s = [...xs].sort((a, b) => a - b);
  const q = p => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return { n: s.length, median: q(0.5), p95: q(0.95), max: s[s.length - 1] };
};
const round = o => JSON.parse(JSON.stringify(o, (_, v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : v)));

const browser = await chromium.launch({
  channel: 'msedge',
  headless: !args.headed,
  args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'],
});

async function runScenario(variant, method) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', NETWORK);

  await page.goto(`${base}/?variant=${variant}&method=${method}&year=1914`);
  await page.waitForFunction(() => window.spike?.ready, null, { timeout: 120_000 });
  const r = { variant, method };
  r.firstViewMs = await page.evaluate(() => window.spike.firstViewMs);
  r.gpu = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  if (method === 'filter') await page.screenshot({ path: path.join(outDir, `${variant}-1914.png`) });

  const sweep = (from, to) => page.evaluate(async ([a, b]) => {
    await window.spike.setYear(a);
    await window.spike.prefetched();
    return window.spike.sweep(a + 1, b);
  }, [from, to]);

  // Year changes with the data already loaded, in three eras of very different density
  r.scrub = {
    modern: stats(await sweep(1900, 1999)),
    medieval: stats(await sweep(1000, 1099)),
    ancient: stats(await sweep(-500, -401)),
  };

  // Moving into the next chunk after it was prefetched, and jumping to one never requested
  r.chunkCrossPrefetched = await page.evaluate(async () => {
    await window.spike.setYear(1850);
    await window.spike.prefetched();
    return window.spike.setYear(1950);
  });
  r.chunkJumpCold = await page.evaluate(() => window.spike.setYear(1250));

  // Rotation, heaviest era and a medieval one
  await page.evaluate(() => window.spike.setYear(1914));
  r.spin1914 = await page.evaluate(() => window.spike.spin(5000));
  await page.evaluate(() => window.spike.setYear(1250));
  r.spin1250 = await page.evaluate(() => window.spike.spin(5000));

  // Rough phone proxy: same machine, CPU slowed down
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: PHONE_CPU_SLOWDOWN });
  r.phone = {
    scrubModern: stats(await sweep(1900, 1949)),
    spin1914: await page.evaluate(async () => { await window.spike.setYear(1914); return window.spike.spin(5000); }),
  };
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });

  r.fetches = await page.evaluate(() => window.spike.fetchTimings());
  r.errors = errors;
  await context.close();
  return round(r);
}

fs.mkdirSync(outDir, { recursive: true });
const results = [];
try {
  for (const variant of variants) {
    const index = JSON.parse(fs.readFileSync(path.join(DIST, 'data', variant, 'index.json'), 'utf8'));
    const gzSizes = Object.values(index.chunks).map(c => c.gzBytes);
    for (const method of methods) {
      process.stdout.write(`running ${variant} / ${method} ... `);
      const r = await runScenario(variant, method);
      r.data = { chunks: gzSizes.length, totalGzMB: gzSizes.reduce((a, b) => a + b, 0) / 1e6, largestGzMB: Math.max(...gzSizes) / 1e6 };
      results.push(round(r));
      console.log('done');
    }
  }
} finally {
  await browser.close();
  server.close();
}

const file = path.join(outDir, `bench-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(file, JSON.stringify(results, null, 2));

console.log(`\nGPU: ${results[0]?.gpu}\n`);
console.table(results.map(r => ({
  variant: r.variant,
  method: r.method,
  'largest MB gz': r.data.largestGzMB,
  'first view ms': r.firstViewMs,
  'scrub 1900s med/p95': `${r.scrub.modern.median}/${r.scrub.modern.p95}`,
  'scrub 1000s med/p95': `${r.scrub.medieval.median}/${r.scrub.medieval.p95}`,
  'scrub 500 BCE med/p95': `${r.scrub.ancient.median}/${r.scrub.ancient.p95}`,
  'cross prefetched': r.chunkCrossPrefetched,
  'jump cold': r.chunkJumpCold,
  'spin fps 1914': r.spin1914.renderFps,
  'phone scrub med/p95': `${r.phone.scrubModern.median}/${r.phone.scrubModern.p95}`,
  'phone spin fps': r.phone.spin1914.renderFps,
  errors: r.errors.length,
})));
for (const r of results) for (const e of r.errors) console.log(`[${r.variant}/${r.method}] ${e}`);
if (notFound.size) console.log(`404s served: ${[...notFound].join(', ')}`);
console.log(`\nresults: ${file}`);
