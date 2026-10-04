# DECK'D continuous landing journey

## OBJECTIVE

Implement the supplied five visual keyframes as a continuous, reversible 3D product story.

## SCOPE / FILES

Landing composition, timeline hooks, chapter typography, navigation, canvas and a replacement Hades cover. Existing authentication, backend, dashboard route, contact transport, environment files and unrelated working-tree edits remain outside this change.

## REQUIREMENTS / CONSTRAINTS

Retain React, Motion, R3F, Drei and Lenis. Keep one canvas, fixed lens, semantic DOM copy and actual controls. Use physical depth, distinct feature forms and explicit reading holds. Do not add dependencies, commit, publish, or modify credentials.

## Scene / camera / text / handoff map

| Interval | Camera / environment                                       | Object and secondary content                                                                                                              | Entry / reading / exit / handoff                                                                                                                                                              |
| -------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–18%    | Restrained lateral arc; charcoal navy terrain              | Five beveled game slabs                                                                                                                   | Shared opening clock separates the deck and reveals headline lines, body, then controls. Hold through 13%. Elden Ring passes near the camera at 17%, while its peers spread into the library. |
| 18–36%   | Diagonal lateral and vertical travel; colder navy          | Same selected card, foreground crop, midground collection, distant smaller covers                                                         | Masked library headline, delayed “connected.”, staggered platform labels. Stable reading at 28.5%. Selected cover turns edge-on and releases a session panel.                                 |
| 36–58%   | Lateral/vertical module tracking; steel blue               | Track data, preference graph, recommendation module and candidates at different depths                                                    | Mechanical headline replacement, populated session chart, preference hold, selected Hades recommendation. Modules travel away as Hades docks into the approaching dashboard.                  |
| 58–84%   | Dashboard truck and restrained orbit; product illumination | Thick dashboard anchor, converging launcher layers, curved ribbon, processing prism, labeled platform hub, real dashboard texture regions | Three intro lines reveal, headline contracts, then five feature beats demonstrate and return toward the dashboard. The Hades mesh remains attached in dashboard coordinates.                  |
| 84–100%  | Slow retreat, slight orbit; near-black navy                | The same three dashboard slabs                                                                                                            | Product texture dims as layers separate, narrow and align. Brand mark resolves; final lines, body and contact controls reveal in sequence. Final scene holds.                                 |

## Responsive / performance

Mobile reserves the upper viewport for DOM content and stages the main objects below it. Six covers replace the desktop nine; secondary excursion is reduced. A mobile menu retains chapter access. Reduced motion freezes scene geometry at readable landmarks and removes camera travel and near-camera passes while retaining all feature beats and semantic text.

Canvas rendering runs on demand: scroll, opening animation, preference changes, resizing and asset readiness invalidate it. DPR is capped at 1.5. Textures are shared; generated UI textures and geometry are disposed. No bloom, real-time reflection pass, depth-of-field pass or particle field is used.

## ACCEPTANCE / VALIDATION

- `npm run build`
- `npm run lint` (warnings outside the landing scope are reported separately)
- `node --test src/pages/landing/redesign/hooks/timelinePhases.test.mjs`
- Browser inspection at all 20 development QA landmarks, normal reverse navigation, mobile compositions, menu and contact dialog focus restoration, and reduced-motion preview.

The optional development-only `?scene-qa` selector exposes all landmarks and a reduced-motion preview. It is excluded from production rendering. The normal landing is `/` or `/preview`.

## Product and asset notes

The landing dashboard is a product preview with illustrative session and recommendation data, explicitly labeled inside its UI. It does not fetch or expose a signed-in user's records. Backend feature delivery is not implied by this visual demonstration. The existing contact form reports unavailable configuration locally; its direct email link remains usable.

The Hades placeholder was replaced with [Steam CDN key art](https://cdn.cloudflare.steamstatic.com/steam/apps/1145360/library_600x900.jpg). Other cover art remains from the existing asset collection. Original unused scene modules remain on disk to preserve prior working-tree work; `LandingCanvas.jsx` now mounts `CinematicWorld.jsx`.

Motion reference pages located: [Enpower](https://www.awwwards.com/inspiration/landing-transition-scroll-enpower-trading), [Noomo](https://www.awwwards.com/inspiration/our-story-page-noomo-agency), [OKCC](https://www.awwwards.com/inspiration/work-scroll-animation-okcc-labs), [Luminar](https://www.awwwards.com/inspiration/homepage-luminar), [0110](https://www.awwwards.com/inspiration/3d-scroll-animation-0110-studio-portfolio-web). The user's supplied choreography determines implementation; these pages were not used as asset sources.

## REPORT FORMAT

Report implemented behavior, validation outcomes, and remaining limitations. Do not equate compilation with exact visual fidelity or backend feature completion.
