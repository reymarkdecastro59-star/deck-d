# Blender authoring setup

DECK'D uses Blender for detailed source models and GLB for browser delivery. The
local setup currently targets Blender 5.2 LTS. Keep editable `.blend` sources and
their texture provenance alongside the work item; add a GLB to the application
only after its owning scene and loading path are agreed.

## Validate the local export path

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\web\scripts\blender\smoke-test.ps1
```

The command starts Blender without a UI, creates one beveled test mesh with a
PBR material and a short rotation animation, then exports it to
`%TEMP%\deckd-blender-smoke.glb`. It checks the GLB header and confirms the file
contains a mesh, material, and animation. Pass `-OutputPath <path>` to choose
another disposable destination. The smoke asset is validation output and
should not be committed as a website asset.

For production assets, apply transforms, use metres, give meshes and materials
stable names, keep the origin intentional, and preview the exported GLB in the
actual Three.js scene. Measure file size, triangle count, draw calls, texture
memory, and mobile frame time before adding compression or LODs.

## MCP connection

The project config starts the community `mcp-for-blender` 2.1.3 bridge through
`uvx` with Python 3.11. Its protocol-13 Blender add-on is installed and enabled
for Blender 5.2. Telemetry is explicitly disabled in the MCP process and in the
Blender add-on preference.
Restart Codex or Claude after changing MCP config. Then open Blender, press `N`
in the 3D viewport, select **MCP for Blender**, and click
**Connect to MCP server**.

The installed add-on came from the package's bundled installer. Its SHA-256 is
`EB0FACF69781A30E69792532087D8D41C6A14FCD323353250ABE7988EE297FA5`.

The add-on listens on loopback port 9876 and allows the connected MCP client to
execute Blender Python. Start it only while authoring, stop it when finished,
and leave optional online asset and model-generation services disabled unless a
task explicitly needs them and their licensing/provenance has been reviewed.

Upstream: <https://github.com/ahujasid/mcp-for-blender>
