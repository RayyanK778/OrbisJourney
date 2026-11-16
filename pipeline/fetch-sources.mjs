// Downloads every source in sources.json into data/raw/<id>/ and verifies its SHA-256.
// A source with no checksum yet is pinned to whatever downloads, and the manifest is updated.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { unzipSync } from 'fflate';

const ROOT = path.resolve(import.meta.dirname, '..');
const MANIFEST = path.join(ROOT, 'pipeline', 'sources.json');
const RAW = path.join(ROOT, 'data', 'raw');

const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
let manifestChanged = false;

for (const [id, src] of Object.entries(manifest.sources)) {
  const dir = path.join(RAW, id);
  const file = path.join(dir, src.file);
  fs.mkdirSync(dir, { recursive: true });

  let buf = fs.existsSync(file) ? fs.readFileSync(file) : null;
  if (buf && src.sha256 && sha256(buf) === src.sha256) {
    console.log(`${id}: already downloaded and verified`);
  } else {
    console.log(`${id}: downloading ${src.url}`);
    const res = await fetch(src.url);
    if (!res.ok) throw new Error(`${id}: HTTP ${res.status} from ${src.url}`);
    buf = Buffer.from(await res.arrayBuffer());
    const hash = sha256(buf);
    if (!src.sha256) {
      src.sha256 = hash;
      manifestChanged = true;
      console.log(`${id}: pinned checksum ${hash}`);
    } else if (hash !== src.sha256) {
      throw new Error(`${id}: checksum mismatch (expected ${src.sha256}, got ${hash}). The upstream file changed; review it before updating sources.json.`);
    }
    fs.writeFileSync(file, buf);
    console.log(`${id}: saved ${(buf.length / 1e6).toFixed(1)} MB`);
  }

  if (src.unzip) {
    for (const [name, data] of Object.entries(unzipSync(buf))) {
      if (name.endsWith('/')) continue;
      // basename() keeps archive entries from writing outside the source's folder
      const out = path.join(dir, path.basename(name));
      fs.writeFileSync(out, data);
      console.log(`${id}: extracted ${path.basename(name)} (${(data.length / 1e6).toFixed(1)} MB)`);
    }
  }
}

if (manifestChanged) fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
