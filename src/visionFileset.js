import { FilesetResolver } from '@mediapipe/tasks-vision';

let sharedFilesetPromise = null;

async function localExists(url) {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    const type = r.headers.get('content-type') || '';
    return r.ok && !type.includes('text/html');
  } catch {
    return false;
  }
}

/**
 * Returns a cached, shared FilesetResolver instance for all vision tasks
 * (HandLandmarker and ObjectDetector) preventing duplicate WebAssembly runtime collisions.
 */
export async function getSharedVisionFileset() {
  if (!sharedFilesetPromise) {
    sharedFilesetPromise = (async () => {
      const wasmBases = [];
      if (await localExists('/wasm/vision_wasm_internal.js')) {
        wasmBases.push('/wasm');
      }
      wasmBases.push('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');

      let lastErr = null;
      for (const base of wasmBases) {
        try {
          const fileset = await FilesetResolver.forVisionTasks(base);
          return fileset;
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr || new Error('Failed to resolve MediaPipe Vision Tasks fileset');
    })();
  }
  return sharedFilesetPromise;
}
