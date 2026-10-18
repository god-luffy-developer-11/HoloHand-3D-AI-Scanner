import { Cloud, P, I, box, ring, disc, frustum, cylinder, ellipsoid, merge, R } from './shapes.js';

/**
 * Conceptual 3D Internal Architecture of a Modern Smartphone.
 * Explicit internal decomposition: Silicon SoC Processor Chip, Lithium-Ion Battery,
 * CMOS Camera Sensors, Biometric Face ID Sensors, Logic Board, OLED Display, Chassis, etc.
 */
export function buildPhone() {
  const W = 1.4, H = 2.9, D = 0.12;

  // 1. OLED Display & Touch Digitizer
  const screenGlass = box(W, H, 0.015, 1200, { edges: 0.35 }).move(0, 0, 0.06);
  const oledMatrix = box(W * 0.94, H * 0.92, 0.008, 1400).move(0, 0, 0.05);

  // 2. Titanium Unibody Chassis Midframe & Vapor Chamber
  const midframe = merge(
    box(W, H, 0.035, 1800, { edges: 0.4 }),
    box(W * 0.96, H * 0.96, 0.02, 600),
    // Copper vapor chamber cooling strip
    box(W * 0.4, H * 0.65, 0.01, 450).move(-W * 0.05, 0, 0.005)
  ).move(0, 0, 0);

  // 3. Silicon SoC Processor Chip & Neural Engine Die
  const socChip = merge(
    // Silicon microchip die
    box(0.36, 0.36, 0.022, 650, { edges: 0.4 }).move(-W * 0.22, H * 0.28, 0.035),
    // Laser-etched metallic heat spreader
    box(0.30, 0.30, 0.015, 400).move(-W * 0.22, H * 0.28, 0.045),
    // Micro ball-grid solder contact pads
    disc(0, 0.14, 180).move(-W * 0.22, H * 0.28, 0.022)
  );

  // 4. High-Density Lithium-Ion Battery Pack
  const battery = merge(
    // High-capacity lithium polymer pouch cell
    box(W * 0.48, H * 0.58, 0.038, 1600, { edges: 0.2 }).move(W * 0.22, -H * 0.08, 0.01),
    // Battery management system (BMS) safety board
    box(W * 0.44, 0.08, 0.02, 250).move(W * 0.22, H * 0.23, 0.015),
    // Cathode and anode connection tabs
    box(0.08, 0.04, 0.015, 80).move(W * 0.15, H * 0.28, 0.015),
    box(0.08, 0.04, 0.015, 80).move(W * 0.29, H * 0.28, 0.015)
  );

  // 5. Triple Camera & CMOS Image Sensors
  const cameraModule = merge(
    box(0.55, 0.55, 0.06, 500).move(W * 0.2, H * 0.26, 0.02),
    // Primary 48MP Wide Camera & Sensor-Shift OIS
    frustum(0.08, 0.08, 0.05, 300, { rings: 2 }).move(W * 0.15, H * 0.32, 0.05),
    cylinder(0.04, 0.02, 120).move(W * 0.15, H * 0.32, 0.065),
    // Ultra-Wide Camera Lens
    frustum(0.08, 0.08, 0.05, 300, { rings: 2 }).move(W * 0.28, H * 0.32, 0.05),
    cylinder(0.04, 0.02, 120).move(W * 0.28, H * 0.32, 0.065),
    // Periscope Telephoto Prism Camera
    frustum(0.08, 0.08, 0.05, 300, { rings: 2 }).move(W * 0.21, H * 0.20, 0.05),
    // Flash & LiDAR Scanner Sensor
    disc(0, 0.04, 140).move(W * 0.32, H * 0.21, 0.05)
  );

  // 6. Biometric Face ID & Infrared Sensor Array
  const biometricSensors = merge(
    // Infrared camera sensor
    cylinder(0.035, 0.03, 150).move(-0.12, H * 0.44, 0.03),
    // VCSEL Dot Projector (30,000 invisible dots emitter)
    cylinder(0.035, 0.03, 150).move(0.12, H * 0.44, 0.03),
    // Flood illuminator & ambient light proximity sensor
    disc(0, 0.03, 100).move(0, H * 0.44, 0.03),
    box(0.35, 0.06, 0.02, 220).move(0, H * 0.44, 0.02)
  );

  // 7. Multi-Layer Logic Board & RAM Subsystem
  const mainBoard = merge(
    // High-density HDI PCB substrate
    box(W * 0.46, H * 0.44, 0.022, 1100).move(-W * 0.22, H * 0.24, 0.015),
    // LPDDR5 RAM & NAND Flash Storage ICs
    box(0.26, 0.22, 0.016, 350).move(-W * 0.22, H * 0.12, 0.026),
    // 5G RF Modem & Power Management ICs (PMIC)
    box(0.18, 0.32, 0.014, 300).move(-W * 0.4, H * 0.24, 0.024)
  );

  // 8. Taptic Engine Linear Resonant Actuator
  const tapticEngine = merge(
    box(0.42, 0.22, 0.03, 600, { edges: 0.3 }).move(-W * 0.22, -H * 0.38, 0.01),
    // Internal oscillating tungsten mass
    box(0.28, 0.12, 0.02, 300).move(-W * 0.22, -H * 0.38, 0.01)
  );

  // 9. USB-C Sub-Board & Speaker Chamber
  const subBoard = merge(
    box(0.46, 0.16, 0.02, 450).move(0, -H * 0.44, 0.01),
    box(0.28, 0.07, 0.03, 350).move(0, -H * 0.47, 0.01),
    box(0.38, 0.18, 0.035, 500).move(W * 0.24, -H * 0.38, 0.01)
  );

  // 10. Qi2 / MagSafe Wireless Induction Coil
  const wirelessCoil = merge(
    ring(0.36, -0.01, 350),
    ring(0.30, -0.01, 300),
    ring(0.24, -0.01, 250),
    ring(0.18, -0.01, 200),
    disc(0, 0.12, 180, -0.01),
    // Circular magnetic positioning ring
    ring(0.40, -0.01, 240)
  ).move(0, -0.05, -0.02);

  // 11. Rear Ceramic Glass Cover
  const rearGlass = merge(
    box(W, H, 0.015, 1200, { edges: 0.3 }).move(0, 0, -0.06),
    box(0.62, 0.62, 0.02, 350).move(W * 0.2, H * 0.26, -0.07)
  );

  return [
    P(
      'Front Cover Glass & OLED',
      'Ceramic Shield ion-exchange glass bonded to ultra-high refresh rate OLED pixel matrix and capacitive touch digitizer.',
      '#4fe3e0',
      [I(merge(screenGlass, oledMatrix), [0, 0, 2.0])]
    ),
    P(
      'Titanium Chassis Midframe',
      'Structural unibody aerospace-grade titanium alloy skeleton with integrated copper vapor chamber for passive heat dissipation.',
      '#8f95aa',
      [I(midframe, [0, 0, 0])]
    ),
    P(
      'Silicon SoC Processor Chip',
      'Central neural processor die with high-performance CPU cores, multi-core GPU, Neural Engine, and metallic heat spreader.',
      '#f59e0b',
      [I(socChip, [-1.5, 1.2, 0.9])]
    ),
    P(
      'Lithium-Ion Battery Cell',
      'High-energy density polymer pouch battery providing continuous power distribution with dedicated BMS and thermal safety monitors.',
      '#eab308',
      [I(battery, [1.4, -0.3, 0.7])]
    ),
    P(
      'Triple Camera & CMOS Sensors',
      'Optical cluster comprising wide, ultra-wide, and telephoto periscope lenses with sensor-shift optical image stabilization and LiDAR.',
      '#ff6b9a',
      [I(cameraModule, [1.5, 1.1, -0.8])]
    ),
    P(
      'Biometric Face ID Sensor Array',
      'Infrared camera sensor, VCSEL dot projector, ambient light sensor, and proximity sensor for 3D facial authentication.',
      '#a855f7',
      [I(biometricSensors, [0, 1.7, 0.8])]
    ),
    P(
      'Multi-Layer Logic Board & RAM',
      'High-density interconnect PCB substrate hosting LPDDR5 RAM, high-speed storage flash, 5G RF transceivers, and PMICs.',
      '#6ff0a8',
      [I(mainBoard, [-1.2, 0.5, 0.5])]
    ),
    P(
      'Taptic Engine Actuator',
      'Linear resonant electromagnetic haptic motor producing sub-millisecond vibrational feedback simulating mechanical clicks.',
      '#b388ff',
      [I(tapticEngine, [-1.2, -0.9, 0.5])]
    ),
    P(
      'USB-C Sub-Board & Speaker',
      'Daughterboard managing high-speed USB-C PD power negotiation, digital audio transmission, microphones, and acoustic resonator chamber.',
      '#ffa726',
      [I(subBoard, [0, -1.6, 0.4])]
    ),
    P(
      'Wireless Induction Coil',
      'Planar copper inductive charging coil with ferromagnetic shielding supporting MagSafe magnetic alignment and wireless charging.',
      '#ffcc80',
      [I(wirelessCoil, [0, -0.2, -1.2])]
    ),
    P(
      'Rear Ceramic Glass Cover',
      'Satin-finish dual-ion exchanged toughened rear glass plate protecting internal wireless coils while permitting uninterrupted RF transmission.',
      '#90caf9',
      [I(rearGlass, [0, 0, -2.0])]
    ),
  ];
}
