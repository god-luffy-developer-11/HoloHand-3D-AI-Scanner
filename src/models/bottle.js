import { Cloud, P, I, frustum, ring, disc, merge, R } from './shapes.js';

/**
 * Conceptual 3D Internal Architecture of an Insulated Vacuum Bottle / Container.
 * Explicitly conceptual / estimated internal components.
 */
export function buildBottle() {
  const H = 2.8, R_OUT = 0.65, R_IN = 0.54, R_CORE = 0.46;

  // 1. Threaded Cap & Silicone Hermetic Gasket
  const cap = merge(
    frustum(0.42, 0.45, 0.45, 600, { rings: 4, cap1: true }).move(0, H * 0.52, 0),
    ring(0.46, H * 0.36, 180),
    disc(0, 0.42, 250, H * 0.35)
  );

  // 2. Outer Vacuum Shell (Stainless Steel 18/8)
  const outerShell = merge(
    frustum(R_OUT, R_OUT, H * 0.72, 1600, { rings: 5, lines: 4 }).move(0, -H * 0.08, 0),
    frustum(R_OUT, 0.42, H * 0.18, 500, { rings: 2 }).move(0, H * 0.37, 0)
  );

  // 3. Thermal Vacuum Insulation Barrier
  const vacuumBarrier = merge(
    frustum((R_OUT + R_IN) / 2, (R_OUT + R_IN) / 2, H * 0.7, 900, { rings: 3 }).move(0, -H * 0.08, 0),
    disc(0, (R_OUT + R_IN) / 2, 200, -H * 0.43)
  );

  // 4. Food-Grade Inner Liner Chamber
  const innerLiner = merge(
    frustum(R_IN, R_IN, H * 0.68, 1400, { rings: 4, cap0: true }).move(0, -H * 0.08, 0),
    frustum(R_IN, 0.38, H * 0.16, 400).move(0, H * 0.34, 0)
  );

  // 5. Internal Liquid Volume & Meniscus
  const liquidCore = merge(
    frustum(R_CORE, R_CORE, H * 0.55, 1500, { cap0: true, cap1: true }).move(0, -H * 0.12, 0)
  );

  // 6. Impact-Dampening Base Boot
  const baseBoot = merge(
    frustum(R_OUT * 1.02, R_OUT * 1.02, H * 0.14, 550, { cap0: true }).move(0, -H * 0.42, 0),
    ring(R_OUT * 1.02, -H * 0.49, 120)
  );

  return [
    P(
      'Insulated Threaded Cap',
      'Dual-wall polypropylene twist cap fitted with food-grade silicone compression gasket ensuring leakproof hermetic seal.',
      '#ffcc80',
      [I(cap, [0, 1.3, 0])]
    ),
    P(
      'Outer Protective Stainless Shell',
      'Durable 18/8 pro-grade stainless steel exterior finished with slip-resistant condensation-free electro-powder coating.',
      '#8f95aa',
      [I(outerShell, [0.8, 0, 0])]
    ),
    P(
      'High-Vacuum Thermal Barrier',
      'De-pressurized inter-wall vacuum chamber with reflective copper coating blocking conductive, convective, and radiative heat transfer.',
      '#b388ff',
      [I(vacuumBarrier, [0, 0, 0.8])]
    ),
    P(
      'Electropolished Inner Reservoir',
      'Non-reactive electropolished stainless chamber engineered to prevent flavor absorption, mineral scaling, and bacterial adhesion.',
      '#4fe3e0',
      [I(innerLiner, [-0.8, 0, 0])]
    ),
    P(
      'Hydration Fluid Volume',
      'Encapsulated liquid volume core maintaining isothermal thermal equilibrium up to 24 hours cold or 12 hours hot.',
      '#35e6ff',
      [I(liquidCore, [0, 0, -0.9])]
    ),
    P(
      'Non-Slip Base Protector',
      'Shock-absorbing vulcanized silicone base boot absorbing mechanical impacts and dampening surface acoustic noise.',
      '#ff6b9a',
      [I(baseBoot, [0, -1.2, 0])]
    ),
  ];
}
