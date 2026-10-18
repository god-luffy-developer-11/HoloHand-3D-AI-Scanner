import { Cloud, P, I, box, ring, disc, frustum, ellipsoid, merge, R } from './shapes.js';

/**
 * Conceptual 3D Internal Architecture of an Optical Mouse / Peripheral.
 * Explicitly conceptual / estimated internal components.
 */
export function buildMouse() {
  const L = 2.4, W = 1.3, H = 0.9;

  // 1. Ergonomic Top Palm Shell
  const topShell = merge(
    ellipsoid(W * 0.48, H * 0.5, L * 0.48, 1400).move(0, H * 0.35, 0),
    box(W * 0.9, 0.05, L * 0.85, 400).move(0, H * 0.15, 0)
  );

  // 2. Left & Right Click Button Paddles
  const clickPaddles = merge(
    box(W * 0.42, 0.04, L * 0.42, 500, { edges: 0.3 }).move(-W * 0.24, H * 0.42, -L * 0.26),
    box(W * 0.42, 0.04, L * 0.42, 500, { edges: 0.3 }).move(W * 0.24, H * 0.42, -L * 0.26)
  );

  // 3. Dual Tactile Microswitches
  const microswitches = merge(
    box(0.18, 0.16, 0.28, 250).move(-W * 0.24, H * 0.15, -L * 0.26),
    box(0.06, 0.05, 0.08, 60).move(-W * 0.24, H * 0.25, -L * 0.32),
    box(0.18, 0.16, 0.28, 250).move(W * 0.24, H * 0.15, -L * 0.26),
    box(0.06, 0.05, 0.08, 60).move(W * 0.24, H * 0.25, -L * 0.32)
  );

  // 4. Optical Scroll Wheel & Rotary Optical Encoder
  const scrollWheel = merge(
    ring(0.24, 0, 300).rotate(0, 0, Math.PI / 2).move(0, H * 0.36, -L * 0.26),
    disc(0, 0.22, 350, 0).rotate(0, 0, Math.PI / 2).move(0, H * 0.36, -L * 0.26),
    box(0.1, 0.14, 0.16, 150).move(0.16, H * 0.32, -L * 0.26)
  );

  // 5. Optical Tracking Sensor & Dual-Lens Prism
  const opticalSensor = merge(
    box(0.3, 0.12, 0.3, 350).move(0, -H * 0.12, 0),
    frustum(0.08, 0.14, 0.12, 250, { rings: 2 }).move(0, -H * 0.2, 0)
  );

  // 6. Main Control Board & 2.4GHz / BLE Transceiver
  const mainPCB = merge(
    box(W * 0.8, 0.025, L * 0.8, 1200, { edges: 0.3 }).move(0, -0.02, 0),
    box(0.24, 0.04, 0.24, 200).move(0, 0.03, L * 0.15),
    box(0.16, 0.03, 0.18, 120).move(W * 0.22, 0.02, 0)
  );

  // 7. Rechargeable Lithium Battery
  const battery = box(W * 0.45, 0.2, L * 0.32, 600, { edges: 0.25 }).move(0, H * 0.18, L * 0.18);

  // 8. Base Plate & PTFE Glide Skates
  const basePlate = merge(
    box(W * 0.95, 0.04, L * 0.95, 1100, { edges: 0.35 }).move(0, -H * 0.3, 0),
    disc(0, 0.18, 150).move(0, -H * 0.33, -L * 0.38),
    disc(0, 0.22, 180).move(0, -H * 0.33, L * 0.38)
  );

  return [
    P(
      'Ergonomic Palm Arch Shell',
      'Contoured outer exoskeleton crafted from lightweight matte polymer providing palm support and housing internal button actuation ribs.',
      '#8f95aa',
      [I(topShell, [0, 1.4, 0])]
    ),
    P(
      'Primary Button Paddles',
      'Dual cantilever spring-loaded left and right click actuation surfaces engineered with zero pre-travel for crisp finger triggering.',
      '#4fe3e0',
      [I(clickPaddles, [0, 1.1, -0.6])]
    ),
    P(
      'Tactile Microswitch Actuators',
      'High-end mechanical gold-plated contact microswitches rated for 70 million cycles with sub-millisecond actuation response.',
      '#ff6b9a',
      [I(microswitches, [0, 0.7, -0.6])]
    ),
    P(
      'Optical Scroll Wheel Assembly',
      'Knurled rubber traction wheel coupled to an optical rotary encoder reading step detents and continuous free-spinning inertia.',
      '#ffcc80',
      [I(scrollWheel, [0, 0.9, -0.3])]
    ),
    P(
      'Optical Tracking Sensor & Prism',
      'High-DPI optical gaming sensor capturing surface micro-textures up to 30,000 DPI with zero hardware acceleration or smoothing.',
      '#6ff0a8',
      [I(opticalSensor, [0, -0.5, 0])]
    ),
    P(
      'Main Logic PCB & MCU',
      'Low-power 32-bit ARM Cortex microcontroller handling 8000Hz USB polling, 2.4GHz wireless latency mitigation, and power states.',
      '#f2c94c',
      [I(mainPCB, [0, 0.1, 0])]
    ),
    P(
      'Rechargeable Lithium Cell',
      'Protected 500mAh lightweight lithium-polymer cell optimized for balanced center-of-gravity and extended wireless battery endurance.',
      '#ffa726',
      [I(battery, [0, 0.6, 0.6])]
    ),
    P(
      'Chassis Base & PTFE Skates',
      'Rigid lower floor with optical aperture, power toggle, and pure virgin-grade PTFE glide feet minimizing surface friction.',
      '#90caf9',
      [I(basePlate, [0, -1.2, 0])]
    ),
  ];
}
