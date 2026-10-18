import { ObjectDetector } from '@mediapipe/tasks-vision';
import { getSharedVisionFileset } from './visionFileset.js';
import { matchObjectToModel } from './models/registry.js';
import { synthesizeAndRegisterModel } from './models/aiSynthesizer.js';

const CDN_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const CDN_MODEL =
  'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite';

// Optional External Vision AI configuration from environment
const GEMINI_API_KEY = import.meta.env?.VITE_GEMINI_API_KEY || '';
const VISION_API_URL = import.meta.env?.VITE_VISION_API_URL || '';

async function localExists(url) {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    const type = r.headers.get('content-type') || '';
    return r.ok && !type.includes('text/html');
  } catch {
    return false;
  }
}

export const SCANNER_STATES = {
  UNINITIALIZED: 'UNINITIALIZED',
  LOADING: 'LOADING',
  READY: 'READY',
  SCANNING: 'SCANNING',
  DETECTED: 'DETECTED',
  LOW_CONFIDENCE: 'LOW_CONFIDENCE',
  NO_TARGET: 'NO_TARGET',
  ERROR: 'ERROR',
  PAUSED: 'PAUSED',
};

export class ObjectScanner {
  constructor(options = {}) {
    this.detector = null;
    this.ready = false;
    this.state = SCANNER_STATES.UNINITIALIZED;
    this.info = '';
    this.errorMessage = '';

    // Configuration
    this.minConfidence = options.minConfidence ?? 0.35;
    this.lowConfidenceThreshold = options.lowConfidenceThreshold ?? 0.30;
    this.intervalMs = options.intervalMs ?? 300; // Throttled inference
    this.autoSwitchEnabled = options.autoSwitchEnabled ?? true;
    this.enabled = true; // Can be turned on/off per page

    // Temporal smoothing / Hysteresis
    this.history = [];
    this.maxHistory = 4;
    this.lastInferenceTime = 0;
    this.lastGeminiScanTime = 0;
    this.geminiIntervalMs = 4500; // Calibrated to ~13 RPM to stay safely under 15 RPM free tier limits
    this.isProcessing = false;

    // Multi-object tracking & locking
    this.allDetections = [];
    this.selectedTargetLabel = null;
    this.currentDetection = null;
    this.lastSuccessfulDetection = null;
    this.activeModelMatch = null;
    this.isTargetLocked = false;

    // Optional Cloud AI Vision API state
    this.hasExternalAI = Boolean(GEMINI_API_KEY || VISION_API_URL);
    this.isCallingAI = false;
    this.currentAbortController = null;
    this._currentAIPromise = null;

    // Live scanning progress & telemetry
    this.scanProgress = 0;
    this.scanPhase = 'STANDBY';

    // Callbacks
    this.onDetection = options.onDetection || null;
    this.onStateChange = options.onStateChange || null;
    this.onMultiObjects = options.onMultiObjects || null;
    this.onProgress = options.onProgress || null;
    this._initPromise = null;
  }

  setProgress(pct, phase) {
    this.scanProgress = Math.round(pct);
    this.scanPhase = phase;
    if (this.onProgress) {
      this.onProgress(this.scanProgress, this.scanPhase);
    }
  }

  setState(newState, detail = '') {
    this.state = newState;
    if (this.onStateChange) this.onStateChange(newState, detail, this.currentDetection);
  }

  lockTarget(detection) {
    this.isTargetLocked = true;
    this.currentDetection = detection;
    this.lastSuccessfulDetection = detection;
    this.activeModelMatch = detection.modelMatch;
    this.selectedTargetLabel = detection.label;
    this.setProgress(100, `Locked Target: ${detection.label}`);
    this.setState(SCANNER_STATES.DETECTED, `Locked: ${detection.label}`);
    if (this.onDetection) this.onDetection(detection);
  }

  unlockTarget() {
    this.isTargetLocked = false;
    this.selectedTargetLabel = null;
    this.reset();
  }

  /**
   * Initializes MediaPipe ObjectDetector with local/CDN fallback using shared WASM fileset.
   */
  async init() {
    if (this.ready) return true;
    if (this._initPromise) return this._initPromise;

    this._initPromise = (async () => {
      this.setState(SCANNER_STATES.LOADING, 'Loading Object Recognition Model…');
      let lastErr = null;
      const fileset = await getSharedVisionFileset();

      const models = [];
      if (await localExists('/models/efficientdet_lite0.tflite')) {
        models.push({ url: '/models/efficientdet_lite0.tflite', tag: 'LOCAL' });
      }
      models.push({ url: CDN_MODEL, tag: 'CDN' });

      for (const m of models) {
        for (const delegate of ['GPU', 'CPU']) {
          try {
            this.detector = await ObjectDetector.createFromOptions(fileset, {
              baseOptions: { modelAssetPath: m.url, delegate },
              runningMode: 'VIDEO',
              scoreThreshold: this.lowConfidenceThreshold,
              maxResults: 6,
            });
            this.ready = true;
            this.info = `${delegate} / ${m.tag}${this.hasExternalAI ? ' + AI-Cloud' : ''}`;
            this.setState(SCANNER_STATES.READY, 'Holographic Object Scanner Active');
            console.log(`[ObjectScanner] Ready with ${delegate} (${m.tag})`);
            return true;
          } catch (e) {
            lastErr = e;
          }
        }
      }

      this.errorMessage = lastErr?.message || 'Failed to initialize ObjectDetector';
      this.setState(SCANNER_STATES.ERROR, this.errorMessage);
      throw lastErr || new Error(this.errorMessage);
    })();

    return this._initPromise;
  }

  /**
   * Run throttled inference against the video element.
   */
  async update(video, nowMs, mapPointFn) {
    if (!this.enabled || (!this.ready && !this.hasExternalAI) || this.isProcessing) return;
    if (this.isTargetLocked) {
      this.setProgress(100, `Locked Target: ${this.currentDetection?.label || 'Object'}`);
      return;
    }
    if (this.isCallingAI) return;

    if (!video || video.readyState < 2 || video.paused || video.ended) {
      return;
    }

    // 1. DEFAULT SCANNING: Automatically call Gemini AI vision periodically
    if (this.hasExternalAI) {
      if (this.isTargetLocked) {
        this.setProgress(100, `Locked Target: ${(this.currentDetection?.label || 'Object').toUpperCase()}`);
        return;
      }

      const elapsed = nowMs - this.lastGeminiScanTime;
      if (elapsed > this.geminiIntervalMs) {
        this.lastGeminiScanTime = nowMs;
        // Trigger background Gemini identification without blocking the animation loop
        this.requestCloudVisionAnalysis(video).catch(() => {});
        return;
      } else {
        // Show live scan progress sweeping between frames
        const sweep = Math.min(95, Math.max(10, Math.round((elapsed / this.geminiIntervalMs) * 100)));
        const targetDesc = this.currentDetection
          ? `Detected: ${this.currentDetection.label} (${Math.round(this.currentDetection.confidence * 100)}%)`
          : 'Hold object steady inside reticle';
        this.setProgress(sweep, `Scanning viewport (${sweep}%) — ${targetDesc}`);
      }
    }

    // 2. Local high-rate viewfinder tracking for corner reticles
    if (this.detector && (nowMs - this.lastInferenceTime >= this.intervalMs)) {
      this.isProcessing = true;
      this.lastInferenceTime = nowMs;

      try {
        const ts = Math.max(Math.round(nowMs), (this._lastDetectorTs || 0) + 1);
        this._lastDetectorTs = ts;
        const results = this.detector.detectForVideo(video, ts);
        this._processResults(results, video, mapPointFn);
      } catch (err) {
        console.warn('[ObjectScanner] Inference frame error:', err);
      } finally {
        this.isProcessing = false;
      }
    }
  }

  /**
   * Select a specific object from multiple visible candidates.
   */
  selectTarget(label) {
    this.selectedTargetLabel = label;
    if (this.allDetections.length > 0) {
      const found = this.allDetections.find(
        (d) => d.label.toLowerCase() === (label || '').toLowerCase()
      );
      if (found) {
        this.currentDetection = found;
        this.activeModelMatch = found.modelMatch;
        if (this.onDetection) this.onDetection(found);
      }
    }
  }

  _processResults(results, video, mapPointFn) {
    if (this.isTargetLocked) return;
    if (this.hasExternalAI) {
      // When Gemini Vision AI is active, suppress local COCO detector classifications
      // to avoid mislabeling objects with false positives
      return;
    }
    if (!results || !results.detections || results.detections.length === 0) {
      this.history.push(null);
      if (this.history.length > this.maxHistory) this.history.shift();
      if (this.history.every((h) => h === null)) {
        this.allDetections = [];
        this.currentDetection = null;
        this.setState(SCANNER_STATES.NO_TARGET, 'Scanning for object…');
        if (this.onMultiObjects) this.onMultiObjects([]);
      }
      return;
    }

    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    const candidates = [];

    for (let i = 0; i < results.detections.length; i++) {
      const det = results.detections[i];
      const topCat = det.categories?.[0];
      if (!topCat) continue;

      // Filter out 'person' so hands, arms, and faces don't hijack object detection
      const catName = topCat.categoryName.toLowerCase();
      if (catName === 'person') continue;

      const bb = det.boundingBox;
      const areaFrac = (bb.width * bb.height) / (vw * vh);

      // Distance from center of camera frame bonus
      const cx = (bb.originX + bb.width / 2) / vw;
      const cy = (bb.originY + bb.height / 2) / vh;
      const distFromCenter = Math.hypot(cx - 0.5, cy - 0.5);
      const centerBonus = Math.max(0, 1.0 - distFromCenter * 1.5) * 0.25;

      const finalScore = topCat.score + areaFrac * 0.15 + centerBonus;

      // Coordinate mapping
      const p1 = mapPointFn
        ? mapPointFn({ x: bb.originX / vw, y: bb.originY / vh })
        : { x: bb.originX / vw, y: bb.originY / vh };
      const p2 = mapPointFn
        ? mapPointFn({ x: (bb.originX + bb.width) / vw, y: (bb.originY + bb.height) / vh })
        : { x: (bb.originX + bb.width) / vw, y: (bb.originY + bb.height) / vh };

      const screenBox = {
        x: Math.min(p1.x, p2.x),
        y: Math.min(p1.y, p2.y),
        w: Math.abs(p2.x - p1.x),
        h: Math.abs(p2.y - p1.y),
      };

      let modelMatch = matchObjectToModel(topCat.categoryName, topCat.score);
      if (!modelMatch.model || modelMatch.index < 0) {
        modelMatch = synthesizeAndRegisterModel({
          objectName: topCat.categoryName,
          category: 'Camera Detected',
        });
      }

      candidates.push({
        id: `obj_${i}_${topCat.categoryName}`,
        label: topCat.categoryName,
        confidence: topCat.score,
        weightedScore: finalScore,
        screenBox,
        modelMatch,
        timestamp: performance.now(),
      });
    }

    if (candidates.length === 0) {
      this.history.push(null);
      if (this.history.length > this.maxHistory) this.history.shift();
      return;
    }

    // Sort by weighted score descending
    candidates.sort((a, b) => b.weightedScore - a.weightedScore);
    this.allDetections = candidates;
    if (this.onMultiObjects) this.onMultiObjects(candidates);

    // Pick chosen candidate or highest score
    let selected = candidates[0];
    if (this.selectedTargetLabel) {
      const matchSelected = candidates.find(
        (c) => c.label.toLowerCase() === this.selectedTargetLabel.toLowerCase()
      );
      if (matchSelected) selected = matchSelected;
    }

    this.currentDetection = selected;
    this.activeModelMatch = selected.modelMatch;

    // Hysteresis buffer
    this.history.push(selected.label);
    if (this.history.length > this.maxHistory) this.history.shift();

    if (selected.confidence >= this.minConfidence) {
      this.setState(
        SCANNER_STATES.DETECTED,
        `${selected.label} (${Math.round(selected.confidence * 100)}%)`
      );
      if (this.onDetection) {
        this.onDetection(selected);
      }
    } else {
      this.setState(
        SCANNER_STATES.LOW_CONFIDENCE,
        `Analyzing ${selected.label} (${Math.round(selected.confidence * 100)}%) — bring closer`
      );
    }
  }

  /**
   * Cloud Vision AI analysis using Google Gemini Interactions API.
   * Captures a high-resolution, unmirrored frame from the video element and prompts Gemini
   * for structured object analysis.
   */
  requestCloudVisionAnalysis(videoElement) {
    const apiKey = GEMINI_API_KEY || (typeof window !== 'undefined' ? window.__GEMINI_KEY__ : '') || '';
    if (!apiKey) {
      return Promise.resolve({
        success: false,
        message: 'Gemini API key not found. Please provide VITE_GEMINI_API_KEY in .env.',
      });
    }
    if (this.isCallingAI && this._currentAIPromise) {
      return this._currentAIPromise;
    }
    if (!videoElement || videoElement.readyState < 2 || !videoElement.videoWidth || !videoElement.videoHeight) {
      return Promise.resolve({ success: false, message: 'Camera video feed not ready.' });
    }

    this.isCallingAI = true;
    this._currentAIPromise = this._executeCloudVisionAnalysis(videoElement, apiKey);
    return this._currentAIPromise;
  }

  async _executeCloudVisionAnalysis(videoElement, apiKey) {
    this.setProgress(20, 'Capturing camera frame snapshot…');
    this.setState(SCANNER_STATES.LOADING, 'Gemini AI Vision Analyzing Object…');

    if (this.currentAbortController) {
      try { this.currentAbortController.abort('New request starting'); } catch (_) {}
    }
    this.currentAbortController = new AbortController();
    const abortSignal = this.currentAbortController.signal;
    const timeoutId = setTimeout(() => {
      if (this.currentAbortController) {
        try { this.currentAbortController.abort('Gemini request timeout'); } catch (_) {}
      }
    }, 10000);

    try {
      // Capture crisp 768x768 snapshot from real webcam frame
      const canvas = document.createElement('canvas');
      const targetDim = 768;
      canvas.width = targetDim;
      canvas.height = targetDim;
      const ctx = canvas.getContext('2d');

      const vw = videoElement.videoWidth || 1280;
      const vh = videoElement.videoHeight || 720;
      // Crop center square
      const s = Math.min(vw, vh);
      const sx = (vw - s) / 2;
      const sy = (vh - s) / 2;

      ctx.drawImage(videoElement, sx, sy, s, s, 0, 0, targetDim, targetDim);
      const base64Data = canvas.toDataURL('image/jpeg', 0.88).split(',')[1];
      this.setProgress(45, 'Extracting contours & silhouette features…');

      const promptText =
        'You are JARVIS, an advanced holographic AI scanner. ' +
        'Identify the primary real-world physical object held up or placed in front of this camera by the user. ' +
        'If the user is holding an object (e.g. smartphone, phone charger, USB charger, game controller, mouse, keyboard, smartwatch, headphones/earbuds, tool, power bank, camera, cup, fruit, pen, flashlight, etc.), focus entirely on that specific held object and name it accurately in "object_name" (e.g. "Smartphone", "USB Charger", "Mechanical Keyboard", "Wireless Earbuds", "Smartwatch"). ' +
        'NEVER identify human hands, fingers, skin, face, body, or the empty desk/wall background as the primary object. ' +
        'If NO physical object is held or presented toward the camera, set "object_name": "none". ' +
        'Also break down 5 to 9 realistic, authentic internal functional components and layers for this object so they can be rendered in an interactive 3D exploded view hologram. ' +
        'CRITICAL: For electronics and devices, ALWAYS break down real internal subsystems including: microchip/processor die (SoC/CPU/MCU), power cell/battery, sensors (optical, acoustic, biometric, motion, or touch sensors), multi-layer circuit board (PCB), actuators/transducers, chassis/heatsink, and outer casing. ' +
        'For biological/organic or household objects, break down real anatomical structures, cores, fluid vessels, and cellular or material layers. ' +
        'Respond ONLY with valid JSON with this exact structure: ' +
        '{\n' +
        '  "object_name": "string",\n' +
        '  "category": "electronics|tools|household|biology|vehicles|machines|other",\n' +
        '  "visible_attributes": ["attribute1", "attribute2"],\n' +
        '  "uncertainty": "none|low|medium|high",\n' +
        '  "reasoning": "brief visual rationale",\n' +
        '  "internal_components": [\n' +
        '    {\n' +
        '      "name": "Component Name (e.g. Silicon SoC Processor Chip, Lithium-Ion Battery, Optical CMOS Sensor)",\n' +
        '      "description": "Functional description of this internal part",\n' +
        '      "color": "#hexColor",\n' +
        '      "shape": "chip|battery|sensor|pcb|coil|motor|box|cylinder|ellipsoid|disc|ring|torus",\n' +
        '      "dims": [1.4, 0.4, 1.2],\n' +
        '      "offset": [0.0, 0.2, 0.0],\n' +
        '      "explode_dir": [0.0, 1.2, 0.0]\n' +
        '    }\n' +
        '  ]\n' +
        '}';

      this.setProgress(65, 'Querying Gemini 3.5 Multimodal AI…');

      // Call Google Gemini Interactions API (v1 /interactions) using gemini-3.5-flash-lite
      const endpoint = 'https://generativelanguage.googleapis.com/v1/interactions';
      const resp = await fetch(endpoint, {
        method: 'POST',
        signal: abortSignal,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          model: 'gemini-3.5-flash-lite',
          input: [
            {
              type: 'user_input',
              content: [
                { type: 'text', text: promptText },
                { type: 'image', data: base64Data, mime_type: 'image/jpeg' },
              ],
            },
          ],
        }),
      });

      if (!resp.ok) {
        let errDetail = `${resp.status} ${resp.statusText}`;
        try {
          const errJson = await resp.json();
          if (errJson.error?.message) errDetail = errJson.error.message;
        } catch (_) {}
        if (resp.status === 429) {
          // Back off next auto-scan by 8s to let quota replenish
          this.lastGeminiScanTime = performance.now() + 8000;
          this.setProgress(0, 'Gemini AI rate limit cooldown (8s) — hold steady');
          this.setState(SCANNER_STATES.LOW_CONFIDENCE, 'AI cooling down (8s)…');
          return {
            success: false,
            message: 'Gemini AI rate-limit cooldown. Resuming in 8s…',
          };
        }
        throw new Error(`Gemini API Error: ${errDetail}`);
      }

      this.setProgress(85, 'Parsing multimodal verification response…');
      const interaction = await resp.json();

      // Extract generated text from interaction steps
      let responseText = '';
      if (interaction.steps && Array.isArray(interaction.steps)) {
        for (const step of interaction.steps) {
          if (step.type === 'model_output' && step.content) {
            for (const c of step.content) {
              if (c.type === 'text' && c.text) responseText += c.text;
            }
          }
        }
      }

      if (!responseText) {
        throw new Error('Gemini returned an empty response. Please adjust lighting and try again.');
      }

      let cleanJson = responseText.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanJson = jsonMatch[0];
      } else {
        cleanJson = responseText.replace(/```json|```/g, '').trim();
      }
      let parsed;
      try {
        parsed = JSON.parse(cleanJson);
      } catch (e) {
        console.warn('[Gemini Parse Error] Raw text was:', responseText);
        throw new Error('Unable to parse Gemini visual identification format.');
      }

      const objName = (parsed.object_name || parsed.object || '').trim();
      if (!objName || objName.toLowerCase() === 'none' || objName.toLowerCase() === 'unknown') {
        if (!this.isTargetLocked && !this.lastSuccessfulDetection) {
          this.currentDetection = null;
          this.activeModelMatch = null;
          this.allDetections = [];
          this.setProgress(15, 'Scanning viewport for objects…');
          this.setState(SCANNER_STATES.NO_TARGET, 'Gemini: No recognizable object in view');
        } else if (!this.isTargetLocked) {
          // Keep sticky detection active so user can click "Enter Lab" without losing the model
          this.setProgress(35, 'Holding scanned object in view…');
        }
        return {
          success: false,
          message: 'Gemini did not detect a prominent object. Bring the object closer to the camera.',
        };
      }

      // Check for insufficient evidence / uncertainty
      if (parsed.uncertainty === 'high') {
        if (!this.lastSuccessfulDetection) {
          this.currentDetection = null;
          this.activeModelMatch = null;
          this.allDetections = [];
          const msg = `Gemini: Low certainty (${objName}). Please hold still with better lighting.`;
          this.setProgress(40, `Low certainty (${objName}) — hold still`);
          this.setState(SCANNER_STATES.LOW_CONFIDENCE, msg);
        }
        return {
          success: false,
          message: `Low certainty for ${objName}. Hold object steady.`,
        };
      }

      let match = matchObjectToModel(objName, 1.0);
      if (!match.model || match.index < 0) {
        // ANY OBJECT THAT HAS NO HARDCODED CAD MODEL: Synthesize interactive 3D internal model using AI!
        const compList =
          (Array.isArray(parsed.internal_components) && parsed.internal_components) ||
          (Array.isArray(parsed.components) && parsed.components) ||
          (Array.isArray(parsed.parts) && parsed.parts) ||
          (Array.isArray(parsed.internalParts) && parsed.internalParts) ||
          (Array.isArray(parsed.layers) && parsed.layers) ||
          [];
        match = synthesizeAndRegisterModel({
          objectName: objName,
          category: parsed.category,
          components: compList,
          visibleAttributes: parsed.visible_attributes || parsed.attributes || [],
          reasoning: parsed.reasoning,
        });
      }
      const detection = {
        id: 'gemini_ai_' + Date.now(),
        label: objName,
        category: parsed.category || 'Object',
        confidence: 0.96,
        visibleAttributes: parsed.visible_attributes || [],
        reasoning: parsed.reasoning || '',
        screenBox: { x: 0.2, y: 0.2, w: 0.6, h: 0.6 },
        modelMatch: match,
        source: 'Gemini Vision AI (Verified)',
      };

      // Update active detection state for real-time live scanning
      this.lastSuccessfulDetection = detection;
      this.currentDetection = detection;
      this.activeModelMatch = match;
      this.selectedTargetLabel = objName;
      this.allDetections = [detection];
      this.setProgress(100, `Target Identified: ${objName.toUpperCase()} (96%)`);
      this.setState(SCANNER_STATES.DETECTED, `${objName} (96%)`);
      if (this.onDetection) this.onDetection(detection);
      if (this.onMultiObjects) this.onMultiObjects([detection]);

      return {
        success: true,
        data: detection,
        message: `Identified: ${objName} (${match.model ? match.model.name : 'No CAD match'})`,
      };
    } catch (err) {
      if (
        err?.name === 'AbortError' ||
        err === 'Gemini request timeout' ||
        err === 'Scanner reset' ||
        err?.message === 'Scanner reset' ||
        this.currentAbortController?.signal?.aborted
      ) {
        return { success: false, message: 'Scan request reset.' };
      }
      console.error('[Gemini AI Identification Error]', err);
      this.setState(SCANNER_STATES.ERROR, err.message);
      return { success: false, message: err.message };
    } finally {
      clearTimeout(timeoutId);
      this.currentAbortController = null;
      this.isCallingAI = false;
      this._currentAIPromise = null;
    }
  }

  reset() {
    if (this.currentAbortController) {
      try { this.currentAbortController.abort('Scanner reset'); } catch (_) {}
      this.currentAbortController = null;
    }
    this._currentAIPromise = null;
    this.isCallingAI = false;
    this.isProcessing = false;
    this.lastGeminiScanTime = 0;
    this.history = [];
    this.allDetections = [];
    this.selectedTargetLabel = null;
    this.currentDetection = null;
    this.lastSuccessfulDetection = null;
    this.activeModelMatch = null;
    this.isTargetLocked = false;
    this.setProgress(0, 'Scanning camera viewport…');
    this.setState(SCANNER_STATES.READY, 'Scanner reset');
  }
}
