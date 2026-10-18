import './styles.css';
import { HoloScene } from './scene.js';
import {
  MODELS,
  VERIFICATION_STATUS,
  VERIFICATION_LABELS,
  registerCustomModel,
} from './models/index.js';
import { HandTracker } from './handTracking.js';
import { GestureEngine, HAND_CONNECTIONS } from './gestureEngine.js';
import { ObjectScanner, SCANNER_STATES } from './objectDetection.js';
import { ScannerHUD } from './hudOverlay.js';
import { loadGltfFromBuffer } from './gltfLoaderHelper.js';
import { synthesizeAndRegisterModel } from './models/aiSynthesizer.js';
import { clamp } from './utils.js';

const $ = (id) => document.getElementById(id);
const video = $('video');
const fxCanvas = $('fx');
const ctx = fxCanvas.getContext('2d');
const banner = $('banner');

let W = innerWidth,
  H = innerHeight,
  DPR = 1;
function sizeFx() {
  W = innerWidth;
  H = innerHeight;
  DPR = Math.min(devicePixelRatio || 1, 2);
  fxCanvas.width = W * DPR;
  fxCanvas.height = H * DPR;
}
sizeFx();
addEventListener('resize', sizeFx);

function showBanner(msg, info = false) {
  banner.textContent = msg;
  banner.className = info ? 'info' : '';
  banner.style.display = msg ? 'block' : 'none';
}
let toastTimer = 0;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
}

// ------------------------------------------------------------------ scene + UI
let scene;
try {
  scene = new HoloScene($('scene'), MODELS);
} catch (e) {
  console.error(e);
  showBanner('WebGL is not available. Use a current Chrome, Edge or Firefox with hardware acceleration on.');
  throw e;
}

const ui = { skeleton: true, labels: true, feed: true };
let trackingState = 'Off';
let viewMode = 'internal'; // 'internal' | 'external'
let autoSync = true;
let currentPage = 'scanner'; // 'scanner' | 'lab'
let activeSelectedModelIndex = scene.index >= 0 ? scene.index : 0;

// Calibration & sensitivity settings
let sensRot = 1.0;
let sensExp = 1.0;
let sensPinch = 0.32;
let trackingPaused = false;

// scanner and HUD
const scanner = new ObjectScanner();
const scannerHud = new ScannerHUD();
if (typeof window !== 'undefined') {
  window.scanner = scanner;
  window.scene = scene;
  window.__synthesizeAndRegisterModel = synthesizeAndRegisterModel;
}

// ------------------------------------------------------------------ Page Switching Logic
function resetScannerUI() {
  scanner.unlockTarget();
  const vfTarget = $('vf-target');
  if (vfTarget) vfTarget.textContent = 'HOLD AN OBJECT TO CAMERA';
  const vfConf = $('vf-conf-val');
  if (vfConf) vfConf.textContent = '0%';
  const vfMeter = $('vf-meter-fill');
  if (vfMeter) vfMeter.style.width = '0%';
  const vfMatch = $('vf-match-val');
  if (vfMatch) vfMatch.textContent = 'Scanning…';
  const pill = $('vf-status-pill');
  if (pill) {
    pill.textContent = 'SEARCHING';
    pill.className = 'status-pill';
  }
  const vfNote = $('vf-note');
  if (vfNote) vfNote.textContent = 'Hold any object inside the camera viewport.';
  const list = $('vf-targets-list');
  if (list) list.innerHTML = '<span class="empty-hint">Scanning viewport for objects…</span>';
  const progText = $('vf-progress-text');
  if (progText) progText.textContent = 'LIVE SCAN: 0% — Ready to scan';
  const hudText = $('vf-hud-text');
  if (hudText) hudText.textContent = 'AI SCANNER LIVE — POINT CAMERA AT OBJECT';
  document.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
}

function setPage(page) {
  currentPage = page;
  document.body.className = page === 'scanner' ? 'mode-scanner feed' : 'mode-lab feed';

  const tabScanner = $('tab-scanner');
  const tabLab = $('tab-lab');
  if (tabScanner) tabScanner.classList.toggle('active', page === 'scanner');
  if (tabLab) tabLab.classList.toggle('active', page === 'lab');

  if (page === 'scanner') {
    scanner.enabled = true;
    resetScannerUI();
    viewMode = 'external';
    scene.setVisible(false);
    if (camOn && video && video.paused) {
      video.play().catch(console.warn);
    }
    toast('Scanner Active — Point at any object');
  } else {
    scanner.enabled = false;
    viewMode = 'internal';
    scene.setVisible(true);
    sizeFx();
    scene.resize();
    scene.scatter = 0;
    scene.scatterTarget = 0;
    scene.uniforms.uScatter.value = 0;

    // Automatically expand to exploded view upon entering lab to reveal internal parts
    scene.explodeTarget = 0.55;
    const rExp = $('r-explode');
    if (rExp) rExp.value = 55;

    const det = scanner.currentDetection || scanner.lastSuccessfulDetection;
    const targetMatch = det?.modelMatch;
    const targetIdx = targetMatch && targetMatch.index >= 0 ? targetMatch.index : activeSelectedModelIndex;
    if (targetIdx >= 0) {
      activeSelectedModelIndex = targetIdx;
      scene.clearCache(targetIdx);
      scene.setModel(targetIdx, true);
      buildModelSelectors();
    }
    if (!tracker.ready) {
      tracker.init().then(() => setTracking('Hands on', 'ok')).catch(console.warn);
    }
    toast('Entered 3D Hologram Lab');
  }
}

// Navigation Tabs
$('tab-scanner')?.addEventListener('click', () => setPage('scanner'));
$('tab-lab')?.addEventListener('click', async () => {
  if (!camOn) await startCamera();
  let det = scanner.currentDetection || scanner.lastSuccessfulDetection;
  if (!det) {
    toast('⚡ Scanning object in view with AI… Hold steady!');
    showBanner('AI Scanner analyzing object in view… Please hold object steady.', true);
    const scanRes = await scanner.requestCloudVisionAnalysis(video);
    showBanner('');
    if (scanRes.success && scanRes.data) {
      det = scanRes.data;
      toast(`Identified: ${det.label}`);
    } else {
      toast(scanRes.message || 'No object identified. Hold object closer to camera.');
      return;
    }
  }
  if (det) {
    scanner.lockTarget(det);
    if (det.modelMatch && det.modelMatch.index >= 0) {
      activeSelectedModelIndex = det.modelMatch.index;
      scene.clearCache(det.modelMatch.index);
    }
  }
  setPage('lab');
});

// CTA Buttons
$('btn-enter-lab')?.addEventListener('click', async () => {
  if (!camOn) {
    await startCamera();
  }
  let det = scanner.currentDetection || scanner.lastSuccessfulDetection;
  if (!det) {
    toast('⚡ Scanning object in view with AI… Hold steady!');
    showBanner('AI Scanner analyzing object in view… Please hold object steady.', true);
    const scanRes = await scanner.requestCloudVisionAnalysis(video);
    showBanner('');
    if (scanRes.success && scanRes.data) {
      det = scanRes.data;
      toast(`Identified: ${det.label}`);
    } else {
      toast(scanRes.message || 'No object identified. Hold object closer to camera or select a preset.');
      return;
    }
  }
  if (det) {
    scanner.lockTarget(det);
    if (det.modelMatch && det.modelMatch.index >= 0) {
      activeSelectedModelIndex = det.modelMatch.index;
      scene.clearCache(det.modelMatch.index);
    }
  }
  setPage('lab');
});
$('btn-back-to-scanner')?.addEventListener('click', () => {
  setPage('scanner');
  scanner.lastGeminiScanTime = performance.now() - 2500;
  toast('Ready to scan next object — point camera at object');
});

// Clear / Rescan button
$('btn-reset-scan')?.addEventListener('click', () => {
  resetScannerUI();
  toast('Scanner reset — hold object steady in reticle');
  setTimeout(() => {
    if (camOn && video && video.readyState >= 2 && currentPage === 'scanner') {
      scanner.requestCloudVisionAnalysis(video).catch(console.warn);
    }
  }, 1000);
});

// 1-Click Category Preset Buttons in Scanner Room
document.querySelectorAll('.preset-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    const targetKey = btn.dataset.id;
    let targetIdx = MODELS.findIndex((m) => m.id === targetKey);
    // Map preset to corresponding model in MODEL_REGISTRY
    if (targetIdx < 0) {
      if (targetKey === 'gamepad') targetIdx = MODELS.findIndex((m) => m.id === 'gamepad' || m.tags.includes('gamepad'));
      else if (targetKey === 'keyboard') targetIdx = MODELS.findIndex((m) => m.id === 'keyboard' || m.tags.includes('keyboard'));
      else if (targetKey === 'phone') targetIdx = MODELS.findIndex((m) => m.id === 'phone' || (m.category === 'Electronics' && m.name.toLowerCase().includes('phone')));
      else if (targetKey === 'laptop') targetIdx = MODELS.findIndex((m) => m.id === 'laptop' || (m.category === 'Electronics' && m.name.toLowerCase().includes('laptop')));
      else if (targetKey === 'mouse') targetIdx = MODELS.findIndex((m) => m.id === 'mouse' || (m.category === 'Electronics' && m.name.toLowerCase().includes('mouse')));
      else if (targetKey === 'bottle') targetIdx = MODELS.findIndex((m) => m.id === 'bottle' || m.category === 'Containers' || m.category === 'Household');
      else if (targetKey === 'plant') targetIdx = MODELS.findIndex((m) => m.id === 'plant' || m.category === 'Nature' || m.category === 'Biology');
      else if (targetKey === 'car') targetIdx = MODELS.findIndex((m) => m.id === 'car' || m.name.toLowerCase().includes('car'));
      else if (targetKey === 'jet') targetIdx = MODELS.findIndex((m) => m.id === 'jet' || m.name.toLowerCase().includes('jet'));
      else if (targetKey === 'brain') targetIdx = MODELS.findIndex((m) => m.id === 'brain' || m.name.toLowerCase().includes('brain'));
    }

    if (targetIdx >= 0) {
      activeSelectedModelIndex = targetIdx;
      scene.setModel(targetIdx, true);
      const mod = MODELS[targetIdx];

      // Lock this preset into the scanner so local detector doesn't wipe it out
      scanner.lockTarget({
        id: `preset_${mod.id}`,
        label: mod.name,
        confidence: 1.0,
        screenBox: { x: 0.25, y: 0.25, w: 0.5, h: 0.5 },
        modelMatch: {
          model: mod,
          index: targetIdx,
          status: mod.status,
          matchType: 'EXACT',
          explanation: mod.note || `Loaded ${mod.name}.`,
        },
        source: 'Preset Selection',
      });

      $('vf-target').textContent = mod.name.toUpperCase();
      $('vf-match-val').textContent = mod.name;
      $('vf-conf-val').textContent = '100%';
      $('vf-meter-fill').style.width = '100%';
      const pill = $('vf-status-pill');
      if (pill) {
        pill.textContent = VERIFICATION_LABELS[mod.status] || 'PRESET LOADED';
        pill.className = `status-pill ${mod.status.toLowerCase()}`;
      }
      $('vf-note').textContent = mod.note || `Selected 3D preset: ${mod.name}. Click "Lock Object & Enter 3D Lab" to view.`;
      toast(`Preset selected: ${mod.name}`);
    }
  });
});

// Dynamic model selector & chips builder
const chips = $('chips');
const selModel = $('sel-model');

function buildModelSelectors() {
  if (selModel) {
    selModel.innerHTML = '';
    MODELS.forEach((m, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      const statusTag = m.status === VERIFICATION_STATUS.VERIFIED ? '✓ VERIFIED' : '⚡ ESTIMATED';
      opt.textContent = `${m.name} (${m.category}) [${statusTag}]`;
      selModel.appendChild(opt);
    });
    selModel.value = scene.index >= 0 ? scene.index : 0;
    selModel.onchange = (e) => {
      const idx = +e.target.value;
      activeSelectedModelIndex = idx;
      scene.setModel(idx, true);
    };
  }

  chips.innerHTML = '';
  for (const cat of [...new Set(MODELS.map((m) => m.category))]) {
    const grp = document.createElement('div');
    grp.className = 'grp';
    const gl = document.createElement('span');
    gl.className = 'gl';
    gl.textContent = cat;
    grp.appendChild(gl);
    MODELS.forEach((m, i) => {
      if (m.category !== cat) return;
      const b = document.createElement('button');
      b.textContent = m.name;
      b.dataset.i = i;
      b.onclick = () => {
        activeSelectedModelIndex = i;
        scene.setModel(i, true);
      };
      grp.appendChild(b);
    });
    chips.appendChild(grp);
  }
}
buildModelSelectors();

function updatePartlistActive(selIdx, hoverIdx) {
  const list = $('partlist');
  if (!list) return;
  const items = list.querySelectorAll('.partlist-item');
  items.forEach((item) => {
    const i = +item.dataset.i;
    item.classList.toggle('active', i === selIdx || (selIdx < 0 && i === hoverIdx));
  });
}

function buildPartlist(parts) {
  const container = $('partlist');
  if (!container) return;
  container.innerHTML = '';

  parts.forEach((p, idx) => {
    const item = document.createElement('div');
    item.className = 'partlist-item';
    item.dataset.i = idx;

    const dot = document.createElement('i');
    dot.style.background = p.color;

    const span = document.createElement('span');
    span.textContent = p.name;
    span.title = p.desc;

    // Component hierarchy action buttons
    const actions = document.createElement('div');
    actions.className = 'part-actions';

    const btnVis = document.createElement('button');
    btnVis.className = 'part-act-btn';
    btnVis.textContent = '👁';
    btnVis.title = 'Hide or Show component';
    btnVis.onclick = (e) => {
      e.stopPropagation();
      const visible = scene.togglePart(idx);
      item.classList.toggle('hidden-part', !visible);
    };

    const btnIso = document.createElement('button');
    btnIso.className = 'part-act-btn';
    btnIso.textContent = '🎯';
    btnIso.title = 'Isolate component';
    btnIso.onclick = (e) => {
      e.stopPropagation();
      scene.isolatePart(idx);
      container.querySelectorAll('.partlist-item').forEach((el, k) => {
        el.classList.toggle('hidden-part', k !== idx);
      });
      toast(`Isolated: ${p.name}`);
    };

    const btnReset = document.createElement('button');
    btnReset.className = 'part-act-btn';
    btnReset.textContent = '↺';
    btnReset.title = 'Reset component position';
    btnReset.onclick = (e) => {
      e.stopPropagation();
      scene.resetPart(idx);
    };

    actions.appendChild(btnVis);
    actions.appendChild(btnIso);
    actions.appendChild(btnReset);

    item.appendChild(dot);
    item.appendChild(span);
    item.appendChild(actions);

    item.onclick = () => {
      const newSel = scene.sel === idx ? -1 : idx;
      scene.setSel(newSel);
      showPart(newSel);
      updatePartlistActive(newSel, scene.hover);
    };

    container.appendChild(item);
  });
}

$('btn-show-all-parts').onclick = () => {
  scene.showAllParts();
  const list = $('partlist');
  if (list) list.querySelectorAll('.partlist-item').forEach((el) => el.classList.remove('hidden-part'));
  toast('All components visible');
};

$('btn-reset-all-parts').onclick = () => {
  scene.releaseAll();
  toast('Reset component positions');
};

scene.onModel = (i, def, g) => {
  activeSelectedModelIndex = i;
  $('m-name').textContent = def.name;
  $('m-sub').textContent = def.subtitle;
  $('m-cat').textContent = def.category;
  $('m-count').textContent = `${g.meta.length} parts`;

  // Update Page 2 Top Bar model title and badge
  const labModelTitle = $('lab-model-title');
  if (labModelTitle) labModelTitle.textContent = def.name;
  const labModelStatus = $('lab-model-status');
  if (labModelStatus) {
    labModelStatus.textContent = VERIFICATION_LABELS[def.status] || 'MODEL LOADED';
    labModelStatus.className = `status-pill ${def.status.toLowerCase()}`;
  }

  // Update chips and selector dropdown
  chips.querySelectorAll('button').forEach((b) => b.classList.toggle('active', +b.dataset.i === i));
  if (selModel) selModel.value = i;

  buildPartlist(g.meta);
  showPart(-1);
  toast(def.name);
};

// initial UI for model 0
scene.onModel(scene.index, MODELS[scene.index], scene.cache.get(scene.index));

function showPart(i) {
  const p = i >= 0 ? scene.parts[i] : null;
  $('pc-name').textContent = p ? p.name : 'No part selected';
  $('pc-desc').textContent = p ? p.desc : 'Point at a part, or click one, to read what it does.';
  $('pc-dot').style.background = p ? p.color : '#555a70';
  updatePartlistActive(scene.sel, i);
}

// Sliders
const rExplode = $('r-explode');
const rInt = $('r-int');
const rGlow = $('r-glow');
let draggingExplode = false;
rExplode.addEventListener('pointerdown', () => (draggingExplode = true));
addEventListener('pointerup', () => (draggingExplode = false));
rExplode.addEventListener('input', () => (scene.explodeTarget = rExplode.value / 100));
rInt.addEventListener('input', () => {
  scene.intensity = rInt.value / 100;
  $('v-int').textContent = rInt.value + '%';
});
if (rGlow) {
  rGlow.addEventListener('input', () => {
    scene.setHologramAlpha(rGlow.value / 100);
    $('v-glow').textContent = rGlow.value + '%';
  });
}

$('b-explode').onclick = () => (scene.explodeTarget = scene.explodeTarget > 0.5 ? 0 : 1);
$('b-spin').onclick = () => {
  scene.autoSpin = !scene.autoSpin;
  $('b-spin').classList.toggle('on', scene.autoSpin);
};
$('b-reset').onclick = () => {
  scene.resetView();
  showPart(-1);
};
$('b-next').onclick = () => scene.next();

// Toolbar toggles
function toggle(id, key, after) {
  $(id).onclick = () => {
    ui[key] = !ui[key];
    $(id).classList.toggle('on', ui[key]);
    after?.();
  };
}
toggle('t-feed', 'feed', () => document.body.classList.toggle('feed', ui.feed && camOn));
toggle('t-skel', 'skeleton');
toggle('t-labels', 'labels');

$('t-wire').onclick = () => {
  scene.setWireframe(!scene.wireframe);
  $('t-wire').classList.toggle('on', scene.wireframe);
  toast(scene.wireframe ? 'Holographic Wireframe: ON' : 'Holographic Wireframe: OFF');
};

$('t-calib').onclick = () => {
  $('calib-modal').classList.add('open');
};
$('calib-close').onclick = () => {
  $('calib-modal').classList.remove('open');
};
$('calib-modal').onclick = (e) => {
  if (e.target === $('calib-modal')) $('calib-modal').classList.remove('open');
};

// Calibration sliders
$('r-sens-rot').oninput = (e) => {
  sensRot = e.target.value / 100;
  $('v-sens-rot').textContent = sensRot.toFixed(1) + 'x';
};
$('r-sens-exp').oninput = (e) => {
  sensExp = e.target.value / 100;
  $('v-sens-exp').textContent = sensExp.toFixed(1) + 'x';
};
$('r-sens-pinch').oninput = (e) => {
  sensPinch = e.target.value / 100;
  $('v-sens-pinch').textContent = e.target.value < 25 ? 'High' : e.target.value > 35 ? 'Low' : 'Normal';
};
$('btn-pause-tracking').onclick = () => {
  trackingPaused = !trackingPaused;
  $('btn-pause-tracking').textContent = trackingPaused ? 'Resume Tracking' : 'Pause Tracking';
  $('c-track-status').textContent = trackingPaused ? 'Tracking Paused' : 'Hands Active';
  toast(trackingPaused ? 'Hand Tracking Paused' : 'Hand Tracking Resumed');
};

$('t-full').onclick = () =>
  document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();

// ------------------------------------------------------------------ JARVIS Scanner Controls
const btnViewMode = $('btn-view-mode');
if (btnViewMode) {
  btnViewMode.onclick = () => {
    viewMode = viewMode === 'internal' ? 'external' : 'internal';
    btnViewMode.textContent = viewMode === 'internal' ? 'View: Internals' : 'View: Scan Mode';
    btnViewMode.classList.toggle('on', viewMode === 'internal');
    scene.setVisible(viewMode === 'internal');
    toast(viewMode === 'internal' ? 'Internal 3D View' : 'External Camera Scanner');
  };
}

const btnAutoMatch = $('btn-auto-match');
if (btnAutoMatch) {
  btnAutoMatch.onclick = () => {
    autoSync = !autoSync;
    scanner.autoSwitchEnabled = autoSync;
    btnAutoMatch.classList.toggle('on', autoSync);
    btnAutoMatch.textContent = autoSync ? 'Auto-Sync' : 'Manual';
    toast(autoSync ? 'Auto-Sync: Enabled' : 'Auto-Sync: Disabled');
  };
}

async function triggerGeminiIdentification() {
  if (!camOn || !video) {
    toast('Camera not active. Requesting camera…');
    await startCamera();
    if (!camOn) return;
  }
  toast('Gemini AI analyzing scene…');
  showBanner('Gemini Multimodal AI analyzing object features, shapes, and materials…', true);
  const res = await scanner.requestCloudVisionAnalysis(video);
  showBanner('');
  if (res.success) {
    toast(`Gemini Identified: ${res.data.label}`);
    // If there is a matched 3D model, set it
    if (res.data.modelMatch?.index >= 0) {
      activeSelectedModelIndex = res.data.modelMatch.index;
      buildModelSelectors();
      scene.setModel(res.data.modelMatch.index, true);
    }
  } else {
    toast(res.message);
  }
}

$('btn-identify-gemini')?.addEventListener('click', triggerGeminiIdentification);
$('btn-identify-ai')?.addEventListener('click', triggerGeminiIdentification);

const btnAi = $('btn-ai-scan');
if (btnAi) {
  btnAi.onclick = triggerGeminiIdentification;
}

// Import GLTF/GLB Asset Handler
async function handleImportGlb(file) {
  if (!file) return;
  showBanner(`Importing 3D CAD asset "${file.name}"…`, true);
  try {
    const buffer = await file.arrayBuffer();
    const modelDef = await loadGltfFromBuffer(buffer, file.name);
    const newIdx = registerCustomModel(modelDef);
    scene.registerModel(modelDef);
    buildModelSelectors();
    scene.setModel(newIdx);
    showBanner('');
    toast(`Loaded 3D model: ${modelDef.name}`);
  } catch (err) {
    console.error(err);
    showBanner(`Failed to load 3D asset: ${err.message}`);
  }
}

const inputGlbScan = $('input-glb-scan');
if (inputGlbScan) {
  inputGlbScan.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImportGlb(e.target.files[0]);
    }
  });
}

// ------------------------------------------------------------------ Scanner Event Callbacks
scanner.onDetection = (data) => {
  const confPct = Math.round(data.confidence * 100);
  const targetLabel = data.label.toUpperCase();

  // Update Page 1 Scanner Room Elements
  const vfTarget = $('vf-target');
  if (vfTarget) vfTarget.textContent = `${targetLabel} (${confPct}%)`;
  const vfConfVal = $('vf-conf-val');
  if (vfConfVal) vfConfVal.textContent = `${confPct}%`;
  const vfMeterFill = $('vf-meter-fill');
  if (vfMeterFill) vfMeterFill.style.width = `${confPct}%`;

  const match = data.modelMatch;
  const vfMatchVal = $('vf-match-val');
  const vfStatusPill = $('vf-status-pill');
  const vfNote = $('vf-note');

  if (match && match.model) {
    if (vfMatchVal) vfMatchVal.textContent = match.model.name;
    if (vfStatusPill) {
      vfStatusPill.textContent = VERIFICATION_LABELS[match.status] || 'MATCHED';
      vfStatusPill.className = `status-pill ${match.status.toLowerCase()}`;
    }
    if (vfNote) vfNote.textContent = match.explanation;

    // Automatic model switching if matching 3D model found
    if (match.index >= 0) {
      activeSelectedModelIndex = match.index;
      buildModelSelectors();
      scene.setModel(match.index, true);
      // Highlight matching preset button
      document.querySelectorAll('.preset-btn').forEach((b) => {
        const id = b.dataset.id;
        b.classList.toggle(
          'active',
          id === match.model.id ||
          id === match.model.category.toLowerCase() ||
          (id === 'car' && match.model.id === 'car') ||
          (id === 'jet' && match.model.id === 'jet') ||
          (id === 'brain' && match.model.id === 'brain')
        );
      });
    }
  } else {
    if (vfMatchVal) vfMatchVal.textContent = 'No matching 3D CAD';
    if (vfStatusPill) {
      vfStatusPill.textContent = 'NO CAD ASSET';
      vfStatusPill.className = 'status-pill unmatched';
    }
    if (vfNote) {
      vfNote.textContent =
        data.modelMatch?.explanation || `No 3D internal model found for "${data.label}". Import a .GLB or pick a preset.`;
    }
  }
};

scanner.onMultiObjects = (candidates) => {
  const list = $('vf-targets-list');
  if (!list) return;
  list.innerHTML = '';
  if (candidates.length === 0) {
    list.innerHTML = '<span class="empty-hint">Scanning viewport for objects…</span>';
    return;
  }
  candidates.forEach((c) => {
    const chip = document.createElement('span');
    chip.className = `target-chip ${c.label === scanner.currentDetection?.label ? 'active' : ''}`;
    chip.textContent = `${c.label} (${Math.round(c.confidence * 100)}%)`;
    chip.onclick = (e) => {
      e.stopPropagation();
      scanner.selectTarget(c.label);
      toast(`Locked target: ${c.label}`);
    };
    list.appendChild(chip);
  });
};

scanner.onStateChange = (state, detail, detection) => {
  const badge = $('vf-badge');
  if (badge) {
    badge.textContent = state;
    badge.className = `badge ${
      state === SCANNER_STATES.DETECTED
        ? 'ok'
        : state === SCANNER_STATES.LOW_CONFIDENCE
        ? 'warn'
        : state === SCANNER_STATES.LOADING
        ? 'active'
        : ''
    }`;
  }
  if (!detection && state !== SCANNER_STATES.DETECTED && state !== SCANNER_STATES.LOW_CONFIDENCE) {
    const vfTarget = $('vf-target');
    if (vfTarget) vfTarget.textContent = detail || 'HOLD OBJECT TO CAMERA';
    const vfConfVal = $('vf-conf-val');
    if (vfConfVal) vfConfVal.textContent = '0%';
    const vfMeterFill = $('vf-meter-fill');
    if (vfMeterFill) vfMeterFill.style.width = '0%';
    const vfMatchVal = $('vf-match-val');
    if (vfMatchVal) vfMatchVal.textContent = 'Searching…';
    const vfStatusPill = $('vf-status-pill');
    if (vfStatusPill) {
      vfStatusPill.textContent = 'SEARCHING';
      vfStatusPill.className = 'status-pill';
    }
  }
};

scanner.onProgress = (pct, phase) => {
  const vfMeterFill = $('vf-meter-fill');
  if (vfMeterFill) vfMeterFill.style.width = `${pct}%`;
  const vfConfVal = $('vf-conf-val');
  if (vfConfVal && !scanner.isTargetLocked) vfConfVal.textContent = `${pct}%`;
  const vfProgText = $('vf-progress-text');
  if (vfProgText) vfProgText.textContent = `LIVE SCAN: ${pct}% — ${phase}`;
  const vfHudText = $('vf-hud-text');
  if (vfHudText) vfHudText.textContent = `AI SCANNER: ${phase.toUpperCase()}`;
};

// ------------------------------------------------------------------ camera + tracking
const tracker = new HandTracker();
const engine = new GestureEngine();
let camOn = false;
let perc = { hands: [] };

async function startCamera() {
  $('start').classList.add('gone');
  setTracking('Starting…', 'warn');
  if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
    enterMouseMode('Camera needs http://localhost or https.');
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    camOn = true;
    ui.feed = true;
    $('t-feed').classList.add('on');
    document.body.classList.add('feed');
  } catch (e) {
    console.warn(e);
    enterMouseMode(
      e && e.name === 'NotAllowedError'
        ? 'Camera permission denied. Allow it in the address bar and reload.'
        : 'No camera found.'
    );
    return;
  }

  setTracking('Loading AI models…', 'warn');
  try {
    await tracker.init();
    setTracking('Hands on', 'ok');
    showBanner('');
  } catch (e) {
    console.warn('[HandTracker Init Error]', e);
    enterMouseMode('Hand tracker loading issue. Mouse controls are on.');
  }

  // Initialize scanner in background without blocking hand tracking
  scanner.init().catch((e) => {
    console.warn('[Scanner Init Notice]', e);
  });
}

function enterMouseMode(msg) {
  setTracking('Mouse only', 'warn');
  if (msg) showBanner(msg + ' Mouse controls are on.', true);
}

function setTracking(text, cls) {
  trackingState = text;
  const el = $('s-track');
  el.textContent = text;
  el.className = cls || '';
}

$('btn-cam').onclick = startCamera;
$('btn-mouse').onclick = () => {
  $('start').classList.add('gone');
  enterMouseMode('');
};

// Automatically prompt/start camera on initial page load if supported
if (navigator.mediaDevices?.getUserMedia && window.isSecureContext) {
  // Proactively check permission or request camera
  navigator.mediaDevices
    .getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false })
    .then((stream) => {
      $('start')?.classList.add('gone');
      video.srcObject = stream;
      video.play().then(() => {
        camOn = true;
        ui.feed = true;
        $('t-feed')?.classList.add('on');
        document.body.classList.add('feed');
        setTracking('Loading AI models…', 'warn');
        tracker.init()
          .then(() => {
            setTracking('Hands on', 'ok');
            showBanner('');
          })
          .catch((e) => {
            console.warn('[HandTracker Autostart]', e);
          });
        scanner.init().catch((e) => {
          console.warn('[Scanner Autostart]', e);
        });
      });
    })
    .catch((err) => {
      // If browser requires explicit user gesture, keep Start modal visible
      console.log('[Camera Autostart]', err.message);
    });
}

/** raw camera landmark -> viewport 0..1 (mirrored, matches object-fit: cover) */
function mapPoint(p) {
  const vw = video.videoWidth || 1280,
    vh = video.videoHeight || 720;
  const s = Math.max(W / vw, H / vh);
  const ox = (W - vw * s) / 2,
    oy = (H - vh * s) / 2;
  return { x: ((1 - p.x) * vw * s + ox) / W, y: (p.y * vh * s + oy) / H };
}

// ------------------------------------------------------------------ gesture -> action
let zoomRef = null;
let grab = null;
let lastHover = { i: -1, t: 0 };
let dwell = { i: -1, t: 0 };
let peaceCool = 0;
const prevPalm = new Map();
let activeKey = '';

function setActive(key) {
  if (key === activeKey) return;
  activeKey = key;
  document.querySelectorAll('#gest li').forEach((li) => li.classList.toggle('active', li.dataset.g === key));
}

function endGrab() {
  if (grab) scene.releaseAll();
  grab = null;
}

function control(t, dt) {
  if (trackingPaused) {
    setActive('');
    return;
  }

  const live = perc.hands.filter((h) => !h.held);
  $('s-hands').textContent = String(live.length);

  // two hands: distance between palms = zoom
  if (live.length >= 2) {
    const a = live[0].palm,
      b = live[1].palm;
    const dist = Math.hypot((a.x - b.x) * W, (a.y - b.y) * H);
    if (!zoomRef) zoomRef = { d0: Math.max(60, dist), s0: scene.scaleTarget };
    scene.scaleTarget = clamp((zoomRef.s0 * dist) / zoomRef.d0, 0.5, 2.6);
    scene.holdVel = true;
    scene.idle = 0;
    endGrab();
    scene.setHover(-1);
    prevPalm.clear();
    setActive('TWO');
    return;
  }
  zoomRef = null;

  const h = live[0];
  if (!h) {
    endGrab();
    scene.holdVel = draggingMouse;
    if (!draggingMouse) scene.setHover(-1);
    prevPalm.clear();
    setActive('');
    return;
  }

  scene.holdVel = true;
  scene.idle = 0;
  const g = h.gesture;
  const palmPx = { x: h.palm.x * W, y: h.palm.y * H };

  if (g === 'OPEN' || g === 'FIST' || g === 'NONE') {
    // openness drives the explosion with sensitivity multiplier
    const rawExp = clamp((h.openness - 0.12) / 0.78, 0, 1);
    scene.explodeTarget = g === 'FIST' ? 0 : clamp(rawExp * sensExp, 0, 1);

    // moving the hand rotates the model with rotation sensitivity
    const prev = prevPalm.get(h.id);
    if (prev) {
      const dx = palmPx.x - prev.x,
        dy = palmPx.y - prev.y;
      if (Math.hypot(dx, dy) > 1.5) scene.rotateBy(dx * 0.0048 * sensRot, dy * 0.0032 * sensRot, dt);
    }
    if (h.rollDelta) scene.rollBy(h.rollDelta * 0.7 * sensRot);
    scene.setHover(-1);
    setActive(g === 'NONE' ? 'MOVE' : g);
    if (g === 'OPEN' && prev && Math.hypot(palmPx.x - prev.x, palmPx.y - prev.y) > 6) setActive('MOVE');
  } else {
    if (g === 'POINT') {
      const idx = scene.pick(h.tip.x * W, h.tip.y * H, 95);
      scene.setHover(idx);
      if (idx >= 0) {
        lastHover = { i: idx, t };
        showPart(idx);
      }
      if (idx >= 0 && idx === dwell.i) {
        dwell.t += dt;
        if (dwell.t > 0.7 && scene.sel !== idx) scene.setSel(idx);
      } else dwell = { i: idx, t: 0 };
    } else if (g === 'PINCH') {
      const pp = { x: h.pinchPt.x * W, y: h.pinchPt.y * H };
      if (!grab) {
        let idx = scene.pick(pp.x, pp.y, 170);
        if (idx < 0 && t - lastHover.t < 0.9) idx = lastHover.i;
        if (idx >= 0) {
          grab = { part: idx, last: pp };
          scene.setSel(idx);
          scene.setHover(idx);
          showPart(idx);
        }
      } else {
        scene.dragPart(grab.part, pp.x - grab.last.x, pp.y - grab.last.y);
        grab.last = pp;
      }
    } else if (g === 'PEACE') {
      if (t > peaceCool) {
        peaceCool = t + 1.6;
        scene.next();
      }
    }
    setActive(g);
  }
  if (g !== 'PINCH') endGrab();
  prevPalm.set(h.id, palmPx);
}

// ------------------------------------------------------------------ mouse + keyboard
let draggingMouse = false;
let mouseStart = null;
let mouseLast = null;
const onUi = (e) => e.target.closest && e.target.closest('#panel,#chips,#toolbar,#start,#calib-modal');

addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || onUi(e)) return;
  draggingMouse = true;
  mouseStart = mouseLast = { x: e.clientX, y: e.clientY };
});
addEventListener('pointermove', (e) => {
  if (!draggingMouse) return;
  scene.holdVel = true;
  scene.rotateBy((e.clientX - mouseLast.x) * 0.006 * sensRot, (e.clientY - mouseLast.y) * 0.004 * sensRot, 1 / 60);
  mouseLast = { x: e.clientX, y: e.clientY };
});
addEventListener('pointerup', (e) => {
  if (!draggingMouse) return;
  draggingMouse = false;
  scene.holdVel = false;
  if (Math.hypot(e.clientX - mouseStart.x, e.clientY - mouseStart.y) < 5) {
    const idx = scene.pick(e.clientX, e.clientY, 80);
    const newSel = idx === scene.sel ? -1 : idx;
    scene.setSel(newSel);
    showPart(newSel);
  }
});
addEventListener(
  'wheel',
  (e) => {
    if (onUi(e)) return;
    scene.zoomBy(Math.exp(-e.deltaY * 0.0012));
  },
  { passive: true }
);
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.key === ' ') {
    e.preventDefault();
    scene.explodeTarget = scene.explodeTarget > 0.5 ? 0 : 1;
  } else if (e.key === 'ArrowRight') scene.next(1);
  else if (e.key === 'ArrowLeft') scene.next(-1);
  else if (e.key.toLowerCase() === 'r') scene.resetView();
  else if (e.key.toLowerCase() === 'v') $('btn-view-mode')?.click();
  else if (e.key.toLowerCase() === 'w') $('t-wire')?.click();
  else if (e.key >= '1' && e.key <= String(MODELS.length)) scene.setModel(+e.key - 1);
});

// ------------------------------------------------------------------ overlay drawing
const ringR = new Map();

function drawHand(h) {
  const pts = h.lm.map((p) => ({ x: p.x * W, y: p.y * H }));
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(236, 232, 255, 0.78)';
  ctx.shadowColor = 'rgba(176, 164, 255, 0.95)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  for (const [a, b] of HAND_CONNECTIONS) {
    ctx.moveTo(pts[a].x, pts[a].y);
    ctx.lineTo(pts[b].x, pts[b].y);
  }
  ctx.stroke();
  ctx.fillStyle = '#fff';
  for (const p of pts) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawRing(h) {
  const pts = h.lm;
  const cx = h.palm.x * W,
    cy = h.palm.y * H;
  const g = h.gesture;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(242, 201, 76, 0.9)';
  ctx.shadowBlur = 14;
  if (g === 'POINT') {
    const x = h.tip.x * W,
      y = h.tip.y * H;
    ctx.strokeStyle = '#f2c94c';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (g === 'PINCH') {
    const x = h.pinchPt.x * W,
      y = h.pinchPt.y * H;
    ctx.strokeStyle = '#f2c94c';
    ctx.fillStyle = 'rgba(242, 201, 76, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    const len = Math.hypot((pts[0].x - pts[12].x) * W, (pts[0].y - pts[12].y) * H);
    const target = len * 0.95 + 22;
    const r = (ringR.get(h.id) ?? target) * 0.85 + target * 0.15;
    ringR.set(h.id, r);
    ctx.strokeStyle = 'rgba(242, 201, 76, 0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    // white arc = how far it is exploded
    const e = clamp(scene.explode, 0, 1);
    if (e > 0.01) {
      ctx.shadowColor = 'rgba(255,255,255,0.9)';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * e);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawZoom(a, b) {
  const x1 = a.palm.x * W,
    y1 = a.palm.y * H,
    x2 = b.palm.x * W,
    y2 = b.palm.y * H;
  ctx.save();
  ctx.strokeStyle = 'rgba(242, 201, 76, 0.85)';
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(242, 201, 76, 0.8)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#fff';
  ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowBlur = 6;
  ctx.fillText(`zoom ${scene.scale.toFixed(2)}x`, (x1 + x2) / 2, (y1 + y2) / 2 - 12);
  ctx.restore();
}

function drawLabels() {
  const e = clamp((scene.shownExplode - 0.1) / 0.3, 0, 1);
  if (e <= 0.01 || scene.uniforms.uScatter.value > 0.3) return;
  const pts = scene.labelPoints();
  const c = scene.centerScreen();
  const panelR = W > 900 ? 310 : 0;
  const left = [],
    right = [];
  for (const p of pts) (p.x < c.x ? left : right).push(p);
  const maxX = Math.max(...pts.map((p) => p.x), c.x);
  const minX = Math.min(...pts.map((p) => p.x), c.x);
  const colR = clamp(maxX + 80, panelR + 360, W - 170);
  const colL = clamp(minX - 80, panelR + 20, W - 400);
  ctx.save();
  ctx.globalAlpha = e;
  ctx.font = '500 12px ui-sans-serif, system-ui, "Segoe UI", sans-serif';
  ctx.textBaseline = 'middle';
  const place = (list, colX, dir) => {
    list.sort((a, b) => a.y - b.y);
    const ys = list.map((p) => p.y);
    for (let i = 1; i < ys.length; i++) if (ys[i] < ys[i - 1] + 20) ys[i] = ys[i - 1] + 20;
    const over = ys.length ? ys[ys.length - 1] - (H - 90) : 0;
    if (over > 0) for (let i = 0; i < ys.length; i++) ys[i] -= over;
    list.forEach((p, k) => {
      const hot = p.i === scene.hover || p.i === scene.sel;
      const ly = clamp(ys[k], 24, H - 24);
      ctx.strokeStyle = hot ? p.color : 'rgba(255,255,255,0.38)';
      ctx.lineWidth = hot ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(colX - dir * 16, ly);
      ctx.lineTo(colX, ly);
      ctx.stroke();
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, hot ? 4 : 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hot ? '#fff' : 'rgba(255,255,255,0.82)';
      ctx.font = `${hot ? 600 : 500} ${hot ? 13 : 12}px ui-sans-serif, system-ui, "Segoe UI", sans-serif`;
      ctx.textAlign = dir > 0 ? 'left' : 'right';
      ctx.fillText(p.name, colX + dir * 6, ly);
    });
  };
  place(right, colR, 1);
  place(left, colL, -1);
  ctx.restore();
}

function drawOverlay(dt) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);

  // In Scanner Mode: Only render the futuristic targeting HUD brackets around detected objects
  if (currentPage === 'scanner') {
    scannerHud.draw(ctx, W, H, scanner.currentDetection, scanner.allDetections, scanner.state, 'external', dt);
    return;
  }

  // In Lab Mode: Render 3D hologram labels, bare-hand skeleton, and gesture rings
  if (ui.labels) drawLabels();
  const live = perc.hands.filter((h) => !h.held);
  if (ui.skeleton) for (const h of live) drawHand(h);
  for (const h of live) drawRing(h);
  if (live.length >= 2) drawZoom(live[0], live[1]);
}

// ------------------------------------------------------------------ main loop
let lastT = performance.now() / 1000;
function frame(now) {
  const t = now / 1000;
  const dt = Math.min(0.05, Math.max(0.001, t - lastT));
  lastT = t;

  if (camOn && video.readyState >= 2) {
    // SEPARATE PAGE EXECUTION:
    // When on Scanner page: execute object detection inference ONLY (hand tracking paused)
    if (currentPage === 'scanner') {
      if ((scanner.ready || scanner.hasExternalAI) && scanner.enabled) {
        scanner.update(video, now, mapPoint);
      }
    } else {
      // When on Lab page: execute hand tracking ONLY (scanner paused to avoid overlaying and save performance)
      if (tracker.ready && !trackingPaused) {
        const hands = tracker.detect(video, now);
        perc = engine.update(hands, t, mapPoint, (video.videoWidth || 16) / (video.videoHeight || 9));
      }
    }
  }

  // Only run hand gesture control if on the 3D lab page
  if (currentPage === 'lab') {
    control(t, dt);

    if (!draggingExplode) rExplode.value = Math.round(clamp(scene.explode, 0, 1) * 100);
    $('v-explode').textContent = Math.round(clamp(scene.explode, 0, 1) * 100) + '%';
    $('b-explode').textContent = scene.explodeTarget > 0.5 ? 'Assemble' : 'Explode';
  }

  scene.update(dt, t);
  drawOverlay(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
