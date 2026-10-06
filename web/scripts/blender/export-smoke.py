"""Create a tiny deterministic GLB used to validate the local Blender toolchain."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys

import bpy


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, help="Destination .glb file")
    return parser.parse_args(argv)


def main() -> None:
    output = Path(parse_args().output).expanduser().resolve()
    output.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0))
    mesh = bpy.context.active_object
    mesh.name = "DECKD_Smoke_Cube"
    mesh.scale = (1.0, 0.35, 0.65)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    bevel = mesh.modifiers.new(name="WebPreviewBevel", type="BEVEL")
    bevel.width = 0.12
    bevel.segments = 3
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.modifier_apply(modifier=bevel.name)

    material = bpy.data.materials.new(name="DECKD_Smoke_Material")
    material.use_nodes = True
    principled = next(
        node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED"
    )
    principled.inputs["Base Color"].default_value = (0.06, 0.18, 0.32, 1.0)
    principled.inputs["Metallic"].default_value = 0.35
    principled.inputs["Roughness"].default_value = 0.38
    mesh.data.materials.append(material)

    mesh["deckd_asset_units"] = "meters"
    mesh["deckd_forward_axis"] = "-Z"
    mesh["deckd_up_axis"] = "Y"

    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 48
    mesh.rotation_euler[2] = 0.0
    mesh.keyframe_insert(data_path="rotation_euler", index=2, frame=1)
    mesh.rotation_euler[2] = 0.35
    mesh.keyframe_insert(data_path="rotation_euler", index=2, frame=48)

    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_materials="EXPORT",
        export_animations=True,
        export_yup=True,
    )
    print(f"DECKD_GLTF_EXPORT={output}")


if __name__ == "__main__":
    main()
