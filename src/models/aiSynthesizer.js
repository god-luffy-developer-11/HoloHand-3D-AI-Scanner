import { Cloud, P, I, box, ring, disc, frustum, cylinder, ellipsoid, torus, merge, R } from './shapes.js';
import { VERIFICATION_STATUS, VERIFICATION_LABELS, registerCustomModel } from './registry.js';

const CYBER_PALETTE = [
  '#38bdf8', // Cyber Blue / Cyan
  '#10b981', // Emerald PCB Green
  '#f59e0b', // Amber / Gold
  '#8b5cf6', // Violet Power
  '#ec4899', // Pink / Sensor
  '#06b6d4', // Bright Teal
  '#6366f1', // Indigo MCU
  '#e2e8f0', // Silver / Metal Shell
  '#f97316', // Orange Thermal
  '#14b8a6', // Cyan Coil
];

function parseVec3(val, fallback = [0, 0, 0]) {
  if (Array.isArray(val)) {
    return [
      Number.isFinite(+val[0]) ? +val[0] : fallback[0],
      Number.isFinite(+val[1]) ? +val[1] : fallback[1],
      Number.isFinite(+val[2]) ? +val[2] : fallback[2],
    ];
  }
  if (val && typeof val === 'object') {
    const x = val.x ?? val.w ?? val.width ?? val.r ?? val.radius ?? fallback[0];
    const y = val.y ?? val.h ?? val.height ?? fallback[1];
    const z = val.z ?? val.d ?? val.depth ?? fallback[2];
    return [
      Number.isFinite(+x) ? +x : fallback[0],
      Number.isFinite(+y) ? +y : fallback[1],
      Number.isFinite(+z) ? +z : fallback[2],
    ];
  }
  return fallback;
}

function parseDims(val, fallback = [1.4, 0.4, 1.2]) {
  const v = parseVec3(val, fallback);
  return [
    Math.max(0.15, Math.abs(v[0])),
    Math.max(0.08, Math.abs(v[1])),
    Math.max(0.15, Math.abs(v[2])),
  ];
}

function parseColor(c, fallback) {
  if (typeof c === 'string') {
    const trimmed = c.trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed;
    if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
      return '#' + trimmed[1] + trimmed[1] + trimmed[2] + trimmed[2] + trimmed[3] + trimmed[3];
    }
    const NAMED = {
      blue: '#38bdf8',
      cyan: '#06b6d4',
      green: '#10b981',
      emerald: '#059669',
      gold: '#f59e0b',
      amber: '#f59e0b',
      orange: '#f97316',
      purple: '#8b5cf6',
      violet: '#8b5cf6',
      pink: '#ec4899',
      silver: '#e2e8f0',
      gray: '#94a3b8',
      grey: '#94a3b8',
      white: '#ffffff',
      red: '#ef4444',
      teal: '#14b8a6',
    };
    if (NAMED[trimmed]) return NAMED[trimmed];
  }
  return fallback;
}

function normalizeShape(s, nameHint = '') {
  const str = (s || '').toLowerCase();
  const hint = (nameHint || '').toLowerCase();

  // Explicit shape overrides
  if (str.includes('chip') || str.includes('processor') || str.includes('cpu') || str.includes('soc') || str.includes('mcu')) {
    return 'chip';
  }
  if (str.includes('battery') || str.includes('cell') || str.includes('power pack') || str.includes('accumulator')) {
    return 'battery';
  }
  if (str.includes('sensor') || str.includes('camera') || str.includes('photodiode') || str.includes('lidar') || str.includes('lens') || str.includes('optic')) {
    return 'sensor';
  }
  if (str.includes('pcb') || str.includes('circuit') || str.includes('board') || str.includes('motherboard') || str.includes('logic')) {
    return 'pcb';
  }
  if (str.includes('motor') || str.includes('gear') || str.includes('engine') || str.includes('rotor') || str.includes('spindle')) {
    return 'motor';
  }
  if (str.includes('coil') || str.includes('inductor') || str.includes('transformer') || str.includes('toroid')) {
    return 'coil';
  }

  // Infer from component name / description if shape was generic
  if (hint.includes('chip') || hint.includes('processor') || hint.includes('cpu') || hint.includes('soc') || hint.includes('mcu') || hint.includes('controller ic') || hint.includes('silicon')) {
    return 'chip';
  }
  if (hint.includes('battery') || hint.includes('power cell') || hint.includes('lipo') || hint.includes('accumulator')) {
    return 'battery';
  }
  if (hint.includes('sensor') || hint.includes('camera') || hint.includes('photodiode') || hint.includes('lidar') || hint.includes('lens') || hint.includes('biometric') || hint.includes('infrared')) {
    return 'sensor';
  }
  if (hint.includes('pcb') || hint.includes('circuit board') || hint.includes('motherboard') || hint.includes('logic board') || hint.includes('sub-board')) {
    return 'pcb';
  }
  if (hint.includes('coil') || hint.includes('inductor') || hint.includes('transformer') || hint.includes('antenna') || hint.includes('magnet')) {
    return 'coil';
  }
  if (hint.includes('motor') || hint.includes('gear') || hint.includes('actuator') || hint.includes('rotor')) {
    return 'motor';
  }

  if (str.includes('cyl') || str.includes('tube') || str.includes('rod') || str.includes('pipe') || str.includes('capsule') || str.includes('shaft')) {
    return 'cylinder';
  }
  if (str.includes('ellip') || str.includes('spher') || str.includes('ball') || str.includes('globe') || str.includes('orb')) {
    return 'ellipsoid';
  }
  if (str.includes('disc') || str.includes('disk') || str.includes('plate') || str.includes('dial')) {
    return 'disc';
  }
  if (str.includes('ring') || str.includes('rim') || str.includes('bezel')) {
    return 'ring';
  }
  if (str.includes('torus') || str.includes('donut') || str.includes('loop')) {
    return 'torus';
  }
  return 'box';
}

/**
 * Generate a 3D point cloud for an individual component based on shape, dimensions, and semantic hints.
 */
function createComponentCloud(shape, rawDims, rawOffset = [0, 0, 0], nameHint = '') {
  const dims = parseDims(rawDims, [1.4, 0.4, 1.2]);
  const offset = parseVec3(rawOffset, [0, 0, 0]);
  const [ox, oy, oz] = offset;
  const [d0, d1, d2] = dims;

  let cloud;
  const normShape = normalizeShape(shape, nameHint);

  switch (normShape) {
    case 'chip':
      cloud = merge(
        // Silicon substrate wafer die
        box(d0, Math.max(0.04, d1 * 0.3), d2, 450, { edges: 0.35 }),
        // Metallic integrated heat spreader
        box(d0 * 0.7, Math.max(0.06, d1 * 0.5), d2 * 0.7, 300, { edges: 0.25 }),
        // Micro solder balls and gold contact array
        disc(0, Math.min(d0, d2) * 0.45, 180, 0.01)
      );
      break;

    case 'battery':
      cloud = merge(
        // Layered lithium pouch / cell body
        box(d0, d1, d2, 600, { edges: 0.25 }),
        // Positive cathode terminal contact
        cylinder(Math.min(d0, d2) * 0.15, d1 * 0.35, 120).move(0, d1 * 0.55, 0),
        // Negative terminal / safety BMS strip
        box(d0 * 0.8, d1 * 0.15, d2 * 0.3, 140).move(0, -d1 * 0.5, 0)
      );
      break;

    case 'sensor':
      cloud = merge(
        // Sensor optical barrel / housing
        cylinder(d0 * 0.45, d1, 350, { rings: 3, lines: 4 }),
        // Conical aperture lens element
        frustum(d0 * 0.35, d0 * 0.45, d1 * 0.4, 220, { rings: 2 }),
        // Central CMOS sensor die array
        box(d0 * 0.45, 0.04, d2 * 0.45, 180),
        // Outer aperture ring
        ring(d0 * 0.48, 0, 140)
      );
      break;

    case 'pcb':
      cloud = merge(
        // FR4 PCB substrate plate
        box(d0, Math.max(0.03, d1 * 0.18), d2, 650, { edges: 0.3 }),
        // Surface mount IC processor package
        box(d0 * 0.3, d1 * 0.3, d2 * 0.3, 200).move(-d0 * 0.25, d1 * 0.15, -d2 * 0.2),
        // Discrete SMD components
        box(d0 * 0.18, d1 * 0.22, d2 * 0.18, 120).move(d0 * 0.25, d1 * 0.15, d2 * 0.2),
        box(d0 * 0.15, d1 * 0.2, d2 * 0.25, 120).move(d0 * 0.25, d1 * 0.15, -d2 * 0.2)
      );
      break;

    case 'coil':
      cloud = merge(
        ring(d0 * 0.45, 0, 280),
        ring(d0 * 0.35, 0, 240),
        ring(d0 * 0.25, 0, 200),
        cylinder(d0 * 0.15, d1, 160)
      );
      break;

    case 'motor':
      cloud = merge(
        // Stator armature housing
        cylinder(d0 * 0.45, d1, 400, { rings: 4, lines: 6 }),
        // Central rotor drive shaft
        cylinder(d0 * 0.12, d1 * 1.35, 200),
        // Perimeter gear teeth ring
        torus(d0 * 0.48, d1 * 0.15, 240)
      );
      break;

    case 'cylinder':
      cloud = cylinder(d0 * 0.5, d1, 550, { rings: 4, lines: 6, cap0: true, cap1: true });
      break;

    case 'ellipsoid':
      cloud = ellipsoid(d0 * 0.5, d1 * 0.5, d2 * 0.5, 600);
      break;

    case 'disc':
      cloud = merge(
        disc(0, d0 * 0.5, 450, 0),
        ring(d0 * 0.5, 0, 150)
      );
      break;

    case 'ring':
      cloud = ring(d0 * 0.5, 0, 450);
      break;

    case 'torus':
      cloud = torus(d0 * 0.5, d1 * 0.2, 500);
      break;

    case 'box':
    default:
      cloud = box(d0, d1, d2, 650, { edges: 0.35 });
      break;
  }

  if (ox !== 0 || oy !== 0 || oz !== 0) {
    cloud.move(ox, oy, oz);
  }
  return cloud;
}

/**
 * Procedural fallback component generator if AI provides only an object name.
 */
export function synthesizeFallbackComponents(objectName, category = '') {
  const nameLower = (objectName || '').toLowerCase();
  const catLower = (category || '').toLowerCase();

  const isCharger = /charger|adapter|plug|power brick|wall wart|power supply|powerbank|power bank|usb/i.test(nameLower);
  const isBio = catLower.includes('bio') || /apple|fruit|plant|animal|flower|tree|seed|bird|fish|meat|bone|leaf|organ|brain|heart/i.test(nameLower);
  const isTool = catLower.includes('tool') || /drill|wrench|screwdriver|saw|hammer|iron|kettle|toaster|fan|blender|motor|pump|hardware/i.test(nameLower);
  const isVehicle = catLower.includes('vehic') || /car|bike|bicycle|motorcycle|scooter|drone|plane|helicopter|truck|boat|ship/i.test(nameLower);
  const isContainer = catLower.includes('house') || /bottle|mug|cup|glass|container|pot|pan|backpack|shoe|box|jar|case|pen/i.test(nameLower);

  if (isCharger) {
    return [
      {
        name: 'Flame-Retardant Polycarbonate Outer Enclosure',
        description: 'Impact-resistant polycarbonate shell and thermal barrier enclosure',
        color: '#38bdf8',
        shape: 'box',
        dims: [1.6, 1.3, 1.6],
        offset: [0, 0, 0],
        explode_dir: [0, 1.5, 0],
      },
      {
        name: 'AC Input Prongs & Over-Current Safety Fuse',
        description: 'Nickel-plated high-voltage AC wall prongs and slow-blow fuse',
        color: '#e2e8f0',
        shape: 'box',
        dims: [0.35, 0.8, 0.8],
        offset: [0, -0.65, 0],
        explode_dir: [0, -1.6, 0],
      },
      {
        name: 'Switch-Mode Flyback Transformer & Ferrite E-Core',
        description: 'High-frequency ferrite transformer with interleaved copper windings',
        color: '#f59e0b',
        shape: 'cylinder',
        dims: [0.85, 0.65, 0.85],
        offset: [-0.25, 0.1, 0],
        explode_dir: [-1.3, 0.4, 0],
      },
      {
        name: 'High-Voltage Primary Rectifier & Filter Capacitors',
        description: 'Diode bridge rectifier and 400V smoothing electrolytic filter capacitor',
        color: '#8b5cf6',
        shape: 'cylinder',
        dims: [0.65, 0.75, 0.65],
        offset: [0.35, 0.1, -0.2],
        explode_dir: [1.3, 0.4, 0],
      },
      {
        name: 'GaN Power Controller IC & Optocoupler Barrier',
        description: 'Gallium Nitride (GaN) switching controller and galvanic optical isolation',
        color: '#10b981',
        shape: 'box',
        dims: [1.2, 0.15, 1.2],
        offset: [0, -0.2, 0],
        explode_dir: [0, -0.9, 0],
      },
      {
        name: 'Shielded USB-C / USB-A Receptacle Port',
        description: 'Stainless steel shielded connector with USB-PD power delivery handshake IC',
        color: '#06b6d4',
        shape: 'box',
        dims: [0.8, 0.35, 0.55],
        offset: [0, 0.55, 0],
        explode_dir: [0, 1.6, 0],
      },
      {
        name: 'Internal Aluminum Heat Sink & Shielding',
        description: 'Anodized aluminum thermal heat spreader for efficient heat dissipation',
        color: '#94a3b8',
        shape: 'box',
        dims: [1.4, 0.18, 1.4],
        offset: [0, 0.3, 0],
        explode_dir: [0.8, 0.9, 0],
      },
    ];
  }

  if (isBio) {
    return [
      {
        name: 'Outer Epidermal Layer & Cuticle',
        description: 'Protective outer cellular envelope and moisture barrier',
        color: '#10b981',
        shape: 'ellipsoid',
        dims: [2.2, 2.0, 2.0],
        offset: [0, 0, 0],
        explode_dir: [0, 1.4, 0],
      },
      {
        name: 'Parenchyma Cortex & Nutrient Tissue',
        description: 'Cellular storage mesh and metabolic conversion matrix',
        color: '#f59e0b',
        shape: 'ellipsoid',
        dims: [1.7, 1.6, 1.6],
        offset: [0, 0, 0],
        explode_dir: [1.3, 0, 0],
      },
      {
        name: 'Vascular Transport Bundles',
        description: 'Xylem and phloem micro-capillaries for fluid dynamics',
        color: '#38bdf8',
        shape: 'cylinder',
        dims: [1.2, 1.8, 1.2],
        offset: [0, 0, 0],
        explode_dir: [-1.3, 0, 0],
      },
      {
        name: 'Core Reproductive Locule / Nucleus',
        description: 'Central genetic repository and embryo seed cavity',
        color: '#ec4899',
        shape: 'ellipsoid',
        dims: [0.8, 0.8, 0.8],
        offset: [0, 0, 0],
        explode_dir: [0, -1.4, 0],
      },
    ];
  }

  if (isTool) {
    return [
      {
        name: 'Reinforced Composite Housing',
        description: 'Impact-resistant exterior enclosure with ergonomic grip ridges',
        color: '#e2e8f0',
        shape: 'box',
        dims: [2.2, 1.4, 1.2],
        offset: [0, 0, 0],
        explode_dir: [0, 1.4, 0],
      },
      {
        name: 'High-Torque Drive Motor & Rotor',
        description: 'Brushless copper stator and neodymium magnetic rotor core',
        color: '#38bdf8',
        shape: 'cylinder',
        dims: [0.8, 1.2, 0.8],
        offset: [0.3, 0, 0],
        explode_dir: [1.3, 0, 0],
      },
      {
        name: 'Planetary Gearbox & Output Spindle',
        description: 'Multi-stage planetary reduction gears and hardened steel shaft',
        color: '#f59e0b',
        shape: 'cylinder',
        dims: [0.7, 1.0, 0.7],
        offset: [0.8, 0, 0],
        explode_dir: [1.5, 0.5, 0],
      },
      {
        name: 'Speed Controller & PWM Logic Board',
        description: 'Microcontroller PCB with MOSFET switches and trigger sensor',
        color: '#10b981',
        shape: 'box',
        dims: [1.2, 0.15, 0.8],
        offset: [-0.2, -0.3, 0],
        explode_dir: [0, -1.2, 0],
      },
      {
        name: 'High-Current Power Storage Cell',
        description: 'Multi-cell rechargeable lithium power pack with BMS',
        color: '#8b5cf6',
        shape: 'box',
        dims: [1.0, 0.8, 0.9],
        offset: [-0.6, -0.5, 0],
        explode_dir: [-1.4, -0.8, 0],
      },
    ];
  }

  if (isVehicle) {
    return [
      {
        name: 'Aerodynamic Structural Chassis',
        description: 'Lightweight carbon-aluminum frame and aerodynamic fairings',
        color: '#38bdf8',
        shape: 'box',
        dims: [2.8, 0.8, 1.5],
        offset: [0, 0, 0],
        explode_dir: [0, 1.5, 0],
      },
      {
        name: 'Electric Traction Motor & Inverter',
        description: 'High-output permanent magnet motor and silicon carbide inverter',
        color: '#10b981',
        shape: 'cylinder',
        dims: [0.9, 1.0, 0.9],
        offset: [-0.5, -0.2, 0],
        explode_dir: [-1.3, 0, 0],
      },
      {
        name: 'Traction Battery Pack Architecture',
        description: 'Liquid-cooled high-voltage lithium battery module and BMS',
        color: '#8b5cf6',
        shape: 'box',
        dims: [1.8, 0.35, 1.2],
        offset: [0, -0.3, 0],
        explode_dir: [0, -1.5, 0],
      },
      {
        name: 'Suspension & Steering Dynamics Gimbal',
        description: 'Multi-link independent suspension arms, damper coils, and hub',
        color: '#f59e0b',
        shape: 'torus',
        dims: [1.2, 0.3, 1.2],
        offset: [0.7, -0.2, 0],
        explode_dir: [1.4, 0, 0],
      },
      {
        name: 'Cockpit Telemetry & Autonomous Compute',
        description: 'Central vehicle computer, LIDAR/radar telemetry, and head-up display',
        color: '#ec4899',
        shape: 'box',
        dims: [0.9, 0.3, 0.8],
        offset: [0.2, 0.3, 0],
        explode_dir: [0.4, 1.3, 0],
      },
    ];
  }

  if (isContainer) {
    return [
      {
        name: 'Outer Protective Shell & Finish',
        description: 'Durable exterior shell and ergonomic textured tactile grip',
        color: '#38bdf8',
        shape: 'cylinder',
        dims: [1.4, 2.2, 1.4],
        offset: [0, 0, 0],
        explode_dir: [0, 1.4, 0],
      },
      {
        name: 'Vacuum Barrier & Thermal Core Liner',
        description: 'Reflective stainless steel double-wall insulation barrier',
        color: '#e2e8f0',
        shape: 'cylinder',
        dims: [1.1, 1.9, 1.1],
        offset: [0, 0, 0],
        explode_dir: [1.3, 0, 0],
      },
      {
        name: 'Internal Storage Reservoir',
        description: 'Fluid / payload volume compartment',
        color: '#10b981',
        shape: 'cylinder',
        dims: [0.8, 1.6, 0.8],
        offset: [0, 0, 0],
        explode_dir: [-1.3, 0, 0],
      },
      {
        name: 'Precision Sealing Lid & Valve Mechanism',
        description: 'Food-grade elastomer gasket and spring-actuated latch',
        color: '#f59e0b',
        shape: 'disc',
        dims: [1.3, 0.3, 1.3],
        offset: [0, 1.1, 0],
        explode_dir: [0, 1.8, 0],
      },
      {
        name: 'Non-Slip Reinforced Base Plate',
        description: 'High-friction silicone stabilizer foot and shock absorber',
        color: '#8b5cf6',
        shape: 'disc',
        dims: [1.4, 0.2, 1.4],
        offset: [0, -1.1, 0],
        explode_dir: [0, -1.6, 0],
      },
    ];
  }

  // Default: General Electronics / High-Tech Device
  return [
    {
      name: 'Exterior Protective Chassis & Screen',
      description: 'Anodized alloy frame with tempered scratch-resistant interface glass',
      color: '#38bdf8',
      shape: 'box',
      dims: [2.0, 0.25, 1.5],
      offset: [0, 0.5, 0],
      explode_dir: [0, 1.5, 0],
    },
    {
      name: 'Multi-Layer Motherboard & SoC PCB',
      description: 'High-density logic board with multi-core processor and wireless MCU',
      color: '#10b981',
      shape: 'box',
      dims: [1.6, 0.12, 1.2],
      offset: [0, 0.15, 0],
      explode_dir: [1.2, 0.4, 0],
    },
    {
      name: 'High-Density Rechargeable Power Cell',
      description: 'Lithium-ion polymer battery cell with safety thermal fuses',
      color: '#8b5cf6',
      shape: 'box',
      dims: [1.4, 0.3, 1.0],
      offset: [0, -0.2, 0],
      explode_dir: [-1.2, -0.4, 0],
    },
    {
      name: 'Precision Sensor & Actuator Module',
      description: 'Haptic feedback motor, antenna array, and biometric sensor cluster',
      color: '#ec4899',
      shape: 'cylinder',
      dims: [0.6, 0.3, 0.6],
      offset: [0.4, -0.2, 0],
      explode_dir: [1.0, -1.2, 0],
    },
    {
      name: 'Rear Structural Housing & Connectors',
      description: 'Internal structural backplate, thermal shielding, and interface ports',
      color: '#e2e8f0',
      shape: 'box',
      dims: [2.0, 0.2, 1.5],
      offset: [0, -0.6, 0],
      explode_dir: [0, -1.6, 0],
    },
  ];
}

/**
 * Build a complete dynamic holographic 3D model for ANY recognized object.
 */
export function buildDynamicHoloModel({
  objectName,
  category = 'Scanned Objects',
  components = [],
  visibleAttributes = [],
  reasoning = '',
}) {
  const cleanName = (objectName || 'Unknown Object').trim();
  const safeId = 'ai_' + cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 32);

  // Use provided AI components or generate high-quality fallback components
  let partDefs = Array.isArray(components) && components.length >= 2 ? components : null;
  if (!partDefs || partDefs.length === 0) {
    partDefs = synthesizeFallbackComponents(cleanName, category);
  }

  // Cap at 16 parts to stay well below MAXP (24)
  partDefs = partDefs.slice(0, 16);

  // Create the build function that Three.js HoloScene will execute
  const buildFn = () => {
    try {
      return partDefs.map((def, idx) => {
        const name = def.name || `Internal Layer ${idx + 1}`;
        const desc = def.description || def.desc || `Functional internal subsystem of ${cleanName}.`;
        const color = parseColor(def.color, CYBER_PALETTE[idx % CYBER_PALETTE.length]);
        const shape = normalizeShape(def.shape || 'box', name + ' ' + desc);
        const dims = parseDims(def.dims, [1.4, 0.35, 1.2]);
        const offset = parseVec3(def.offset, [0, 0, 0]);

        // Explode vector
        let dir = [0, 1, 0];
        if (def.explode_dir) {
          dir = parseVec3(def.explode_dir, [0, 1, 0]);
        } else {
          // Compute radial / staggered explosion vector if omitted
          const angle = (idx / partDefs.length) * Math.PI * 2;
          const yDir = (idx % 2 === 0 ? 1 : -1) * (0.8 + 0.3 * idx);
          dir = [Math.cos(angle) * 1.3, yDir, Math.sin(angle) * 1.3];
        }

        try {
          const cloud = createComponentCloud(shape, dims, offset, name + ' ' + desc);
          return P(name, desc, color, [I(cloud, dir)]);
        } catch (compErr) {
          console.warn(`[aiSynthesizer] Component creation fallback for "${name}":`, compErr);
          const fallbackCloud = box(1.2, 0.35, 1.0, 500);
          return P(name, desc, color, [I(fallbackCloud, dir)]);
        }
      });
    } catch (buildErr) {
      console.warn(`[aiSynthesizer] Model build error for "${cleanName}", using synthetic fallbacks:`, buildErr);
      const fallbacks = synthesizeFallbackComponents(cleanName, category);
      return fallbacks.map((def, idx) => {
        const color = parseColor(def.color, CYBER_PALETTE[idx % CYBER_PALETTE.length]);
        const dims = parseDims(def.dims, [1.4, 0.35, 1.2]);
        const offset = parseVec3(def.offset, [0, 0, 0]);
        const dir = parseVec3(def.explode_dir, [0, 1, 0]);
        const cloud = createComponentCloud(def.shape, dims, offset, def.name + ' ' + def.description);
        return P(def.name, def.description, color, [I(cloud, dir)]);
      });
    }
  };

  const modelEntry = {
    id: safeId,
    name: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
    category: category ? (category.charAt(0).toUpperCase() + category.slice(1)) : 'AI Vision Lab',
    subtitle: `AI Synthesized Internal Hologram (${partDefs.length} parts)`,
    view: { x: 0.3, y: -0.45, z: 0 },
    build: buildFn,
    status: VERIFICATION_STATUS.ESTIMATED,
    source: 'Gemini Multimodal AI Hologram Synthesis',
    tags: [cleanName.toLowerCase(), safeId, ...(visibleAttributes || []).map((a) => a.toLowerCase())],
    note: `ESTIMATED / CONCEPTUAL: 3D internal structure synthesized by JARVIS AI for "${cleanName}". Camera cannot physically see through solid outer surfaces.`,
  };

  return modelEntry;
}

/**
 * Synthesize and register ANY detected object directly into the HoloHand model registry.
 * Returns { model, index, status, matchType, explanation }
 */
export function synthesizeAndRegisterModel({
  objectName,
  category = 'Scanned Objects',
  components = [],
  visibleAttributes = [],
  reasoning = '',
}, registry) {
  const modelDef = buildDynamicHoloModel({
    objectName,
    category,
    components,
    visibleAttributes,
    reasoning,
  });

  const registeredIdx = registerCustomModel(modelDef, registry);

  return {
    model: modelDef,
    index: registeredIdx,
    status: VERIFICATION_STATUS.ESTIMATED,
    matchType: 'AI_SYNTHESIZED',
    explanation: `JARVIS AI generated conceptual 3D internal hologram for "${objectName}". (${VERIFICATION_LABELS[VERIFICATION_STATUS.ESTIMATED]})`,
  };
}
