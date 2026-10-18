import { HandLandmarker } from '@mediapipe/tasks-vision';
import { getSharedVisionFileset } from './visionFileset.js';

const CDN_MODEL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

async function localExists(url) {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    const type = r.headers.get('content-type') || '';
    return r.ok && !type.includes('text/html');
  } catch {
    return false;
  }
}

export class HandTracker {
  constructor() {
    this.landmarker = null;
    this.ready = false;
    this.info = '';
    this._initPromise = null;
    this._lastTs = 0;
  }

  /** Tries local model first, then CDN. GPU first, then CPU. Idempotent singleton initialization. */
  async init() {
    if (this.ready) return true;
    if (this._initPromise) return this._initPromise;

    this._initPromise = (async () => {
      let lastErr = null;
      const fileset = await getSharedVisionFileset();

      const models = [];
      if (await localExists('/models/hand_landmarker.task')) {
        models.push({ url: '/models/hand_landmarker.task', tag: 'LOCAL' });
      }
      models.push({ url: CDN_MODEL, tag: 'CDN' });

      for (const m of models) {
        for (const delegate of ['GPU', 'CPU']) {
          try {
            this.landmarker = await HandLandmarker.createFromOptions(fileset, {
              baseOptions: { modelAssetPath: m.url, delegate },
              runningMode: 'VIDEO',
              numHands: 2,
              minHandDetectionConfidence: 0.55,
              minHandPresenceConfidence: 0.5,
              minTrackingConfidence: 0.5,
            });
            this.ready = true;
            this.info = `${delegate} / ${m.tag}`;
            console.log(`[HandTracker] Successfully initialized with ${delegate} (${m.tag})`);
            return true;
          } catch (e) {
            lastErr = e;
            console.warn(`[HandTracker] ${delegate} attempt failed for ${m.url}:`, e.message || e);
          }
        }
      }
      throw lastErr || new Error('HandLandmarker failed to initialise');
    })();

    return this._initPromise;
  }

  /** Returns an array of { landmarks, score, label } (0, 1 or 2 hands). Call once per new video frame. */
  detect(video, nowMs) {
    if (!this.ready || !this.landmarker) return [];
    if (!video || video.readyState < 2) return [];

    // Enforce strictly monotonically increasing timestamps for MediaPipe VIDEO runningMode
    const ts = Math.max(Math.round(nowMs), this._lastTs + 1);
    this._lastTs = ts;

    let res;
    try {
      res = this.landmarker.detectForVideo(video, ts);
    } catch (err) {
      console.warn('[HandLandmarker detect error]', err);
      return [];
    }

    if (!res || !res.landmarks || !res.landmarks.length) return [];
    return res.landmarks.map((landmarks, i) => ({
      landmarks,
      score: res.handedness?.[i]?.[0]?.score ?? 0.9,
      label: res.handedness?.[i]?.[0]?.categoryName || (i ? 'Left' : 'Right'),
    }));
  }
}
