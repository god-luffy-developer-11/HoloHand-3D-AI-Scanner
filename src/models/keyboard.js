import { Cloud, P, I, box, ring, disc, frustum, ellipsoid, merge, R } from './shapes.js';

/**
 * Conceptual 3D Internal Architecture of a Mechanical Wireless Keyboard.
 * Keycaps, mechanical switches, switch plate, hot-swap PCB, acoustic foam, battery, and aluminum chassis.
 */
export function buildKeyboard() {
  const L = 3.6, W = 1.6, H = 0.55;

  // 1. PBT Double-Shot Keycaps Matrix (6 rows with spacebar, enter, letters)
  const keycapsList = [];
  const rows = 5;
  const cols = 14;
  const kw = (L * 0.88) / cols;
  const kh = (W * 0.82) / rows;
  const startX = -L * 0.44 + kw * 0.5;
  const startZ = -W * 0.41 + kh * 0.5;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Spacebar on bottom row
      if (r === rows - 1 && c >= 4 && c <= 8) {
        if (c === 4) {
          keycapsList.push(
            box(kw * 4.8, 0.14, kh * 0.88, 320, { edges: 0.25 }).move(
              startX + (c + 2) * kw,
              H * 0.38,
              startZ + r * kh
            )
          );
        }
        continue;
      }
      keycapsList.push(
        box(kw * 0.82, 0.12, kh * 0.82, 85, { edges: 0.2 }).move(
          startX + c * kw,
          H * 0.38,
          startZ + r * kh
        )
      );
    }
  }
  const keycaps = merge(...keycapsList);

  // 2. Mechanical Switch Mechanisms (Cross-Stems, Switch Housings, Gold Leaf Springs)
  const switchesList = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === rows - 1 && c >= 5 && c <= 8) continue;
      switchesList.push(
        box(kw * 0.65, 0.16, kh * 0.65, 60).move(startX + c * kw, H * 0.18, startZ + r * kh),
        box(0.08, 0.08, 0.08, 25).move(startX + c * kw, H * 0.28, startZ + r * kh)
      );
    }
  }
  const switches = merge(...switchesList);

  // 3. Anodized Aluminum Switch Plate
  const switchPlate = merge(
    box(L * 0.94, 0.04, W * 0.9, 1400, { edges: 0.2 }).move(0, H * 0.08, 0),
    box(0.1, 0.05, W * 0.88, 120).move(-L * 0.46, H * 0.08, 0),
    box(0.1, 0.05, W * 0.88, 120).move(L * 0.46, H * 0.08, 0)
  );

  // 4. Poron / Silicone Acoustic Dampening Gasket Layer
  const acousticDampener = box(L * 0.92, 0.06, W * 0.88, 1100, { edges: 0.15 }).move(0, 0.0, 0);

  // 5. Multi-Layer Hot-Swap FR4 PCB with SMD RGB LEDs & ARM Controller
  const pcb = merge(
    box(L * 0.94, 0.03, W * 0.9, 1600, { edges: 0.25 }).move(0, -H * 0.08, 0),
    // ARM 32-bit MCU chip & Nordic BLE module
    box(0.35, 0.04, 0.35, 200).move(L * 0.25, -H * 0.05, -W * 0.2),
    box(0.25, 0.03, 0.22, 140).move(L * 0.38, -H * 0.05, -W * 0.2),
    // USB-C controller port
    box(0.24, 0.08, 0.16, 150).move(0, -H * 0.06, -W * 0.44)
  );

  // 6. High-Capacity Rechargeable Li-Ion Polymer Power Cell
  const battery = box(L * 0.48, 0.12, W * 0.36, 850, { edges: 0.3 }).move(-L * 0.12, -H * 0.2, 0);

  // 7. CNC Anodized Aluminum Enclosure with Non-Slip Feet
  const chassis = merge(
    box(L * 1.02, 0.14, W * 1.02, 2200, { edges: 0.3 }).move(0, -H * 0.28, 0),
    disc(0, 0.14, 120).move(-L * 0.42, -H * 0.36, -W * 0.4),
    disc(0, 0.14, 120).move(L * 0.42, -H * 0.36, -W * 0.4),
    disc(0, 0.14, 120).move(-L * 0.42, -H * 0.36, W * 0.4),
    disc(0, 0.14, 120).move(L * 0.42, -H * 0.36, W * 0.4)
  );

  return [
    P('Keycaps Matrix', 'PBT double-shot sculpted profile keycap set with ergonomic curved typing angle', '#38bdf8', [
      I(keycaps, [0, 1.8, 0]),
    ]),
    P('Mechanical Switches', 'High-durability tactile/linear mechanical switches with cross-stems and gold contact leaves', '#ef4444', [
      I(switches, [0, 1.2, 0]),
    ]),
    P('Aluminum Switch Plate', 'Rigid aerospace-grade aluminum switch positioning plate for consistent acoustics', '#94a3b8', [
      I(switchPlate, [0, 0.6, 0]),
    ]),
    P('Acoustic Dampening Foam', 'High-density Poron / custom silicone sound dampener eliminating cavity resonance', '#334155', [
      I(acousticDampener, [0, 0.0, 0]),
    ]),
    P('Hot-Swap FR4 PCB', 'Multi-layer FR4 circuit board with per-key RGB SMD LEDs and ARM 32-bit MCU', '#10b981', [
      I(pcb, [0, -0.6, 0]),
    ]),
    P('Lithium Polymer Battery', 'Rechargeable high-capacity 4000mAh battery cell powering 2.4GHz and Bluetooth 5.2', '#8b5cf6', [
      I(battery, [0, -1.1, 0]),
    ]),
    P('Aluminum Enclosure', 'CNC machined anodized aluminum bottom housing with non-slip silicone feet', '#64748b', [
      I(chassis, [0, -1.7, 0]),
    ]),
  ];
}
