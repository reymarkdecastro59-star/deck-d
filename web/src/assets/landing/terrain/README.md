# Rock material

Source: [Rock Boulder Dry](https://polyhaven.com/a/rock_boulder_dry), Poly Haven.
Authors: Dimitrios Savva (photography), Rico Cilliers (processing).
License: [CC0](https://polyhaven.com/license). Downloaded 2026-09-13.
Metadata retrieved with the Poly Haven public API (Powered by Poly Haven).

All four maps are 2048 x 2048. Original 2K JPG maps were converted with the
existing Sharp dependency to WebP, quality 86 (normal: 95). Total: 3,549,858 bytes.

| Local file          | Original source filename       | Use                                                |
| ------------------- | ------------------------------ | -------------------------------------------------- |
| rock_albedo.webp    | rock_boulder_dry_diff_2k.jpg   | sRGB color, cold material tint                     |
| rock_normal.webp    | rock_boulder_dry_nor_gl_2k.jpg | OpenGL tangent-space normal, non-color             |
| rock_roughness.webp | rock_boulder_dry_rough_2k.jpg  | Non-color, remapped to 0.66-0.91 roughness         |
| rock_height.webp    | rock_boulder_dry_disp_2k.jpg   | Non-color, restrained 0.12 world-unit displacement |

Download base: `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/rock_boulder_dry/`.
Cached source textures are preloaded. Material-owned clones use repeat wrapping
and renderer-capped anisotropy, and are disposed at unmount. The existing unique
procedural normal supplies a separate detail frequency and fallback surface.
No new game art, launcher logo, HDRI, or mist assets were added.
