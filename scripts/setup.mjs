// Runs automatically after `npm install`.
// 1) copies the MediaPipe WASM runtime into /public/wasm
// 2) downloads the hand-landmarker model into /public/models (optional – the app falls back to a CDN)
// Never fails the install.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'node_modules/@mediapipe/tasks-vision/wasm');
const dst = path.join(root, 'public/wasm');

try {
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) fs.copyFileSync(path.join(src, f), path.join(dst, f));
  console.log('[setup] MediaPipe WASM copied to public/wasm');
} catch (e) {
  console.log('[setup] WASM copy skipped (app will use CDN):', e.message);
}

const MODELS_TO_FETCH = [
  {
    name: 'hand_landmarker.task',
    url: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  },
  {
    name: 'efficientdet_lite0.tflite',
    url: 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite',
  },
];

const modelDir = path.join(root, 'public/models');
fs.mkdirSync(modelDir, { recursive: true });

for (const m of MODELS_TO_FETCH) {
  const file = path.join(modelDir, m.name);
  if (!fs.existsSync(file)) {
    try {
      const r = await fetch(m.url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
      console.log(`[setup] ${m.name} downloaded`);
    } catch (e) {
      console.log(`[setup] ${m.name} download skipped (app will fetch from CDN):`, e.message);
    }
  }
}
process.exit(0);
