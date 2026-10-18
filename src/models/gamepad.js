import { Cloud, P, I, box, ring, disc, frustum, cylinder, ellipsoid, merge, R } from './shapes.js';

/**
 * Conceptual 3D Internal Architecture of a Modern Gaming Controller / Gamepad.
 * Accurate mechanical and electronic component breakdown.
 */
export function buildGamepad() {
  const W = 2.5; // Width span across both grip wings
  const L = 1.7; // Depth from triggers to grip tips
  const H = 0.85; // Thickness

  // 1. Ergonomic Front Faceplate & Grip Shells
  const leftGripFront = ellipsoid(0.35, 0.35, 0.7, 500)
    .rotate(0.2, 0.2, -0.35)
    .move(-W * 0.36, -0.08, L * 0.18);
  const rightGripFront = ellipsoid(0.35, 0.35, 0.7, 500)
    .rotate(0.2, -0.2, 0.35)
    .move(W * 0.36, -0.08, L * 0.18);
  const centerFaceplate = merge(
    box(W * 0.5, 0.04, L * 0.55, 650, { edges: 0.3 }).move(0, H * 0.18, -L * 0.05),
    leftGripFront,
    rightGripFront,
    disc(0, 0.24, 200).move(-W * 0.24, H * 0.2, -L * 0.04), // Left stick bezel
    disc(0, 0.24, 200).move(W * 0.18, H * 0.2, L * 0.14) // Right stick bezel
  );

  // 2. Dual Analog Thumbsticks & Potentiometers
  const makeStick = (x, y, z) =>
    merge(
      disc(0, 0.22, 280, 0).move(x, y + 0.18, z), // Textured thumb cap
      ring(0.22, 0.04, 180).move(x, y + 0.17, z),
      cylinder(0.05, 0.16, 120, { rings: 2 }).move(x, y + 0.08, z), // Pivot stem
      box(0.24, 0.2, 0.24, 300).move(x, y - 0.04, z), // 2-axis potentiometer gimbal box
      cylinder(0.06, 0.08, 80).rotate(0, 0, Math.PI / 2).move(x + 0.13, y - 0.04, z), // X-potentiometer
      cylinder(0.06, 0.08, 80).rotate(Math.PI / 2, 0, 0).move(x, y - 0.04, z - 0.13) // Y-potentiometer
    );
  const leftStick = makeStick(-W * 0.24, H * 0.12, -L * 0.04);
  const rightStick = makeStick(W * 0.18, H * 0.12, L * 0.14);
  const thumbsticks = merge(leftStick, rightStick);

  // 3. D-Pad, Action Buttons & Menu Tactile Switches
  const dpad = merge(
    box(0.14, 0.08, 0.44, 350).move(-W * 0.24, H * 0.18, L * 0.14), // Vertical bar
    box(0.44, 0.08, 0.14, 350).move(-W * 0.24, H * 0.18, L * 0.14) // Horizontal bar
  );
  const abxy = merge(
    cylinder(0.08, 0.09, 120).move(W * 0.28, H * 0.2, -L * 0.16), // Y (North)
    cylinder(0.08, 0.09, 120).move(W * 0.36, H * 0.2, -L * 0.06), // B (East)
    cylinder(0.08, 0.09, 120).move(W * 0.28, H * 0.2, 0.04), // A (South)
    cylinder(0.08, 0.09, 120).move(W * 0.2, H * 0.2, -L * 0.06) // X (West)
  );
  const menuButtons = merge(
    cylinder(0.05, 0.06, 70).move(-0.2, H * 0.2, -L * 0.12), // View / Share
    cylinder(0.05, 0.06, 70).move(0.2, H * 0.2, -L * 0.12), // Menu / Options
    cylinder(0.12, 0.07, 160).move(0, H * 0.2, -L * 0.08) // Guide / Home
  );
  const controlsGroup = merge(dpad, abxy, menuButtons);

  // 4. Conductive Elastomer Silicone Membranes
  const membranes = merge(
    box(0.46, 0.02, 0.46, 320, { edges: 0.3 }).move(-W * 0.24, H * 0.08, L * 0.14),
    box(0.44, 0.02, 0.44, 320, { edges: 0.3 }).move(W * 0.28, H * 0.08, -L * 0.06),
    box(0.3, 0.02, 0.16, 150).move(0, H * 0.08, -L * 0.1)
  );

  // 5. Main Controller Motherboard (PCB) & Microcontroller
  const mainPCB = merge(
    box(W * 0.72, 0.03, L * 0.62, 1400, { edges: 0.35 }).move(0, 0, 0),
    box(0.28, 0.04, 0.28, 260).move(0, 0.04, 0.06), // Wireless MCU SoC
    box(0.18, 0.06, 0.14, 180).move(0, 0.04, -L * 0.3), // USB-C charging / data port
    cylinder(0.07, 0.16, 120).rotate(Math.PI / 2, 0, 0).move(0, -0.04, L * 0.28) // 3.5mm audio jack
  );

  // 6. Dual Asymmetric Rumble Vibration Motors
  const makeMotor = (x, y, z, weightSize, count) =>
    merge(
      cylinder(0.18, 0.42, 350).rotate(0.3, 0, 0.25).move(x, y, z), // Motor armature cylinder
      frustum(weightSize * 0.9, weightSize, 0.14, count).rotate(0.3, 0, 0.25).move(x, y + 0.22, z - 0.05) // Eccentric counterweight
    );
  const leftRumble = makeMotor(-W * 0.38, -0.06, L * 0.12, 0.24, 280); // Heavy low-frequency motor
  const rightRumble = makeMotor(W * 0.38, -0.06, L * 0.12, 0.16, 200); // Light high-frequency motor
  const rumbleMotors = merge(leftRumble, rightRumble);

  // 7. Rechargeable Li-Ion Battery Pack & Internal Shield
  const batteryPack = merge(
    box(0.75, 0.18, 0.6, 750, { edges: 0.2 }).move(0, -H * 0.14, 0.04), // Li-Ion Cell
    box(0.85, 0.03, 0.7, 300, { edges: 0.3 }).move(0, -H * 0.04, 0.04) // Retaining cage
  );

  // 8. Shoulder Bumpers & Magnetic Hall-Effect Analog Triggers
  const triggers = merge(
    // Left bumper L1 & right bumper R1
    box(W * 0.3, 0.1, 0.16, 260, { edges: 0.3 }).move(-W * 0.24, H * 0.16, -L * 0.36),
    box(W * 0.3, 0.1, 0.16, 260, { edges: 0.3 }).move(W * 0.24, H * 0.16, -L * 0.36),
    // Left trigger L2 & right trigger R2 (curved ergonomic pull)
    frustum(0.18, 0.24, 0.32, 380, { rings: 2 }).rotate(-0.4, 0, 0).move(-W * 0.24, H * 0.04, -L * 0.44),
    frustum(0.18, 0.24, 0.32, 380, { rings: 2 }).rotate(-0.4, 0, 0).move(W * 0.24, H * 0.04, -L * 0.44)
  );

  // 9. Rear Lower Shell & Textured Ergonomic Grip Backing
  const leftGripRear = ellipsoid(0.36, 0.36, 0.72, 550)
    .rotate(0.2, 0.2, -0.35)
    .move(-W * 0.36, -H * 0.22, L * 0.18);
  const rightGripRear = ellipsoid(0.36, 0.36, 0.72, 550)
    .rotate(0.2, -0.2, 0.35)
    .move(W * 0.36, -H * 0.22, L * 0.18);
  const rearHousing = merge(
    box(W * 0.52, 0.04, L * 0.58, 700, { edges: 0.35 }).move(0, -H * 0.28, -L * 0.04),
    leftGripRear,
    rightGripRear
  );

  return [
    P(
      'Front Faceplate & Palm Grips',
      'Ergonomic molded structural shell with thumbstick rings and button apertures.',
      '#e2e8f0',
      [I(centerFaceplate, [0, 1.4, 0])]
    ),
    P(
      'Dual Analog Thumbsticks',
      'Dual 2-axis potentiometer gimbals with high-friction silicone concave thumb caps.',
      '#38bdf8',
      [I(thumbsticks, [0, 1.1, -0.3])]
    ),
    P(
      'D-Pad & Tactile Action Buttons',
      'Directional D-Pad cross, ABXY diamond cluster, and micro-switch menu buttons.',
      '#f59e0b',
      [I(controlsGroup, [0, 1.25, 0.2])]
    ),
    P(
      'Conductive Silicone Membranes',
      'Elastomer dome cushions bridging physical buttons to motherboard contact pads.',
      '#94a3b8',
      [I(membranes, [0, 0.75, 0])]
    ),
    P(
      'Main Motherboard & Wireless MCU',
      'Multi-layer FR4 PCB with 32-bit ARM processor, Bluetooth transceiver, USB-C, and DAC.',
      '#10b981',
      [I(mainPCB, [0, 0, 0])]
    ),
    P(
      'Dual Asymmetric Rumble Motors',
      'Counterweighted eccentric rotating mass (ERM) motors generating tactile force feedback.',
      '#ec4899',
      [I(rumbleMotors, [-1.3, -0.35, 0.35])]
    ),
    P(
      'Li-Ion Rechargeable Battery',
      'High-capacity lithium-ion power cell with integrated thermal protection circuit.',
      '#8b5cf6',
      [I(batteryPack, [0, -0.85, -0.25])]
    ),
    P(
      'Shoulder Bumpers & Hall Triggers',
      'Tactile microswitch bumpers (L1/R1) and progressive Hall-effect magnetic triggers (L2/R2).',
      '#6366f1',
      [I(triggers, [0, 0.65, -1.35])]
    ),
    P(
      'Rear Lower Housing & Grip Shell',
      'Textured non-slip lower enclosure with battery bay cradle and chassis fasteners.',
      '#475569',
      [I(rearHousing, [0, -1.35, 0])]
    ),
  ];
}
