# Landing implementation polish — 2026-09-13

## Result

Preserved landing copy, navigation appearance, typography, palette, section order,
Lenis, demand rendering, DPR handling, and the existing environment shader.
Implemented reactive motion preferences, shared DOM/scene timing, scanned rock
materials, physical launcher plaques, readable hub branding, and curved game
imports. Existing uncommitted work was preserved; nothing was committed or pushed.

## Timeline findings and fix

`sceneProgress` now has an explicit MotionValue subscription. Its effect immediately
recomputes from the current scroll position whenever reduced motion changes, and
unsubscribes on cleanup. The QA override was exercised while stationary and while
scrolling: 0.48 -> 0.465, then scrolling to 0.52 -> 0.532, then disabling the
override -> 0.52 immediately.

The installed Motion implementation refreshes transform callbacks on render, so the
specific claim that this installed `useTransform` necessarily retains its initial
callback was not supported by source inspection. Two additional concrete problems
were verified and fixed:

- Motion's installed `useReducedMotion` captures the OS setting only at mount.
  A shared `useSyncExternalStore` media-query hook now observes live changes.
- Changing the preference recreated `navigate` and replayed initial hash navigation.
  With `#how`, toggling moved scrollY from 10368 to 8748. Initial hash navigation is
  now guarded; repeated ON/OFF tests retain 10368 exactly.

DOM reveals and process steps now consume sceneProgress too. At raw progress
approximately 0.499 in reduced motion, both the camera and the visible “Find what
fits next” step use the 0.532 beat. The reduced camera samples the authored snapped
position instead of remaining at the home camera throughout the experience.

## Asset audit and visual changes

- `RockTerrain.jsx`: connected 70 x 64 height field, 180 x 160 subdivisions, with a
  second distant layer; previously only unique procedural normal/roughness maps.
  Kept the landscape and its vertex-color variation, adjusted ridge erosion, and
  reused the unique procedural normal as detail and fallback.
- New `RockMaterial.jsx`: 2K scanned albedo, OpenGL normal, roughness and height.
  UV repeats 7 x 6.4 preserve corresponding PBR features; a separate full-landscape
  detail frequency breaks repetition. Color is sRGB; data maps are non-color.
  Anisotropy is capped at the renderer limit or 8. Displacement is 0.12 world units.
  Roughness is constrained to approximately 0.66-0.91 to avoid icy/glossy rock.
  Cloned material maps are disposed; loader-owned source textures remain cached.
- `LandingCanvas.jsx`: grazing key at [-14, 9, 6], restrained rear/fill light,
  stronger existing shadow contribution, and fog moved from 22-65 to 30-78.
  No bloom, postprocessing, extra light objects, or renderer replacement added.
- `PhysicalSlab.jsx` was already a usable rounded chassis/edge/front system and was
  reused. Track/Understand/Recommend now share a slightly more readable orientation
  and 0.16 thickness with correctly offset faces. They clear before the dashboard
  enters, rather than obscuring it during the handoff.
- `FeatureObjects.jsx`: existing launcher text faces now have matte beveled chassis.
  The existing library-stack hub gets a legible DECK'D / LIBRARY face. The hub is
  shown for both library and platform import beats.
- Existing `importMotion.js` was unused by the rendered story. It now drives actual
  Elden Ring and Cyberpunk cover meshes from launcher positions, through the hub,
  into matching dashboard slots. Paths are scroll-derived and reversible; source
  plaques activate subtly. Dashboard art remains populated beneath the incoming
  covers, which stay attached after arrival.
- The live scene already had no giant arrow, meaningless cubes, or launcher spheres.
  No claim is made that those were deleted in this pass. Obsolete, unmounted scene
  components were not rewritten. Existing game art and text-based platform branding
  were reused; no new game art or external logos were downloaded.
- Cover textures and terrain maps are preloaded. A blocked rock-normal request was
  tested: the scene remained mounted with its dark procedural rock material.

## New assets and license

Four 2048 x 2048 WebP maps, total 3,549,858 bytes (3.55 MB), from
[Poly Haven Rock Boulder Dry](https://polyhaven.com/a/rock_boulder_dry), CC0.
Authors: Dimitrios Savva and Rico Cilliers. Converted from the 2K JPG sources using
the existing Sharp dependency. Complete filenames, source URLs and conversion
settings are in `src/assets/landing/terrain/README.md`.

## Exact files changed in this task

Paths below are relative to `web/`. Several were already untracked or modified when
this task started; this list identifies this task's edits, not the whole Git diff.

| File                                                      | Change                                                      |
| --------------------------------------------------------- | ----------------------------------------------------------- |
| src/pages/landing/redesign/Landing.jsx                    | Reactive preference; preserve scroll on preference changes  |
| src/pages/landing/redesign/hooks/useMasterTimeline.jsx    | Explicit scene-progress subscription                        |
| src/pages/landing/redesign/hooks/useMotionPreference.js   | New reactive OS preference hook                             |
| src/pages/landing/redesign/sections/_typography.jsx       | Shared scene clock for DOM reveals/visibility               |
| src/pages/landing/redesign/sections/HowItWorksSection.jsx | Shared scene clock for process steps                        |
| src/pages/landing/redesign/canvas/SceneController.jsx     | Authored reduced-motion camera beats                        |
| src/pages/landing/redesign/canvas/LandingCanvas.jsx       | Lighting, shadow contribution, fog                          |
| src/pages/landing/redesign/canvas/RockTerrain.jsx         | Ridge erosion and PBR material integration                  |
| src/pages/landing/redesign/canvas/RockMaterial.jsx        | New PBR material, detail blending, fallback                 |
| src/pages/landing/redesign/canvas/CinematicWorld.jsx      | Preload covers, slab depth, handoff visibility, hub texture |
| src/pages/landing/redesign/canvas/FeatureObjects.jsx      | Plaques, hub, imported game meshes                          |
| src/pages/landing/redesign/canvas/importMotion.js         | Match visible launcher/hub coordinates                      |
| src/pages/landing/redesign/canvas/importMotion.test.mjs   | New docking/continuity/reversibility tests                  |
| src/pages/landing/redesign/canvas/sceneTextures.js        | Readable hub face and import ownership comment              |
| src/assets/landing/README.md                              | Register terrain asset set                                  |
| src/assets/landing/terrain/README.md                      | New source/license/processing record                        |
| src/assets/landing/terrain/rock_albedo.webp               | New CC0 color map                                           |
| src/assets/landing/terrain/rock_normal.webp               | New CC0 OpenGL normal map                                   |
| src/assets/landing/terrain/rock_roughness.webp            | New CC0 roughness map                                       |
| src/assets/landing/terrain/rock_height.webp               | New CC0 displacement map                                    |
| src/pages/landing/redesign/IMPLEMENTATION_REPORT.md       | This report                                                 |

## Validation

- `npm run build`: passes, 2949 modules transformed. Existing large-chunk warning remains.
- `npm run lint`: exit 0, no new warnings. Four unrelated warnings remain in
  Dashboard.jsx, Devices.jsx, AuthContext.jsx, and the old landing Service.jsx.
- `node --test src/pages/landing/redesign/hooks/timelinePhases.test.mjs src/pages/landing/redesign/canvas/importMotion.test.mjs`:
  7 passed, 0 failed. On this host the executable was explicitly
  `C:\Program Files\nodejs\node.exe` because the bare node command resolved incorrectly.
- Runtime QA override OFF/ON/OFF, continued scrolling, live OS preference switching,
  reduced-motion cold load, and hash-preserving preference switching: passed.
- Stationary review at 0, 0.15, 0.30, 0.405, 0.465, 0.532, 0.70 and 0.90;
  additional docking, library, platform, customize and contact checks completed.
- Desktop screenshots at 1920x1080, 1600x900, 1440x900 and 1366x768; mobile at 390x844.
  No horizontal overflow. Text remains separate from the main product region.
- Normal-scale zero vs 0.85 comparison visibly confirms rock surface response;
  original setting restored. Texture-failure fallback verified separately.
- Automated 121-frame scroll sample at 1440x900/DPR 1: median frame interval 13.3 ms,
  p95 33.6 ms. Contact frame: 14 draw calls, 180976 triangles including shadow rendering,
  79 geometries, 31 textures. Zero additional frames during a 500 ms idle observation.
- Production preview inspected at hero, track, platforms and contact: no page errors,
  one canvas, no development QA controls. No temporary debugging left in source.

## Remaining limitations

Performance figures describe this browser session, not a guarantee on every laptop
or DPR 1.5 device. The existing Three.js Clock and PCFSoftShadowMap deprecations remain;
dependency upgrades and bundle splitting were outside this implementation scope.
The dashboard is still an illustrative canvas texture with existing sample data.
The import demonstrates the story with existing cover assets; it does not create
real launcher connections. Platform branding remains clean text, not official logos.
Scanned maps add a 3.55 MB compressed download; cold network loading still takes time.

Screenshots are stored in the task's visualization directory, outside application
assets, including production frames, all viewport sheets, reduced-motion frames,
and the normal/fallback comparisons.
