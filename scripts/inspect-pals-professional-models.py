"""Inspect fixed, public Blender Studio assets without executing embedded scripts."""
import hashlib
import json
import os
from pathlib import Path
import urllib.request
import zipfile

import bpy

ROOT = Path.cwd()
ASSET_ROOT = Path(os.environ.get("RUNNER_TEMP", "/tmp")) / "pals-professional-source"
SOURCES = {
    "rain": "https://studio.blender.org/download-source/files/ee/a7/eea73e55dba1cea31c09848df6a794b2-4.zip",
    "snow": "https://studio.blender.org/download-source/files/ba/0f/ba0fe6d810333b1d73c1c359e4dc03cb-6.zip",
}
ASSET_ROOT.mkdir(parents=True, exist_ok=True)
bpy.context.preferences.filepaths.use_scripts_auto_execute = False
receipts = []
for name, url in SOURCES.items():
    archive = ASSET_ROOT / (name + ".zip")
    if not archive.exists():
        request = urllib.request.Request(url, headers={"User-Agent": "AkiPals-licensed-asset-build/1.0"})
        with urllib.request.urlopen(request, timeout=120) as response, archive.open("wb") as output:
            total = 0
            while chunk := response.read(1024 * 1024):
                total += len(chunk)
                if total > 200 * 1024 * 1024:
                    raise RuntimeError("Source archive exceeds the bounded download budget")
                output.write(chunk)
    folder = ASSET_ROOT / name
    folder.mkdir(exist_ok=True)
    with zipfile.ZipFile(archive) as bundle:
        if sum(item.file_size for item in bundle.infolist()) > 600 * 1024 * 1024:
            raise RuntimeError("Source extraction exceeds the bounded budget")
        for item in bundle.infolist():
            destination = (folder / item.filename).resolve()
            if not destination.is_relative_to(folder.resolve()):
                raise RuntimeError("Unsafe archive path")
            if (item.external_attr >> 16) & 0o170000 == 0o120000:
                raise RuntimeError("Archive symlinks are not admitted")
        bundle.extractall(folder)
    candidates = sorted(folder.rglob("*.blend"), key=lambda path: path.stat().st_size, reverse=True)
    if not candidates:
        raise RuntimeError("Official archive contains no Blender character")
    source = candidates[0]
    bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False, use_scripts=False)
    bpy.context.preferences.filepaths.use_scripts_auto_execute = False
    objects = []
    for obj in bpy.data.objects:
        if obj.type not in {"MESH", "ARMATURE"}:
            continue
        entry = {"name": obj.name, "type": obj.type, "visible": obj.visible_get(), "hideRender": obj.hide_render,
                 "dimensions": list(obj.dimensions), "modifiers": [{"name": mod.name, "type": mod.type} for mod in obj.modifiers]}
        if obj.type == "MESH":
            entry.update(vertices=len(obj.data.vertices), polygons=len(obj.data.polygons),
                         materials=[material.name if material else None for material in obj.data.materials],
                         shapeKeys=list(obj.data.shape_keys.key_blocks.keys()) if obj.data.shape_keys else [])
        else:
            entry["bones"] = [{"name": bone.name, "deform": bone.use_deform} for bone in obj.data.bones]
        objects.append(entry)
    materials = []
    for material in bpy.data.materials:
        materials.append({"name": material.name, "diffuseColor": list(material.diffuse_color),
                          "images": [{"name": node.image.name, "size": list(node.image.size)} for node in material.node_tree.nodes if node.type == "TEX_IMAGE" and node.image] if material.use_nodes else []})
    record = {"id": name, "source": url, "archiveSha256": hashlib.sha256(archive.read_bytes()).hexdigest(),
              "blendPath": str(source), "blendSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
              "license": "CC-BY-4.0", "credit": name.title() + " Rig (CC) Blender Foundation | studio.blender.org",
              "blenderVersion": bpy.app.version_string, "objects": objects, "materials": materials}
    receipts.append(record)
    print("PALS_CHARACTER_INSPECTION " + json.dumps(record), flush=True)
destination = ROOT / "docs/receipts/AKIPALS_PROFESSIONAL_ASSET_INSPECTION_20261031.json"
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(json.dumps({"sourceOnly": True, "embeddedScriptsExecuted": False, "characters": receipts}, indent=2) + "\n")
