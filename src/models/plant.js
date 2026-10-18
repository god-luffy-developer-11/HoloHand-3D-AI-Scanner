import { Cloud, P, I, frustum, ring, disc, ellipsoid, merge, R } from './shapes.js';

/**
 * Conceptual 3D Internal Architecture of a Potted Botanical Plant.
 * Explicitly conceptual / estimated botanical anatomy.
 */
export function buildPlant() {
  const H = 2.8, POT_R0 = 0.55, POT_R1 = 0.8, POT_H = 1.1;

  // 1. Foliage Canopy & Photosynthetic Cuticle
  const leaves = merge(
    ellipsoid(0.42, 0.12, 0.65, 380).rotate(0.35, 0, 0.4).move(0.55, 0.85, 0.2),
    ellipsoid(0.42, 0.12, 0.65, 380).rotate(0.35, 0, -0.4).move(-0.55, 0.75, 0.2),
    ellipsoid(0.42, 0.12, 0.65, 380).rotate(-0.35, 0, 0.4).move(0.5, 0.95, -0.4),
    ellipsoid(0.42, 0.12, 0.65, 380).rotate(-0.35, 0, -0.4).move(-0.5, 0.9, -0.35),
    ellipsoid(0.35, 0.1, 0.55, 350).rotate(0.1, 0, 0).move(0, 1.25, 0)
  );

  // 2. Stem Xylem Vascular Bundles (Water upwards)
  const xylem = merge(
    frustum(0.045, 0.035, 1.3, 600, { lines: 6 }).move(0, 0.65, 0),
    frustum(0.025, 0.02, 0.55, 250).rotate(0.35, 0, 0.4).move(0.28, 0.75, 0.1),
    frustum(0.025, 0.02, 0.55, 250).rotate(0.35, 0, -0.4).move(-0.28, 0.7, 0.1),
    frustum(0.025, 0.02, 0.55, 250).rotate(-0.35, 0, 0.4).move(0.25, 0.85, -0.2),
    frustum(0.025, 0.02, 0.55, 250).rotate(-0.35, 0, -0.4).move(-0.25, 0.8, -0.2)
  );

  // 3. Stem Phloem Vascular Bundles (Nutrients downwards)
  const phloem = merge(
    ring(0.065, 0.2, 120),
    ring(0.062, 0.4, 120),
    ring(0.058, 0.6, 120),
    ring(0.054, 0.8, 120),
    ring(0.050, 1.0, 120),
    ring(0.045, 1.2, 120)
  );

  // 4. Taproot Core & Root Hair Rhizosphere
  const rootSystem = merge(
    frustum(0.07, 0.02, 0.8, 550, { lines: 4 }).move(0, -0.4, 0),
    // Lateral branching roots
    frustum(0.03, 0.01, 0.45, 250).rotate(0.6, 0.5, 0.2).move(0.2, -0.35, 0.15),
    frustum(0.03, 0.01, 0.45, 250).rotate(-0.6, -0.5, 0.2).move(-0.2, -0.38, -0.15),
    frustum(0.03, 0.01, 0.45, 250).rotate(0.5, -0.7, 0.3).move(-0.18, -0.45, 0.2),
    frustum(0.03, 0.01, 0.45, 250).rotate(-0.5, 0.7, -0.3).move(0.18, -0.48, -0.2)
  );

  // 5. Substrate Soil Matrix & Mineral Granules
  const soil = merge(
    frustum(POT_R0 * 0.94, POT_R1 * 0.94, POT_H * 0.78, 1400, { cap0: true, cap1: true }).move(0, -0.32, 0),
    disc(0, POT_R1 * 0.92, 400, 0.05)
  );

  // 6. Glazed Planter Pot & Drainage Tray
  const planter = merge(
    frustum(POT_R0, POT_R1, POT_H, 1600, { rings: 4, lines: 4, cap0: true }).move(0, -0.32, 0),
    ring(POT_R1 * 1.05, 0.18, 200),
    frustum(POT_R0 * 1.15, POT_R0 * 1.15, 0.18, 500, { cap0: true }).move(0, -0.85, 0)
  );

  return [
    P(
      'Photosynthetic Foliage Canopy',
      'Chlorophyll-dense leaves with waxy hydrophobic cuticles, stomatal respiration apertures, and mesophyll light-harvesting cells.',
      '#6ff0a8',
      [I(leaves, [0, 1.4, 0])]
    ),
    P(
      'Xylem Vascular Bundles',
      'Lignified tubular tracheid and vessel elements generating capillary action to pull water and dissolved nitrates upward from roots.',
      '#35e6ff',
      [I(xylem, [-0.6, 0.6, 0.5])]
    ),
    P(
      'Phloem Transport Network',
      'Living sieve-tube cells and companion cells translocating sucrose and signaling hormones bidirectionally throughout vegetative tissue.',
      '#f2c94c',
      [I(phloem, [0.6, 0.6, -0.5])]
    ),
    P(
      'Root System & Rhizosphere',
      'Geotropic primary taproot and lateral branching root hairs coated in beneficial mycorrhizal fungi maximizing soil nutrient absorption.',
      '#ffcc80',
      [I(rootSystem, [0, -0.4, 0.8])]
    ),
    P(
      'Substrate Soil Matrix',
      'Humus-rich potting medium blended with expanded perlite and coconut coir engineered for optimal moisture retention and aeration.',
      '#ffa726',
      [I(soil, [0, -0.5, -0.8])]
    ),
    P(
      'Ceramic Planter Vessel',
      'Fired porous earthenware vessel glazed to regulate root temperature, equipped with bottom drainage holes preventing root rot.',
      '#ff6b9a',
      [I(planter, [0, -1.3, 0])]
    ),
  ];
}
