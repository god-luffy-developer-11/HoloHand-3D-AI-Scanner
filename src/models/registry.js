import { buildJet } from './jet.js';
import { buildRadial } from './radial.js';
import { buildCar } from './car.js';
import { buildBrain } from './brain.js';
import { buildPhone } from './phone.js';
import { buildLaptop } from './laptop.js';
import { buildMouse } from './mouse.js';
import { buildBottle } from './bottle.js';
import { buildPlant } from './plant.js';
import { buildGamepad } from './gamepad.js';
import { buildKeyboard } from './keyboard.js';
import { buildGenericMech } from './generic.js';

export const VERIFICATION_STATUS = {
  VERIFIED: 'VERIFIED',
  ESTIMATED: 'ESTIMATED',
  CUSTOM: 'CUSTOM',
};

export const VERIFICATION_LABELS = {
  [VERIFICATION_STATUS.VERIFIED]: 'VERIFIED ACCURATE',
  [VERIFICATION_STATUS.ESTIMATED]: 'ESTIMATED / CONCEPTUAL — NOT VERIFIED',
  [VERIFICATION_STATUS.CUSTOM]: 'USER IMPORTED MODEL',
};

export const MODEL_REGISTRY = [
  // --- VERIFIED ACCURATE MODELS (PRESERVED) ---
  {
    id: 'jet',
    name: 'Turbofan Jet Engine',
    category: 'Machines',
    subtitle: 'Fan, compressors, combustor, turbines, nozzle',
    view: { x: 0.28, y: -0.55, z: 0 },
    build: buildJet,
    status: VERIFICATION_STATUS.VERIFIED,
    source: 'Precision CAD Point-Cloud',
    tags: ['airplane', 'aeroplane', 'plane', 'jet', 'turbine', 'engine'],
    note: 'Authentic aeronautical turbofan layout based on high-bypass commercial jet engine blueprints.',
  },
  {
    id: 'radial',
    name: 'Radial Aircraft Engine',
    category: 'Machines',
    subtitle: 'Nine cylinders around one crankshaft',
    view: { x: 0.35, y: 0.55, z: 0 },
    build: buildRadial,
    status: VERIFICATION_STATUS.VERIFIED,
    source: 'Aviation Engineering Specs',
    tags: ['radial', 'motor', 'piston'],
    note: 'Verified 9-cylinder radial reciprocating aviation engine geometry.',
  },
  {
    id: 'car',
    name: 'Sports Car',
    category: 'Machines',
    subtitle: 'Body, chassis, drivetrain and interior',
    view: { x: 0.3, y: -0.7, z: 0 },
    build: buildCar,
    status: VERIFICATION_STATUS.VERIFIED,
    source: 'Automotive Mechanical CAD',
    tags: ['car', 'sports car', 'automobile', 'vehicle', 'truck', 'bus'],
    note: 'Accurate grand-tourer sports coupe chassis, V8 powertrain, suspension, and bodywork.',
  },
  {
    id: 'brain',
    name: 'Human Brain',
    category: 'Biology',
    subtitle: 'Lobes, cerebellum and the structures inside',
    view: { x: 0.18, y: 0.7, z: 0 },
    build: buildBrain,
    status: VERIFICATION_STATUS.VERIFIED,
    source: 'Neuroanatomical Atlas',
    tags: ['brain', 'human brain', 'skull', 'cerebrum', 'neuroanatomy'],
    note: 'Anatomically accurate cerebral cortex lobes, limbic system, and brainstem coordinates.',
  },

  // --- RECOGNIZED OBJECTS: CONCEPTUAL / ESTIMATED INTERNALS ---
  {
    id: 'phone',
    name: 'Smartphone Architecture',
    category: 'Electronics',
    subtitle: 'SoC, battery, camera cluster, haptics, chassis',
    view: { x: 0.25, y: -0.45, z: 0 },
    build: buildPhone,
    status: VERIFICATION_STATUS.ESTIMATED,
    source: 'Conceptual Hardware Schematics',
    tags: ['cell phone', 'phone', 'mobile phone', 'smartphone', 'telephone'],
    note: 'ESTIMATED / CONCEPTUAL: Representative modern smartphone internal architecture. Camera cannot see through physical phone enclosures.',
  },
  {
    id: 'laptop',
    name: 'Laptop Architecture',
    category: 'Electronics',
    subtitle: 'Retina display, motherboard, dual fans, multi-cell battery',
    view: { x: 0.35, y: -0.5, z: 0 },
    build: buildLaptop,
    status: VERIFICATION_STATUS.ESTIMATED,
    source: 'Conceptual Hardware Schematics',
    tags: ['laptop', 'notebook', 'laptop computer', 'macbook', 'ultrabook', 'chromebook', 'portable computer'],
    note: 'ESTIMATED / CONCEPTUAL: Representative laptop computer internal hardware. Not an X-ray scan of your specific machine.',
  },
  {
    id: 'mouse',
    name: 'Optical Mouse Peripheral',
    category: 'Electronics',
    subtitle: 'Tactile switches, optical tracking sensor, MCU, battery',
    view: { x: 0.3, y: -0.6, z: 0 },
    build: buildMouse,
    status: VERIFICATION_STATUS.ESTIMATED,
    source: 'Conceptual Peripheral Schematics',
    tags: ['mouse', 'computer mouse', 'optical mouse', 'pointing device', 'trackball'],
    note: 'ESTIMATED / CONCEPTUAL: Standard optical pointing peripheral layout and internal electro-mechanical switches.',
  },
  {
    id: 'gamepad',
    name: 'Wireless Game Controller',
    category: 'Electronics',
    subtitle: 'Thumbsticks, D-pad, PCB, haptic motors, battery, triggers',
    view: { x: 0.32, y: -0.4, z: 0 },
    build: buildGamepad,
    status: VERIFICATION_STATUS.ESTIMATED,
    source: 'Conceptual Gamepad Hardware Schematics',
    tags: ['gamepad', 'game controller', 'controller', 'joystick', 'console controller', 'xbox', 'playstation', 'dualshock', 'dualsense'],
    note: 'ESTIMATED / CONCEPTUAL: Standard dual-analog wireless gaming controller internal PCB, haptic rumble motors, and switches.',
  },
  {
    id: 'keyboard',
    name: 'Mechanical Wireless Keyboard',
    category: 'Electronics',
    subtitle: 'Mechanical switches, hot-swap PCB, acoustic damping, battery',
    view: { x: 0.38, y: -0.3, z: 0 },
    build: buildKeyboard,
    status: VERIFICATION_STATUS.ESTIMATED,
    source: 'Mechanical Keyboard Hardware Architecture',
    tags: [
      'keyboard',
      'mechanical keyboard',
      'wireless keyboard',
      'mechanical wireless keyboard',
      'computer keyboard',
      'gaming keyboard',
      'keypad',
    ],
    note: 'ESTIMATED / CONCEPTUAL: Mechanical switch stems, hot-swap PCB, dampening foam, and wireless controller.',
  },
  {
    id: 'bottle',
    name: 'Insulated Container',
    category: 'Household',
    subtitle: 'Double-wall vacuum barrier, inner liner, liquid core, gasket',
    view: { x: 0.2, y: -0.4, z: 0 },
    build: buildBottle,
    status: VERIFICATION_STATUS.ESTIMATED,
    source: 'Thermal Engineering Schematics',
    tags: ['bottle', 'water bottle', 'thermos', 'vacuum flask'],
    note: 'ESTIMATED / CONCEPTUAL: Standard dual-wall stainless thermal vacuum flask cross-section.',
  },
  {
    id: 'plant',
    name: 'Botanical Plant Anatomy',
    category: 'Biology',
    subtitle: 'Leaf cuticle, xylem/phloem bundles, rhizosphere, root hairs',
    view: { x: 0.22, y: 0.45, z: 0 },
    build: buildPlant,
    status: VERIFICATION_STATUS.ESTIMATED,
    source: 'Botanical Cross-Section Model',
    tags: ['potted plant', 'plant', 'flower'],
    note: 'ESTIMATED / CONCEPTUAL: Generalized vascular plant internal transport anatomy and rhizosphere.',
  },
  {
    id: 'generic_mech',
    name: 'Modular Electro-Mechanical Tool',
    category: 'Tools',
    subtitle: 'Brushless motor, planetary gearbox, controller, power cell',
    view: { x: 0.28, y: -0.5, z: 0 },
    build: buildGenericMech,
    status: VERIFICATION_STATUS.ESTIMATED,
    source: 'Algorithmic Conceptual Assembly',
    tags: ['generic tool', 'gearbox', 'planetary gear'],
    note: 'ESTIMATED / CONCEPTUAL: Universal electro-mechanical drive and gearbox assembly for household appliances and tools.',
  },
];

/**
 * Match a camera detection label against the model registry.
 * Returns { model, index, status, matchType, explanation }
 */
export function matchObjectToModel(rawLabel, confidence = 1.0, registry = MODEL_REGISTRY) {
  if (!rawLabel || typeof rawLabel !== 'string') {
    return {
      model: null,
      index: -1,
      status: null,
      matchType: 'NONE',
      explanation: 'No object label provided for matching.',
    };
  }

  const query = rawLabel.trim().toLowerCase().replace(/[-_]/g, ' ');

  // If the query represents an accessory, sub-component, charger, or adapter (e.g. "phone charger", "usb charger", "car keys")
  // it must NOT be mapped to the parent device CAD model! It needs its own dynamic AI 3D model!
  const isAccessory = /\b(charger|adapter|cable|wire|plug|socket|connector|case|cover|stand|holder|mount|battery|powerbank|power bank|dock|pad|opener|keys|toy|remote|strap|box|brick)\b/i.test(query);

  // 1. Direct tag match or exact ID match
  for (let i = 0; i < registry.length; i++) {
    const m = registry[i];
    if (m.id.toLowerCase() === query || m.tags.some((t) => t.toLowerCase() === query)) {
      return {
        model: m,
        index: i,
        status: m.status,
        matchType: 'EXACT',
        explanation:
          m.status === VERIFICATION_STATUS.VERIFIED
            ? `Matched verified 3D asset for "${rawLabel}".`
            : `Matched conceptual internal visualization for "${rawLabel}". (${VERIFICATION_LABELS[m.status]})`,
      };
    }
  }

  // 2. Word boundary match only if NOT an accessory
  if (!isAccessory) {
    for (let i = 0; i < registry.length; i++) {
      const m = registry[i];
      const foundTag = m.tags.find((t) => {
        const escaped = t.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`\\b${escaped}\\b`, 'i').test(query);
      });
      if (foundTag) {
        return {
          model: m,
          index: i,
          status: m.status,
          matchType: 'PARTIAL',
          explanation:
            m.status === VERIFICATION_STATUS.VERIFIED
              ? `Matched verified asset "${m.name}" for detected "${rawLabel}".`
              : `Matched conceptual model "${m.name}" for detected "${rawLabel}". (${VERIFICATION_LABELS[m.status]})`,
        };
      }
    }
  }

  return {
    model: null,
    index: -1,
    status: null,
    matchType: 'UNMATCHED',
    explanation: `Recognized "${rawLabel}" (${Math.round(confidence * 100)}%), but no matching 3D internal model exists in the asset registry. You can upload a .GLB model or select a category manually.`,
  };
}

/**
 * Register a user-uploaded GLTF or custom model dynamically.
 */
export function registerCustomModel(modelDef, registry = MODEL_REGISTRY) {
  if (!modelDef.id || !modelDef.build) {
    throw new Error('Custom model must have id and build function.');
  }
  const normName = (modelDef.name || '').trim().toLowerCase();
  const existingIdx = registry.findIndex(
    (m) => m.id === modelDef.id || (normName && (m.name || '').trim().toLowerCase() === normName)
  );
  const entry = {
    category: 'Custom Assets',
    subtitle: 'User imported 3D asset',
    view: { x: 0.25, y: -0.5, z: 0 },
    status: VERIFICATION_STATUS.CUSTOM,
    source: 'User Upload (.GLB)',
    ...modelDef,
    tags: Array.isArray(modelDef.tags) && modelDef.tags.length
      ? modelDef.tags
      : [modelDef.name.toLowerCase(), modelDef.id.toLowerCase()],
  };
  if (existingIdx >= 0) {
    registry[existingIdx] = entry;
    return existingIdx;
  }
  registry.push(entry);
  return registry.length - 1;
}
