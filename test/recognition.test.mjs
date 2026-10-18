import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MODEL_REGISTRY,
  VERIFICATION_STATUS,
  VERIFICATION_LABELS,
  matchObjectToModel,
  registerCustomModel,
} from '../src/models/registry.js';
import {
  synthesizeAndRegisterModel,
  buildDynamicHoloModel,
} from '../src/models/aiSynthesizer.js';

test('1. Model Registry integrity & verification status', () => {
  assert.ok(MODEL_REGISTRY.length >= 10, 'Registry must have at least 10 models');

  // Verify existing models are preserved
  const existingIds = ['jet', 'radial', 'car', 'brain'];
  for (const id of existingIds) {
    const m = MODEL_REGISTRY.find((x) => x.id === id);
    assert.ok(m, `Existing model "${id}" must be preserved`);
    assert.equal(
      m.status,
      VERIFICATION_STATUS.VERIFIED,
      `Model "${id}" must be marked VERIFIED`
    );
  }

  // Verify conceptual recognized objects exist
  const newIds = ['phone', 'laptop', 'mouse', 'gamepad', 'keyboard', 'bottle', 'plant', 'generic_mech'];
  for (const id of newIds) {
    const m = MODEL_REGISTRY.find((x) => x.id === id);
    assert.ok(m, `Model "${id}" must exist in registry`);
    assert.equal(
      m.status,
      VERIFICATION_STATUS.ESTIMATED,
      `Recognized model "${id}" must be explicitly marked ESTIMATED`
    );
    assert.match(
      m.note,
      /ESTIMATED|CONCEPTUAL/,
      `Model "${id}" note must explicitly state it is estimated / conceptual`
    );
  }
});

test('2. Verification badges and human-readable labeling', () => {
  assert.equal(
    VERIFICATION_LABELS[VERIFICATION_STATUS.VERIFIED],
    'VERIFIED ACCURATE'
  );
  assert.equal(
    VERIFICATION_LABELS[VERIFICATION_STATUS.ESTIMATED],
    'ESTIMATED / CONCEPTUAL — NOT VERIFIED'
  );
  assert.equal(
    VERIFICATION_LABELS[VERIFICATION_STATUS.CUSTOM],
    'USER IMPORTED MODEL'
  );
});

test('3. Object recognition category matching - Exact & Synonyms', () => {
  // Test phone matching
  const matchPhone = matchObjectToModel('cell phone', 0.92);
  assert.equal(matchPhone.model.id, 'phone');
  assert.equal(matchPhone.status, VERIFICATION_STATUS.ESTIMATED);
  assert.match(matchPhone.explanation, /ESTIMATED \/ CONCEPTUAL/);

  // Test laptop matching
  const matchLaptop = matchObjectToModel('laptop', 0.88);
  assert.equal(matchLaptop.model.id, 'laptop');
  assert.equal(matchLaptop.status, VERIFICATION_STATUS.ESTIMATED);

  // Test keyboard matching (and verify it NEVER matches laptop!)
  const matchKbd = matchObjectToModel('mechanical wireless keyboard', 0.95);
  assert.equal(matchKbd.model.id, 'keyboard');
  assert.equal(matchKbd.status, VERIFICATION_STATUS.ESTIMATED);
  assert.notEqual(matchKbd.model.id, 'laptop');

  const matchKbd2 = matchObjectToModel('keyboard', 0.9);
  assert.equal(matchKbd2.model.id, 'keyboard');
  assert.notEqual(matchKbd2.model.id, 'laptop');

  const matchLaptop2 = matchObjectToModel('laptop', 0.9);
  assert.equal(matchLaptop2.model.id, 'laptop');
  assert.notEqual(matchLaptop2.model.id, 'keyboard');

  // Test bottle matching
  const matchBottle = matchObjectToModel('bottle', 0.85);
  assert.equal(matchBottle.model.id, 'bottle');

  // Test plant matching
  const matchPlant = matchObjectToModel('potted plant', 0.95);
  assert.equal(matchPlant.model.id, 'plant');

  // Test vehicle matching to verified sports car
  const matchCar = matchObjectToModel('car', 0.9);
  assert.equal(matchCar.model.id, 'car');
  assert.equal(matchCar.status, VERIFICATION_STATUS.VERIFIED);
  assert.match(matchCar.explanation, /verified/i);

  // Test airplane matching to verified jet engine
  const matchPlane = matchObjectToModel('airplane', 0.85);
  assert.equal(matchPlane.model.id, 'jet');
  assert.equal(matchPlane.status, VERIFICATION_STATUS.VERIFIED);

  // Test gamepad / game controller does NOT match mouse
  const matchGamepad = matchObjectToModel('gamepad', 0.95);
  assert.equal(matchGamepad.model.id, 'gamepad');
  assert.notEqual(matchGamepad.model.id, 'mouse');

  const matchController = matchObjectToModel('game controller', 0.94);
  assert.equal(matchController.model.id, 'gamepad');
  assert.notEqual(matchController.model.id, 'mouse');

  const matchMouse = matchObjectToModel('mouse', 0.91);
  assert.equal(matchMouse.model.id, 'mouse');
  assert.notEqual(matchMouse.model.id, 'gamepad');
});

test('4. Unknown object handling & graceful no-match state', () => {
  const unmatched = matchObjectToModel('extraterrestrial_artifact', 0.35);
  assert.equal(unmatched.model, null);
  assert.equal(unmatched.matchType, 'UNMATCHED');
  assert.match(unmatched.explanation, /no matching 3D internal model exists/i);

  // Invalid input handling
  const nullMatch = matchObjectToModel(null);
  assert.equal(nullMatch.model, null);
  assert.equal(nullMatch.matchType, 'NONE');
});

import { Cloud, P, I } from '../src/models/shapes.js';

test('5. Custom GLB/GLTF model registration', () => {
  const dummyCustomModel = {
    id: 'test_drone',
    name: 'Tactical Drone',
    build: () => [P('Rotor Blade', 'Carbon fiber propeller', '#4fe3e0', [I(new Cloud().add(0, 0, 0), [0, 1, 0])])],
    status: VERIFICATION_STATUS.CUSTOM,
  };
  const idx = registerCustomModel(dummyCustomModel);
  assert.ok(idx >= 0);
  assert.equal(MODEL_REGISTRY[idx].id, 'test_drone');
  assert.equal(MODEL_REGISTRY[idx].status, VERIFICATION_STATUS.CUSTOM);

  const matchedCustom = matchObjectToModel('tactical drone');
  assert.equal(matchedCustom.model.id, 'test_drone');
});

test('6. All model geometry builders produce valid exploded components', () => {
  for (const m of MODEL_REGISTRY) {
    if (typeof m.build !== 'function') continue;
    const parts = m.build();
    assert.ok(Array.isArray(parts), `Model "${m.name}" build() must return an array`);
    assert.ok(parts.length > 0, `Model "${m.name}" must have at least 1 part`);
    assert.ok(parts.length <= 24, `Model "${m.name}" must not exceed MAXP (24) parts`);

    for (const p of parts) {
      assert.ok(p.name, `Part in "${m.name}" must have a name`);
      assert.ok(p.desc, `Part in "${m.name}" must have a description`);
      assert.ok(p.color, `Part in "${m.name}" must have a hex color`);
      assert.ok(Array.isArray(p.instances), `Part "${p.name}" must have instances`);
      assert.ok(p.instances.length > 0, `Part "${p.name}" must have at least 1 instance`);

      for (const inst of p.instances) {
        assert.ok(inst.cloud, `Instance in "${p.name}" must have a Cloud`);
        assert.ok(inst.cloud.n > 0, `Instance in "${p.name}" must contain points`);
        assert.ok(Array.isArray(inst.dir), `Instance in "${p.name}" must have an explosion dir`);
        assert.equal(inst.dir.length, 3, `Dir in "${p.name}" must be [x, y, z]`);
      }
    }
  }
});

test('7. AI Hologram Synthesizer generates 3D models for arbitrary objects', () => {
  // Test synthesized model for a wristwatch with AI-provided components
  const watchResult = synthesizeAndRegisterModel({
    objectName: 'Smart Wristwatch',
    category: 'Wearables',
    components: [
      {
        name: 'Sapphire Crystal & Bezel',
        description: 'Scratch-resistant cover glass and touch sensor matrix',
        color: '#38bdf8',
        shape: 'cylinder',
        dims: [1.2, 0.1, 1.2],
        offset: [0, 0.4, 0],
        explode_dir: [0, 1.2, 0],
      },
      {
        name: 'AMOLED Display & Silicon SiP',
        description: 'Micro-display panel and system-in-package SoC',
        color: '#10b981',
        shape: 'box',
        dims: [1.0, 0.15, 1.0],
        offset: [0, 0.1, 0],
        explode_dir: [0.8, 0.3, 0],
      },
      {
        name: 'Li-Ion Polymer Micro-Battery',
        description: 'Curved lithium battery cell',
        color: '#8b5cf6',
        shape: 'box',
        dims: [0.9, 0.2, 0.9],
        offset: [0, -0.2, 0],
        explode_dir: [-0.8, -0.3, 0],
      },
      {
        name: 'Bio-Optical Photoplethysmography Sensor',
        description: 'Green and infrared optical biometric pulse sensor array',
        color: '#ec4899',
        shape: 'cylinder',
        dims: [0.7, 0.15, 0.7],
        offset: [0, -0.4, 0],
        explode_dir: [0, -1.2, 0],
      },
    ],
  });

  assert.ok(watchResult.index >= 0);
  assert.equal(watchResult.matchType, 'AI_SYNTHESIZED');
  assert.equal(watchResult.status, VERIFICATION_STATUS.ESTIMATED);
  assert.equal(watchResult.model.name, 'Smart Wristwatch');

  // Verify the synthesized model builds valid 3D point-cloud components
  const parts = watchResult.model.build();
  assert.equal(parts.length, 4);
  for (const part of parts) {
    assert.ok(part.name);
    assert.ok(part.desc);
    assert.ok(part.color);
    assert.ok(part.instances.length > 0);
    assert.ok(part.instances[0].cloud.n > 0);
    assert.equal(part.instances[0].dir.length, 3);
  }

  // Test procedural fallback synthesis for an object without pre-specified components (e.g. coffee mug)
  const mugResult = synthesizeAndRegisterModel({
    objectName: 'Ceramic Coffee Mug',
    category: 'Household',
  });
  assert.ok(mugResult.index >= 0);
  assert.equal(mugResult.model.name, 'Ceramic Coffee Mug');
  const mugParts = mugResult.model.build();
  assert.ok(mugParts.length >= 3);
  assert.ok(mugParts[0].instances[0].cloud.n > 0);
});

test('8. Accessory & Charger separation from parent models (USB Charger -> not Smartphone)', () => {
  // A USB charger or phone charger must NEVER match Smartphone Architecture
  const matchCharger = matchObjectToModel('USB Charger');
  assert.equal(matchCharger.model, null, 'USB Charger must not match any prebuilt CAD model');
  assert.equal(matchCharger.matchType, 'UNMATCHED');

  const matchPhoneCharger = matchObjectToModel('phone charger');
  assert.equal(matchPhoneCharger.model, null, 'Phone charger must not match smartphone CAD model');
  assert.equal(matchPhoneCharger.matchType, 'UNMATCHED');

  const matchCarKeys = matchObjectToModel('car keys');
  assert.equal(matchCarKeys.model, null, 'Car keys must not match sports car model');

  // Actual phone MUST match smartphone
  const matchPhone = matchObjectToModel('smartphone');
  assert.equal(matchPhone.model.id, 'phone');

  // Synthesize USB Charger and verify authentic charger components are built
  const chargerResult = synthesizeAndRegisterModel({
    objectName: 'USB Charger',
    category: 'Electronics',
  });
  assert.equal(chargerResult.model.name, 'USB Charger');
  const chargerParts = chargerResult.model.build();
  assert.ok(chargerParts.length >= 5);
  // Verify it contains transformer or prongs or USB port, NOT a smartphone screen
  const partNames = chargerParts.map((p) => p.name.toLowerCase()).join(' ');
  assert.ok(partNames.includes('transformer') || partNames.includes('prong') || partNames.includes('usb'));
  assert.ok(!partNames.includes('screen'), 'USB Charger must not contain a smartphone screen');
});

test('9. Sequential scanning workflow: Object A -> Enter Lab -> Back to Scanner -> Object B -> Enter Lab loads Object B', () => {
  let activeSelectedModelIndex = -1;

  // Scan 1: Gamepad
  const match1 = matchObjectToModel('gamepad');
  assert.equal(match1.model.id, 'gamepad');
  activeSelectedModelIndex = match1.index;
  assert.equal(MODEL_REGISTRY[activeSelectedModelIndex].id, 'gamepad');

  // Transition to Lab 1: loads Gamepad
  let lab1Model = MODEL_REGISTRY[activeSelectedModelIndex];
  assert.equal(lab1Model.name, 'Wireless Game Controller');

  // User returns to scanner and scans Scan 2: Quadcopter Drone
  const match2 = matchObjectToModel('Quadcopter Drone');
  assert.equal(match2.matchType, 'UNMATCHED');
  const synthesizedDrone = synthesizeAndRegisterModel({
    objectName: 'Quadcopter Drone',
    category: 'Vehicles',
  });
  activeSelectedModelIndex = synthesizedDrone.index;

  // Transition to Lab 2: MUST load Quadcopter Drone (NOT Gamepad, NOT Smartphone, NOT Mouse)
  let lab2Model = MODEL_REGISTRY[activeSelectedModelIndex];
  assert.equal(lab2Model.name, 'Quadcopter Drone');
  assert.notEqual(lab2Model.id, 'phone');
  assert.notEqual(lab2Model.id, 'mouse');
  assert.notEqual(lab2Model.id, 'gamepad');

  // Scan 3: Optical Mouse
  const match3 = matchObjectToModel('optical mouse');
  assert.equal(match3.model.id, 'mouse');
  activeSelectedModelIndex = match3.index;

  // Transition to Lab 3: loads Mouse
  let lab3Model = MODEL_REGISTRY[activeSelectedModelIndex];
  assert.equal(lab3Model.id, 'mouse');
  assert.equal(lab3Model.name, 'Optical Mouse Peripheral');
});

test('10. Comprehensive internal decomposition: Chip, Battery, and Sensors in Smartphone & AI models', () => {
  // 1. Verify Smartphone has Chip, Battery, and Sensors
  const phoneModel = MODEL_REGISTRY.find((m) => m.id === 'phone');
  assert.ok(phoneModel, 'Smartphone model must be in registry');
  const phoneParts = phoneModel.build();
  const partNames = phoneParts.map((p) => p.name.toLowerCase());

  assert.ok(
    partNames.some((n) => n.includes('chip') || n.includes('soc') || n.includes('processor')),
    'Smartphone must contain a distinct Silicon SoC Processor Chip component'
  );
  assert.ok(
    partNames.some((n) => n.includes('battery')),
    'Smartphone must contain a distinct Lithium-Ion Battery component'
  );
  assert.ok(
    partNames.some((n) => n.includes('sensor') || n.includes('camera')),
    'Smartphone must contain distinct optical/biometric Sensor components'
  );

  // 2. Verify AI Synthesized object generates specialized geometry for Chip, Battery, Sensor
  const aiGadget = synthesizeAndRegisterModel({
    objectName: 'Wireless Noise-Canceling Earbuds',
    category: 'Electronics',
    components: [
      {
        name: 'Bluetooth 5.3 SoC Audio Processor Chip',
        description: 'Ultra-low latency audio processing chip with hardware ANC DSP',
        color: '#f59e0b',
        shape: 'chip',
      },
      {
        name: 'High-Density Micro Lithium Power Cell',
        description: 'Rechargeable coin-cell battery with safety monitoring circuitry',
        color: '#eab308',
        shape: 'battery',
      },
      {
        name: 'Dual Beamforming MEMS Microphone Sensor Array',
        description: 'Acoustic pressure sensors measuring ambient noise and voice isolation',
        color: '#ec4899',
        shape: 'sensor',
      },
    ],
  });

  const gadgetParts = aiGadget.model.build();
  assert.equal(gadgetParts.length, 3);
  for (const part of gadgetParts) {
    assert.ok(part.instances[0].cloud.n > 0, `Part ${part.name} must have valid point cloud`);
  }
});
