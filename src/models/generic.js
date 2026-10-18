import { Cloud, P, I, box, ring, disc, frustum, merge, R } from './shapes.js';

/**
 * Conceptual 3D Internal Architecture of an Electro-Mechanical Device / Tool.
 * Explicitly conceptual / estimated internal components.
 */
export function buildGenericMech() {
  const W = 1.6, H = 2.2, D = 1.2;

  // 1. Reinforced Outer Shell
  const shell = merge(
    box(W, H, D, 1600, { edges: 0.35 }),
    box(W * 0.95, H * 0.95, D * 0.95, 400)
  );

  // 2. High-Torque Brushless Motor
  const motor = merge(
    frustum(0.38, 0.38, 0.7, 750, { rings: 4, lines: 4, cap0: true, cap1: true }).move(0, 0.2, 0),
    frustum(0.08, 0.08, 1.1, 300, { lines: 3 }).move(0, 0.2, 0),
    ring(0.42, 0.2, 160)
  );

  // 3. Planetary Gear Reduction Train
  const gearbox = merge(
    frustum(0.42, 0.42, 0.45, 650, { rings: 3, cap0: true, cap1: true }).move(0, 0.8, 0),
    ring(0.45, 0.8, 180),
    ring(0.35, 0.9, 140)
  );

  // 4. Main Control PCB & Power MOSFETs
  const pcb = merge(
    box(W * 0.82, 0.03, D * 0.82, 900, { edges: 0.3 }).move(0, -0.25, 0),
    box(0.32, 0.05, 0.32, 220).move(-0.25, -0.22, 0),
    box(0.2, 0.08, 0.35, 180).move(0.3, -0.21, 0)
  );

  // 5. High-Discharge Battery Power Unit
  const batteryUnit = merge(
    box(W * 0.8, 0.45, D * 0.75, 1100, { edges: 0.3 }).move(0, -0.65, 0),
    frustum(0.12, 0.12, 0.4, 200).move(-0.3, -0.65, 0),
    frustum(0.12, 0.12, 0.4, 200).move(0, -0.65, 0),
    frustum(0.12, 0.12, 0.4, 200).move(0.3, -0.65, 0)
  );

  // 6. Output Drive Spindle & Coupling
  const driveOutput = merge(
    frustum(0.12, 0.12, 0.5, 400, { cap1: true }).move(0, 1.25, 0),
    disc(0, 0.22, 160, 1.1)
  );

  return [
    P(
      'Reinforced Ergonomic Enclosure',
      'Impact-resistant polycarbonate/ABS composite housing with internal structural gussets and vibration-damping elastomer overmolding.',
      '#8f95aa',
      [I(shell, [0, 0, 1.4])]
    ),
    P(
      'Brushless Electric Drive Motor',
      'High-efficiency brushless DC motor featuring rare-earth neodymium permanent magnets, multi-phase copper windings, and Hall sensors.',
      '#6ff0a8',
      [I(motor, [-1.1, 0.2, 0])]
    ),
    P(
      'Planetary Gear Reduction Box',
      'Multi-stage hardened steel planetary gear set providing precision torque multiplication and speed reduction under heavy load.',
      '#ffcc80',
      [I(gearbox, [0, 1.1, 0])]
    ),
    P(
      'Control PCB & Motor Driver',
      'Microprocessor control unit with high-current MOSFET inverter bridges, closed-loop RPM feedback, and thermal cutoff protection.',
      '#4fe3e0',
      [I(pcb, [1.1, -0.2, 0])]
    ),
    P(
      'Lithium Energy Storage Cell',
      'High-discharge lithium-ion battery pack with integrated intelligent Battery Management System (BMS) balancing individual cells.',
      '#f2c94c',
      [I(batteryUnit, [0, -1.2, 0])]
    ),
    P(
      'Output Drive Spindle',
      'Hardened steel output shaft supported by dual sealed angular contact ball bearings transmitting rotational torque to tool end.',
      '#ff6b9a',
      [I(driveOutput, [0, 1.6, 0])]
    ),
  ];
}
