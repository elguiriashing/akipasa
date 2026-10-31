"""Build bounded, self-hosted GLBs from the inspected Blender Studio characters.

Run after inspect-pals-professional-models.py, using the official bpy wheel. The
characters' authored meshes, UVs and colour textures are retained. Blender-only
control rigs, drivers and modifiers are evaluated into a standing mesh, rather
than distributing thousands of production rig controls to a phone. This is an
asset conversion, not a claim that the M3 CharacterStudio engine is installed.
"""
from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path
import re
import struct

import bpy
from mathutils import Matrix, Vector

ROOT = Path.cwd()
SOURCE_ROOT = Path(os.environ.get("RUNNER_TEMP", "/tmp")) / "pals-professional-source"
OUTPUT = ROOT / "public/pals/models/professional"
RECEIPT = ROOT / "docs/receipts/AKIPALS_PROFESSIONAL_ASSET_INSPECTION_20261031.json"
EXPECTED = {
    "rain": "80217f163f6392dc829233d63c2cfb5e1376775bc34101ad14f39631fea70d24",
    "snow": "98d58ef3a07083ede14140bc462cccb55d317062846aa0eb652d2e4a7ac422a6",
}
MODEL_IDS = {"rain": "rain-v3", "snow": "snow-v4"}
VERSION = "20261031"
MAX_TRIANGLES = 120_000
MAX_FILE_BYTES = 12 * 1024 * 1024
MAX_TEXTURE_EDGE = 1024
OUTPUT.mkdir(parents=True, exist_ok=True)
bpy.context.preferences.filepaths.use_scripts_auto_execute = False


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_path(record: dict) -> Path:
    archive = SOURCE_ROOT / (record["id"] + ".zip")
    if digest(archive) != EXPECTED[record["id"]]:
        raise RuntimeError("Official source archive hash changed; review before exporting")
    source = Path(record["blendPath"])
    if not source.is_file():
        matches = list((SOURCE_ROOT / record["id"]).rglob(source.name))
        if len(matches) != 1:
            raise RuntimeError("Inspected Blender source could not be resolved")
        source = matches[0]
    if not source.resolve().is_relative_to(SOURCE_ROOT.resolve()):
        raise RuntimeError("Inspected source is outside the permitted source directory")
    if digest(source) != record["blendSha256"]:
        raise RuntimeError("Inspected Blender source hash changed")
    return source


def restore_snow_materials() -> list[dict]:
    assignments = {
        "GEO-snow-body": ["snow.skin"],
        "GEO-snow-head": ["snow.skin", "snow.skin_darker", "snow.skin_upper_lip", "snow.skin_lower_lip"],
        "GEO-snow-pants": ["snow.pants"],
        "GEO-snow-shirt": ["snow.shirt"],
        "GEO-snow-shoes_base": ["snow.shoe"],
        "GEO-snow-shoes_bottom": ["snow.shoe"],
        "GEO-snow-shoes_parts": ["snow.shoe"],
    }
    restored = []
    for name, materials in assignments.items():
        obj = bpy.data.objects.get(name)
        if obj is None:
            raise RuntimeError(f"Missing expected authored Snow mesh: {name}")
        for index, material_name in enumerate(materials):
            material = bpy.data.materials.get(material_name)
            if material is None:
                raise RuntimeError(f"Missing expected authored Snow material: {material_name}")
            if index >= len(obj.data.materials):
                obj.data.materials.append(material)
            elif obj.data.materials[index] is None:
                obj.data.materials[index] = material
            restored.append({"mesh": name, "slot": index, "material": obj.data.materials[index].name})
    return restored


def standing_pose(rig) -> dict:
    """Use the authored FK controls; retain the source facial expression."""
    properties = []
    for bone in rig.pose.bones:
        for key in bone.keys():
            lowered = key.lower()
            if "ik" in lowered and "fk" in lowered and ("arm" in lowered or "hand" in lowered):
                if isinstance(bone[key], (int, float)):
                    properties.append((bone, key, bone[key]))
    print("PALS_POSE_PROPERTIES " + json.dumps([
        {"bone": bone.name, "key": key, "value": value} for bone, key, value in properties
    ]), flush=True)
    names = {side: next((name for name in (f"FK-Upperarm.{side}", f"FK-UpperArm.{side}")
                        if name in rig.pose.bones), None) for side in ("L", "R")}
    if not all(names.values()):
        raise RuntimeError("Expected authored arm controls are absent")
    original_matrices = {side: rig.pose.bones[name].matrix.copy() for side, name in names.items()}
    # Both official rigs expose a bounded IK/FK switch. Evaluate the two endpoint
    # settings, retaining the setting that actually lowers their deformation arm.
    trials = []
    for mode in (0, 1):
        for bone, key, _ in properties:
            bone[key] = mode
        bpy.context.view_layer.update()
        for side, name in names.items():
            control = rig.pose.bones[name]
            control.matrix = original_matrices[side]
            bpy.context.view_layer.update()
            direction = control.tail - control.head
            sign = 1 if side == "L" else -1
            target = Vector((sign * 0.30, -0.035, -0.953)).normalized()
            rotation = direction.normalized().rotation_difference(target).to_matrix().to_4x4()
            pivot = control.head.copy()
            control.matrix = Matrix.Translation(pivot) @ rotation @ Matrix.Translation(-pivot) @ control.matrix
            bpy.context.view_layer.update()
        endpoint = []
        for bone in rig.pose.bones:
            lower = bone.name.lower()
            if lower.startswith("def-") and "forearm" in lower:
                endpoint.append(float(bone.tail.z))
        trials.append((sum(endpoint) / max(1, len(endpoint)), mode))
    selected = min(trials)[1]
    for bone, key, _ in properties:
        bone[key] = selected
    bpy.context.view_layer.update()
    # Reapply the selected pose, since the last trial may have used the other mode.
    for side, name in names.items():
        control = rig.pose.bones[name]
        control.matrix = original_matrices[side]
        bpy.context.view_layer.update()
        sign = 1 if side == "L" else -1
        target = Vector((sign * 0.30, -0.035, -0.953)).normalized()
        rotation = (control.tail - control.head).normalized().rotation_difference(target).to_matrix().to_4x4()
        pivot = control.head.copy()
        control.matrix = Matrix.Translation(pivot) @ rotation @ Matrix.Translation(-pivot) @ control.matrix
        bpy.context.view_layer.update()
    return {"method": "authored-FK-controls-baked", "controls": names, "ikFkEndpoint": selected,
            "trials": [{"forearmMeanHeight": height, "mode": mode} for height, mode in trials]}


def image_for_tile(image, tile: int, folder: Path):
    if image.source != "TILED":
        return image
    # Blender's glTF material exporter cannot describe UDIMs. Unpack only inside
    # the already validated official source tree, then use each authored tile.
    try:
        if image.packed_files:
            image.unpack(method="WRITE_LOCAL")
    except RuntimeError:
        pass
    basename = Path(bpy.path.abspath(image.filepath)).name
    basename = basename.replace("<UDIM>", str(tile))
    basename = re.sub(r"(?<!\d)1001(?!\d)", str(tile), basename)
    choices = list(folder.rglob(basename))
    if not choices:
        # Packed image names sometimes retain a Blender duplicate suffix.
        stem = re.sub(r"\.\d{3}$", "", image.name)
        stem = re.sub(r"(?<!\d)1001(?!\d)", str(tile), stem)
        choices = list(folder.rglob(stem))
    if not choices:
        raise RuntimeError(f"Authored texture tile {tile} is missing for {image.name}")
    return bpy.data.images.load(str(choices[0]), check_existing=True)


def mobile_material(source, tile: int, folder: Path, cache: dict):
    key = (source.name, tile)
    if key in cache:
        return cache[key]
    result = bpy.data.materials.new(source.name + f".mobile.{tile}")
    result.use_nodes = True
    result.diffuse_color = source.diffuse_color
    nodes = result.node_tree.nodes
    principled = nodes.get("Principled BSDF")
    color = tuple(min(1, max(0, value)) for value in source.diffuse_color)
    principled.inputs["Base Color"].default_value = color
    principled.inputs["Roughness"].default_value = 0.72
    principled.inputs["Metallic"].default_value = 0.0
    if source.use_nodes:
        original = next((node for node in source.node_tree.nodes if node.type == "BSDF_PRINCIPLED"), None)
        if original:
            for field in ("Base Color", "Roughness", "Metallic"):
                if field in original.inputs and not original.inputs[field].is_linked:
                    principled.inputs[field].default_value = original.inputs[field].default_value
        images = [node.image for node in source.node_tree.nodes if node.type == "TEX_IMAGE" and node.image]
        diffuse = next((img for img in images if any(word in img.name.lower() for word in ("diffuse", "albedo", "basecolor", "base_color"))), None)
        if diffuse is None and "eyes" in source.name.lower():
            diffuse = next((img for img in images if "eyes.png" in img.name.lower()), None)
        if diffuse:
            authored = image_for_tile(diffuse, tile, folder)
            # Use one capped, embedded colour image per source. Keeping the UVs
            # and authored colour map avoids substituting a flat grey material.
            if max(authored.size) > MAX_TEXTURE_EDGE:
                ratio = MAX_TEXTURE_EDGE / max(authored.size)
                authored.scale(max(1, round(authored.size[0] * ratio)), max(1, round(authored.size[1] * ratio)))
            texture = nodes.new("ShaderNodeTexImage")
            texture.image = authored
            result.node_tree.links.new(texture.outputs["Color"], principled.inputs["Base Color"])
    if "cornea" in source.name.lower():
        principled.inputs["Alpha"].default_value = 0.10
        principled.inputs["Roughness"].default_value = 0.16
        result.surface_render_method = "DITHERED"
    if "eyedot" in source.name.lower() or "eye_dot" in source.name.lower():
        principled.inputs["Base Color"].default_value = (1, 1, 1, 1)
    cache[key] = result
    return result


def replace_materials(mesh, originals: list, folder: Path, cache: dict):
    uv = mesh.uv_layers.active.data if mesh.uv_layers.active else None
    slots = []
    indexes = {}
    assignments = []
    for polygon in mesh.polygons:
        source = originals[min(polygon.material_index, len(originals) - 1)]
        if source is None:
            raise RuntimeError(f"Unresolved material on {mesh.name}")
        tiled = source.use_nodes and any(node.type == "TEX_IMAGE" and node.image and node.image.source == "TILED" for node in source.node_tree.nodes)
        u = v = 0
        if tiled and uv:
            center = sum((uv[i].uv for i in polygon.loop_indices), Vector((0, 0))) / len(polygon.loop_indices)
            u, v = math.floor(center.x), math.floor(center.y)
        tile = 1001 + u + 10 * v
        material = mobile_material(source, tile, folder, cache)
        if material.name not in indexes:
            indexes[material.name] = len(slots)
            slots.append(material)
        assignments.append(indexes[material.name])
        if tiled and uv:
            for index in polygon.loop_indices:
                uv[index].uv -= Vector((u, v))
    mesh.materials.clear()
    for material in slots:
        mesh.materials.append(material)
    for polygon, index in zip(mesh.polygons, assignments):
        polygon.material_index = index


def export_character(record: dict) -> dict:
    source = source_path(record)
    bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False, use_scripts=False)
    bpy.context.preferences.filepaths.use_scripts_auto_execute = False
    restored = restore_snow_materials() if record["id"] == "snow" else []
    selected = [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and obj.name.startswith("GEO-") and obj.visible_get() and not obj.hide_render]
    # Snow's rendered eyes may be hidden by the source viewport's material mode.
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH" and obj.name.startswith("GEO-") and not obj.hide_render and "eye" in obj.name.lower() and "viewport" not in obj.name.lower() and obj not in selected:
            obj.hide_set(False)
            selected.append(obj)
    if len(selected) < 10:
        raise RuntimeError("Official character has too few visible authored meshes")
    rig = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE" and obj.name.startswith("RIG"))
    pose = standing_pose(rig)
    for obj in selected:
        for modifier in obj.modifiers:
            if modifier.type == "SUBSURF":
                modifier.levels = 1 if any(part in obj.name for part in ("head", "hair", "eye")) else 0
                modifier.render_levels = modifier.levels
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    collection = bpy.data.collections.new("AkiPals professional character")
    bpy.context.scene.collection.children.link(collection)
    mobile = []
    material_cache = {}
    for obj in selected:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = bpy.data.meshes.new_from_object(evaluated, preserve_all_data_layers=True, depsgraph=depsgraph)
        mesh.transform(obj.matrix_world)
        originals = list(mesh.materials)
        if not originals:
            raise RuntimeError(f"Authored mesh has no materials: {obj.name}")
        replace_materials(mesh, originals, source.parent, material_cache)
        result = bpy.data.objects.new(obj.name + "-mobile", mesh)
        collection.objects.link(result)
        mobile.append(result)
    # Remove everything but the evaluated authored character: no source scripts,
    # cameras, lights, hidden nude alternates, control bones or helper widgets.
    for obj in list(bpy.context.scene.objects):
        if obj not in mobile:
            bpy.data.objects.remove(obj, do_unlink=True)
    triangles = sum(sum(len(p.vertices) - 2 for p in obj.data.polygons) for obj in mobile)
    if triangles > MAX_TRIANGLES:
        ratio = MAX_TRIANGLES / triangles * 0.96
        for obj in mobile:
            if len(obj.data.polygons) < 300:
                continue
            bpy.context.view_layer.objects.active = obj
            modifier = obj.modifiers.new("Bounded mobile mesh", "DECIMATE")
            modifier.ratio = ratio
            modifier.use_collapse_triangulate = True
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    points = [obj.matrix_world @ vertex.co for obj in mobile for vertex in obj.data.vertices]
    minimum = Vector(tuple(min(point[i] for point in points) for i in range(3)))
    maximum = Vector(tuple(max(point[i] for point in points) for i in range(3)))
    height = maximum.z - minimum.z
    if not 0.5 < height < 4:
        raise RuntimeError(f"Unexpected authored character height {height}")
    center = Vector(((minimum.x + maximum.x) / 2, (minimum.y + maximum.y) / 2, minimum.z))
    scale = 1.8 / height
    # glTF converts Blender Z-up to Y-up. The authored front (-Y) becomes +Z.
    transform = Matrix.Diagonal(Vector((scale, scale, scale, 1))) @ Matrix.Translation(-center)
    for obj in mobile:
        obj.data.transform(transform)
        obj.select_set(True)
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    filename = f"{MODEL_IDS[record['id']]}-{VERSION}.glb"
    destination = OUTPUT / filename
    bpy.ops.export_scene.gltf(filepath=str(destination), export_format="GLB", use_selection=True,
                              export_yup=True, export_apply=False, export_animations=False,
                              export_cameras=False, export_lights=False, export_extras=False,
                              export_image_format="AUTO", export_texcoords=True, export_normals=True,
                              export_materials="EXPORT", export_morph=False, export_skins=False)
    blob = destination.read_bytes()
    if len(blob) > MAX_FILE_BYTES:
        raise RuntimeError(f"Mobile GLB exceeds {MAX_FILE_BYTES} bytes: {len(blob)}")
    json_length = struct.unpack_from("<I", blob, 12)[0]
    gltf = json.loads(blob[20:20 + json_length])
    if gltf.get("skins") or gltf.get("animations"):
        raise RuntimeError("Baked character unexpectedly contains a production control rig")
    if any("uri" in image for image in gltf.get("images", [])):
        raise RuntimeError("GLB unexpectedly references an external image")
    return {"id": MODEL_IDS[record["id"]], "name": record["id"].title(),
            "url": "/pals/models/professional/" + filename, "sha256": digest(destination), "bytes": len(blob),
            "source": record["source"], "sourcePage": f"https://studio.blender.org/characters/{record['id']}/",
            "archiveSha256": record["archiveSha256"], "blendSha256": record["blendSha256"],
            "license": "CC-BY-4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
            "credit": record["credit"], "engine": "three-gltf", "pose": pose,
            "modifications": ["Baked authored standing pose and modifiers; removed production rig and hidden helper geometry.",
                              "Reduced subdivision/triangles for mobile; normalized height to 1.8 metres.",
                              "Converted authored materials to glTF PBR, retained colour textures capped at 1024px, and split UDIM tiles.",
                              "Blender-only roughness, SSS and detail-normal shader effects are omitted."],
            "restoredMaterialSlots": restored,
            "meshCount": len(gltf.get("meshes", [])), "materialCount": len(gltf.get("materials", [])),
            "textureCount": len(gltf.get("images", [])), "joints": 0,
            "triangles": sum(sum(len(p.vertices) - 2 for p in obj.data.polygons) for obj in mobile),
            "boundsMetres": {"height": 1.8, "width": (maximum.x - minimum.x) * scale, "depth": (maximum.y - minimum.y) * scale},
            "embeddedScriptsExecuted": False}


records = json.loads(RECEIPT.read_text())["characters"]
manifest = {"version": VERSION, "format": "glTF 2.0", "blenderVersion": bpy.app.version_string,
            "models": [export_character(record) for record in records]}
(OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
(OUTPUT / "ATTRIBUTION.txt").write_text(
    "AkiPals professional character assets\n\n"
    "Rain Rig (CC) Blender Foundation | studio.blender.org\n"
    "Snow Rig (CC) Blender Foundation | studio.blender.org\n\n"
    "Licensed under Creative Commons Attribution 4.0 International (CC-BY-4.0).\n"
    "https://creativecommons.org/licenses/by/4.0/\n"
    "Sources: https://studio.blender.org/characters/rain/ and https://studio.blender.org/characters/snow/\n\n"
    "Modified for AkiPals: baked standing poses and production modifiers, removed helper/control geometry,\n"
    "reduced geometry and textures for mobile, adapted authored materials to glTF PBR, and normalized scale.\n"
    "These models use the shared Three.js GLB renderer; the full M3 CharacterStudio engine is not included.\n"
    "Source archive, Blender source and GLB SHA-256 hashes are recorded in manifest.json.\n"
)
print("PALS_PROFESSIONAL_EXPORT " + json.dumps(manifest), flush=True)
