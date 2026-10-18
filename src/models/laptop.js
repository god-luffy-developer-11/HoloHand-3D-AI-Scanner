import { Cloud, P, I, box, ring, disc, frustum, merge, R } from './shapes.js';

/**
 * Conceptual 3D Internal Architecture of a Modern Laptop Computer.
 * Explicitly conceptual / estimated internal components.
 */
export function buildLaptop() {
  const W = 3.2, D = 2.1, H = 0.12;

  // 1. Retina Display Panel & Bezel (tilted back at 115 degrees)
  const displayLid = box(W, 2.0, 0.04, 1600, { edges: 0.35 })
    .rotate(-0.4, 0, 0)
    .move(0, 0.95, -0.9);
  const displayPanel = box(W * 0.94, 1.88, 0.012, 1800)
    .rotate(-0.4, 0, 0)
    .move(0, 0.95, -0.88);

  // 2. Dual Friction Hinge Mechanism
  const hinges = merge(
    box(0.35, 0.08, 0.08, 300).move(-W * 0.35, 0.06, -D * 0.44),
    box(0.35, 0.08, 0.08, 300).move(W * 0.35, 0.06, -D * 0.44)
  );

  // 3. Top Case Keyboard Deck & Backlight Matrix
  const keyboardDeck = merge(
    box(W, 0.02, D, 1500, { edges: 0.3 }),
    // Keycap grid
    box(W * 0.86, 0.015, D * 0.45, 1200).move(0, 0.02, -D * 0.12)
  );

  // 4. Force Touch Trackpad & Haptic Sensors
  const trackpad = merge(
    box(W * 0.38, 0.015, D * 0.32, 700, { edges: 0.4 }).move(0, 0.018, D * 0.3),
    // 4 corner strain gauges
    box(0.08, 0.02, 0.08, 80).move(-W * 0.16, 0.01, D * 0.18),
    box(0.08, 0.02, 0.08, 80).move(W * 0.16, 0.01, D * 0.18),
    box(0.08, 0.02, 0.08, 80).move(-W * 0.16, 0.01, D * 0.42),
    box(0.08, 0.02, 0.08, 80).move(W * 0.16, 0.01, D * 0.42)
  );

  // 5. Main Logic Board with CPU / GPU & Sintered Heatpipes
  const motherboard = merge(
    box(W * 0.65, 0.022, D * 0.35, 1300).move(0, -0.01, -D * 0.14),
    // Unified SoC Processor with Integrated RAM
    box(0.48, 0.025, 0.48, 600).move(0, 0.01, -D * 0.14),
    // Dual sintered copper heatpipes running to exhausts
    box(W * 0.72, 0.018, 0.08, 450).move(0, 0.02, -D * 0.28),
    // SSD Storage NAND Modules
    box(0.24, 0.015, 0.32, 250).move(-W * 0.22, 0.01, -D * 0.14),
    box(0.24, 0.015, 0.32, 250).move(W * 0.22, 0.01, -D * 0.14)
  );

  // 6. Dual Centrifugal Cooling Fans & Copper Radiator Fins
  const coolingSystem = merge(
    // Left Fan & Radiator
    ring(0.38, 0, 350).move(-W * 0.38, 0.01, -D * 0.28),
    disc(0, 0.36, 450, 0).move(-W * 0.38, 0.01, -D * 0.28),
    box(0.12, 0.06, 0.32, 250).move(-W * 0.46, 0.01, -D * 0.28),
    // Right Fan & Radiator
    ring(0.38, 0, 350).move(W * 0.38, 0.01, -D * 0.28),
    disc(0, 0.36, 450, 0).move(W * 0.38, 0.01, -D * 0.28),
    box(0.12, 0.06, 0.32, 250).move(W * 0.46, 0.01, -D * 0.28)
  );

  // 7. Multi-Cell Lithium-Polymer Battery Pack (6-cell layout)
  const batteryArray = merge(
    box(W * 0.28, 0.04, D * 0.34, 450).move(-W * 0.32, -0.015, D * 0.26),
    box(W * 0.28, 0.04, D * 0.34, 450).move(W * 0.32, -0.015, D * 0.26),
    box(W * 0.32, 0.035, D * 0.18, 350).move(-W * 0.32, -0.015, -0.02),
    box(W * 0.32, 0.035, D * 0.18, 350).move(W * 0.32, -0.015, -0.02),
    box(W * 0.3, 0.035, D * 0.18, 300).move(0, -0.015, -0.02)
  );

  // 8. Lower CNC Aluminum Unibody Enclosure
  const bottomCase = merge(
    box(W, 0.02, D, 1500, { edges: 0.4 }),
    // Rubber footings
    disc(0, 0.06, 60, -0.015).move(-W * 0.42, 0, -D * 0.42),
    disc(0, 0.06, 60, -0.015).move(W * 0.42, 0, -D * 0.42),
    disc(0, 0.06, 60, -0.015).move(-W * 0.42, 0, D * 0.42),
    disc(0, 0.06, 60, -0.015).move(W * 0.42, 0, D * 0.42)
  );

  return [
    P(
      'Display Panel & Glass',
      'Ultra-thin mini-LED backlit Liquid Retina XDR display panel delivering wide P3 color gamut and 120Hz adaptive ProMotion refresh rate.',
      '#4fe3e0',
      [I(displayPanel, [0, 1.4, -0.8])]
    ),
    P(
      'Anodized Aluminum Display Lid',
      'CNC-milled aerospace aluminum clamshell housing integrating Wi-Fi/Bluetooth antenna arrays, ambient light sensors, and FaceTime webcam.',
      '#8f95aa',
      [I(displayLid, [0, 1.8, -1.3])]
    ),
    P(
      'Friction Hinge Assembly',
      'High-torque stainless steel clutch hinge mechanism delivering smooth 135-degree one-finger opening and structural rigidity.',
      '#ffcc80',
      [I(hinges, [0, 0.8, -0.9])]
    ),
    P(
      'Keyboard Deck & Backlight',
      'Scissor-mechanism Magic Keyboard key array mounted atop illuminated fiber-optic light guide plates and spill-resistant barrier layer.',
      '#6ff0a8',
      [I(keyboardDeck, [0, 1.2, 0])]
    ),
    P(
      'Force Touch Trackpad',
      'Solid-state glass trackpad equipped with four perimeter force sensors and electromagnets producing customizable haptic click feedback.',
      '#ff6b9a',
      [I(trackpad, [0, 0.9, 0.8])]
    ),
    P(
      'Motherboard & Unified SoC',
      'Logic board hosting high-performance unified memory architecture, hardware ray tracing cores, secure enclave coprocessor, and PCIe Gen4 NVMe.',
      '#f2c94c',
      [I(motherboard, [0, 0.4, -0.5])]
    ),
    P(
      'Dual Thermal Cooling Fans',
      'High-efficiency centrifugal blowers driving pressurized airflow over vapor chamber copper heat pipes and micro-fin radiator exhausts.',
      '#35e6ff',
      [I(coolingSystem, [0, 0.6, -1.2])]
    ),
    P(
      'Multi-Cell Li-Po Battery',
      'High-capacity 99.6-watt-hour multi-cell lithium-polymer battery configuration engineered to maximize internal chassis volume.',
      '#ffa726',
      [I(batteryArray, [0, -0.7, 0.6])]
    ),
    P(
      'Bottom Unibody Enclosure',
      'Structural chassis base precision-machined with internal stiffening ribs, intake airflow grilles, and vibration-dampening feet.',
      '#b0bec5',
      [I(bottomCase, [0, -1.4, 0])]
    ),
  ];
}
