# Directed landing implementation

The existing landing now renders the authored world developed in the graybox pass. The same scene geometry, object identities, camera poses and master scroll drive graybox and material views. The original five-section structure, navigation, contact actions and Motion/Lenis/R3F stack remain.

## Files changed in this pass

- `Landing.jsx`: development previs controls and world selection.
- `canvas/LandingCanvas.jsx`: authored world, retained demand rendering, adjusted key light and shadow strength.
- `canvas/SceneController.jsx`: authored shot camera and development-only renderer counters.
- `canvas/previsShots.js`: twelve story landmarks, restrained camera rails and four viewport profiles.
- `canvas/previsShots.test.mjs`: meaningful coverage of reduced-motion handoffs, camera continuity and stable reading intervals.
- `canvas/PrevisWorld.jsx`: shared physical cards, persistent process rig, dashboard modules, launcher plaques, terrain masses and final deck. Despite the filename, this is the shared graybox/material renderer.
- `canvas/directedMaterials.js`: illustrative panel UI, generated once as canvas textures, including the selected Hades state.
- `canvas/PrevisOverlay.jsx`, `canvas/previs.css`: named frames, scroll scrubber, thirds and reduced-motion controls. Enabled only by `?previs` in development.
- `hooks/useMasterTimeline.jsx`: twelve reduced-motion compositions and feature holds, with reactive preference dependencies preserved.
- `hooks/timelinePhases.js`: revised section boundaries, navigation and feature pacing.
- `sections/AboutSection.jsx`: aligned copy timings and removed duplicate platform row.
- `sections/HowItWorksSection.jsx`: Track/Understand/Recommend copy follows the authored stages.
- `sections/ContactSection.jsx`, `sections/deck-sections.css`: intimate upper-left closing copy and preserved contact actions.
- `src/assets/landing/deckd-wordmark.svg`: vector treatment of the existing circle/wordmark identity.

Pre-existing authenticated work and unrelated landing files were preserved. No packages installed, commits created, pushes or deployments performed.

## Shot and object architecture

The old presentation group copied the camera quaternion and position every frame, making product objects behave like a screen overlay. The active scene instead keeps objects in world coordinates. Position/target keyframes describe small dolly movements; equal endpoints give complete holds through product proof and the close. No global rollercoaster spline, orbiting camera, particles or postprocessing.

Eight GameCard instances persist from the opening deck through the library, process and product phases. Elden Ring moves forward into Track. Stardew Valley, Hollow Knight and Hades become the three recommendation candidates. Hades advances and lands in the physical dashboard recommendation area. At resolution, the same cards stack while dashboard modules fold behind the frame, which becomes the branded front card. No opacity replacement is used for these handoffs.

Cards have rounded bodies, physical edges, a separate artwork surface and dark backs. Panels have shallow rounded chassis and inset faces. The product frame remains fixed while analytics and recommendation modules advance subtly in depth. Supporting launcher plaques are asymmetric and sit at different depths.

## Pacing

| Scroll  | Action                         |
| ------- | ------------------------------ |
| 0–10%   | Home establish                 |
| 10–16%  | Deck separates                 |
| 16–27%  | Fragmentation                  |
| 27–33%  | Convergence                    |
| 33–40%  | Track                          |
| 40–48%  | Understand                     |
| 48–57%  | Candidates and Hades selection |
| 57–63%  | Hades enters dashboard         |
| 63–68%  | Unified library                |
| 68–73%  | Playtime                       |
| 73–78%  | Recommendations                |
| 78–83%  | Platforms                      |
| 83–88%  | Customization                  |
| 88–94%  | Dashboard resolves into deck   |
| 94–100% | Contact hold                   |

## References

- [EverSwap](https://everswap.com/): inspected live landscape and scroll progression; informed continuous terrain and supporting objects along one journey. No mountain geometry, branding or DeFi motifs copied.
- [Pendragon](https://pendragoncycle.com/story/): inspected entry and story page; informed depth hierarchy, foreground framing and restrained holds. No fantasy styling, particles or imagery copied.
- [Oryzo](https://oryzo.ai/): inspected hero and following product composition; informed persistence of one hero object through different contexts. No cork, satire or assets copied.
- [The Spark](https://spark.thedigitalpanda.com/): inspected live entry and chapter framing; the brief's narrative-arc guidance informed unequal beat durations. The full press-and-hold experience was not replayed, so no claim of exhaustive motion research is made. No characters, terminal styling or cyberpunk effects copied.
- [Forged](https://forged.build/): inspected garage entry and interior scroll scene; informed one-direction movement and physical foreground grounding. No automotive or garage aesthetic copied.

## Validation

- Captured all twelve neutral-material frames at 1440×900 before restoring artwork. Reviewed their focal hierarchy and handoff continuity. Corrected a Hades jump at 88%, overlapping dashboard modules and an exposed rig during convergence.
- Exercised scroll forward/reverse and reduced-motion controls in the browser.
- Rendered checks at 1920×1080, 1440×900, 1366×768 and 390×844. Portrait required a wider lens and a shifted aim so the whole dashboard fits below the compact feature UI.
- `node.exe --test` on `previsShots.test.mjs`, `timelinePhases.test.mjs`, and `importMotion.test.mjs`: 10 passed. Some retained tests cover the prior helper systems; the new shot tests cover the active camera.
- Production build passes. Existing bundle-size warning remains.
- Lint passes with two existing warnings in `AuthContext.jsx` and legacy `Service.jsx`; no warnings in the changed implementation.
- The active scene retains demand rendering, capped DPR and one shadow map. Development browser sample at the stable product shot: 74 draw calls, 27,904 triangles. The frame counter remained at 11 across separate idle observations. Reduced-motion docking reported exactly 0.595 scene progress. These counts are not an FPS benchmark.

## Compromises and limitations

Portrait prioritizes readable copy and a complete product silhouette; tiny in-world UI is primarily for desktop. Terrain remains deliberately low-detail and faceted. This is an illustrative product story with sample data, not a connection to authenticated services or proof of new platform integrations. No cross-device GPU benchmark or full reference-site audit was performed. Prior scene/helper files remain in the checkout to preserve existing work, but the old CinematicWorld is no longer imported by the active canvas.

Graybox captures and rendered checks are saved in the task's visualization folder under `storyboard/` and the named viewport PNGs. `?previs` and `?scene-qa` are development-only review entry points.
