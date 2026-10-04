# Landing polish — 2026-09-13

## Scope and result

Polish the existing continuous landing scene and approved composition. Changes are confined to landing canvas modules and the About platform labels. Existing dirty/untracked work was preserved. No dependencies, backend behavior, authentication, commits, or deployment changed.

The journey now moves from the hero deck through a converging library, a shared process spine, dashboard feature states, and a seven-card closing deck. The terrain has a broader shelf/valley profile, large color planes, slope-dependent roughness, and distance-attenuated normals. The sky uses two low-frequency noise layers and horizon haze. Closing fog strengthens gradually. Hero and final deck receive restrained procedural grounding shadows.

## Files changed in this pass

- `canvas/cameraJourney.js`: valley-to-plateau travel, both flanks, elevated closing pullback.
- `canvas/RockTerrain.jsx`: broad shelves, valley recess, macro stone shading.
- `canvas/RockMaterial.jsx`: slope roughness and normal detail fading with distance; shader chunk expansion makes the normal modification effective.
- `canvas/CinematicWorld.jsx`: card convergence, process spine, dashboard states, thin closing layers, sky, contact fog, soft shadow, mobile scale correction, removal of unused texture allocations.
- `canvas/FeatureObjects.jsx`: remove standalone feature slabs; curved, quieter platform paths only during the platform beat; imported covers yield to analytics/compact layout.
- `canvas/PhysicalSlab.jsx`: matte chassis and darker, less reflective inset edge.
- `canvas/sceneTextures.js`: three authored dashboard surface states using existing covers and explicit sample-data labeling.
- `canvas/LandingCanvas.jsx`: shadow filtering radius.
- `sections/AboutSection.jsx`: plain platform names replace imitation logo glyphs.

## Generated asset provenance

No generative-image assets, downloaded assets, new external sources, or license obligations were introduced. All existing covers and scanned terrain files remain unchanged. New resources are authored in code and constructed in memory; there are no new raster asset file paths.

| Resource                     | Source path / runtime key                              | Method                                          | Purpose                                                           | Resolution / approximate size                                    | Replaced                             |
| ---------------------------- | ------------------------------------------------------ | ----------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------ |
| Analytics dashboard          | `canvas/sceneTextures.js`, `dashboard-playtime`        | Procedural Canvas UI, existing dashboard reused | Show a weekly playtime chart inside the product                   | 1200×840; 3.85 MiB RGBA, approximately 5.13 MiB with GPU mipmaps | Separate floating Track slab         |
| Recommendation dashboard     | `canvas/sceneTextures.js`, `dashboard-recommendations` | Procedural Canvas UI, existing dashboard reused | Emphasize the existing recommendation slot without another screen | 1200×840; same memory estimate                                   | Separate floating Recommend slab     |
| Compact dashboard            | `canvas/sceneTextures.js`, `dashboard-customize`       | Procedural Canvas UI, existing covers reused    | Demonstrate an alternate arrangement within the same interface    | 1200×840; same memory estimate                                   | No asset file replaced               |
| Sky atmosphere               | `canvas/CinematicWorld.jsx`, `Environment`             | Procedural GLSL noise                           | Quiet cloud breakup and horizon depth                             | Viewport resolution; no texture allocation/download              | Existing flat glow shader refined    |
| Deck grounding               | `canvas/CinematicWorld.jsx`, `DeckShadow`              | Procedural GLSL alpha falloff on one plane      | Visually connect the hero/final deck with the floor               | Resolution independent; two triangles, no texture download       | None                                 |
| Terrain shelf/valley         | `canvas/RockTerrain.jsx`                               | Procedural geometry and vertex colors           | Broad landscape variation                                         | Existing 180×160 segment terrain retained                        | Existing geometry generation refined |
| Final deck and process spine | `canvas/CinematicWorld.jsx`, existing `Slab` primitive | Procedural Three.js geometry                    | Layered deck payoff and shared process support                    | Seven thin deck slabs and one narrow spine; no raster download   | Three thick closing slabs            |

Runtime dashboard surfaces are hand-authored UI, not AI-generated text or artwork. Existing cover licensing/provenance remains as recorded by the project; this pass does not independently relicense those assets. Unused ribbon, launcher-screen, generic layout, and cropped dashboard texture allocations were removed from the active scene.

## Validation

- `npm run build`: passes. Vite retains its >500 kB chunk advisory (landing canvas about 932 kB minified / 251 kB gzip).
- `npm run lint`: no new warnings; four warnings remain in untouched AuthContext, old Service page, Devices, and Dashboard files.
- `node.exe --test src/pages/landing/redesign/hooks/timelinePhases.test.mjs src/pages/landing/redesign/canvas/importMotion.test.mjs`: 7/7 pass. Use `node.exe` here; the extensionless system `node` resolved to a different executable and produced no test output.
- `git diff --check`: passes.
- Rendered checks: 1920×1080 hero, 1600×900 recommendations, 1440×900 About/process/analytics/platforms/docking/resolve/contact, 1366×768 compact dashboard, 390×844 hero/analytics/contact with reduced motion. Mobile dashboard clipping was corrected and rechecked.
- A reserved GLSL identifier found in the browser was corrected; build alone does not validate shader compilation.
- Final production preview: Contact renders correctly and the browser reports no console errors.

Validation covers sampled scene landmarks and transitions, not an exhaustive hardware performance benchmark. The preview continues to use illustrative sample data and does not add authenticated product capabilities.
