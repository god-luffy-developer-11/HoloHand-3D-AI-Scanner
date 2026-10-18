# HoloHand (gesture-agent-3d)
## Dev / Creator = tubakhxn

Control exploded 3D models with your bare hands. Your webcam is the background, a hand skeleton and a gold ring follow your hand,
and each model is a glowing point cloud that pulls apart into labelled parts so you can see what is inside.

Everything runs in the browser: MediaPipe Hand Landmarker + Three.js. No backend, no API keys, nothing is uploaded.

## Run

Needs Node.js 18+ and Chrome or Edge.

```bash
cd gesture-agent-3d
npm install
npm run dev
```

Open the URL Vite prints (normally http://localhost:5173) and click **Start camera**. Camera only works on `http://localhost` or `https`.
`npm install` copies the MediaPipe WASM and downloads the hand model into `public/`. If that download is blocked, the app fetches both from a CDN at runtime.

## Models & Verification Status

Models in HoloHand carry an explicit verification badge:

- **Verified Accurate 3D CAD Assets**:
  - **Turbofan Jet Engine** (`VERIFIED`): fan, guide vanes, compressors, combustor, turbines, shaft, nozzle
  - **Radial Aircraft Engine** (`VERIFIED`): crankcase, 9 cylinders, pistons, rods, crankshaft, exhaust ring, supercharger
  - **Sports Car** (`VERIFIED`): body panels, chassis, engine, drivetrain, seats, wheels, brakes
  - **Human Brain** (`VERIFIED`): 4 lobes, cerebellum, brainstem, corpus callosum, thalamus, hippocampus, amygdala, hypothalamus

- **Real-Time Recognized Objects (Conceptual Internal Schematics)**:
  - **Smartphone Architecture** (`ESTIMATED`): front glass/OLED, unibody midframe, logic board & neural SoC, battery pouch, camera cluster, taptic engine, USB-C sub-board, Qi induction coil, rear ceramic glass
  - **Laptop Architecture** (`ESTIMATED`): Retina display, anodized lid, clutch hinges, keyboard deck, Force Touch trackpad, motherboard & heatpipes, dual cooling fans, multi-cell battery, lower enclosure
  - **Optical Mouse / Peripheral** (`ESTIMATED`): ergonomic shell, click paddles, microswitches, optical encoder wheel, tracking sensor & prism, MCU logic board, lithium cell, glide skates
  - **Insulated Container / Bottle** (`ESTIMATED`): threaded cap, outer stainless steel shell, vacuum barrier, inner fluid liner, liquid core, base boot
  - **Botanical Plant Anatomy** (`ESTIMATED`): foliage canopy, xylem water channels, phloem transport bundles, rhizosphere taproot, soil matrix, planter vessel
  - **Electro-Mechanical Tool** (`ESTIMATED`): outer shell, brushless motor, planetary gearbox, control PCB, battery pack, output drive spindle

> **Verification Notice**: Conceptual models are explicitly labeled `ESTIMATED / CONCEPTUAL — NOT VERIFIED`. HoloHand visualizes representative mechanical/anatomical structures and does not pretend webcams can see through solid enclosures.

## JARVIS Holographic Scanner & Object Recognition

- **Real-Time Detection**: Powered by MediaPipe Vision (`ObjectDetector`). Point a phone, laptop, bottle, plant, vehicle, or tool to your webcam.
- **Holographic Reticle**: A futuristic HUD tracking box and targeting crosshair lock onto detected objects in camera space.
- **Auto-Sync Mode**: Automatically switches to the corresponding 3D internal model when an object is recognized with high confidence. Toggle on/off via the **Auto-Sync** button.
- **Custom 3D Model Import**: Drop any `.glb` or `.gltf` file directly onto the browser window (or click **+ Import .GLB**) to load your own verified 3D CAD assets into the holographic runtime.

## Gestures

| Gesture | Effect |
|---|---|
| Open hand slowly | Explode the model. The white arc on the gold ring shows how far. |
| Close your hand / fist | Pull it back together |
| Move or twist your hand | Rotate and tilt the model |
| Point (index finger) | Highlight the part under your fingertip. Hold still to lock it. |
| Pinch while over a part | Grab it, drag it out, release to snap it back |
| Two hands | Move them apart or together to zoom |
| Peace sign (hold ~0.3 s) | Jump to the next model |

## Mouse and keyboard

Drag = rotate · scroll = zoom · click a part = inspect it · `Space` = explode / assemble · `←` `→` or `1`–`9` = switch model · `V` = toggle internal/scanner view · `R` = reset view.
Sliders in the left panel control the explosion and its intensity. The top-right buttons toggle camera background, hand skeleton, labels and fullscreen.

## Files

```
src/main.js             App loop, HUD overlay, gesture & mouse dispatch, UI telemetry
src/objectDetection.js  MediaPipe ObjectDetector engine with hysteresis & state machine
src/hudOverlay.js       Futuristic JARVIS holographic target brackets & telemetry overlay
src/handTracking.js     MediaPipe Hand Landmarker wrapper (GPU/CPU, local WASM + CDN)
src/gestureEngine.js    Landmarks -> gesture, openness, smoothed palm / fingertip / pinch
src/scene.js            Three.js point-cloud renderer: explode, scatter, picking, part dragging
src/gltfLoaderHelper.js GLTF/GLB loader converting 3D meshes into holographic exploded parts
src/models/registry.js  Scalable model registry, verification badges, and object matching
src/models/             Procedural internal geometry definitions (phone, laptop, jet, car, etc.)
test/                   Automated test suites (category matching, badges, geometry validation)
```

