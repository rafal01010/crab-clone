"""Build static/art from the original glTF, GLB, and PNG files listed in DESIGN.md.

Usage: python scripts/prepare-game-art.py INPUT_DIRECTORY (requires Pillow).
Place the listed source files directly in INPUT_DIRECTORY.
"""

import base64
import io
import json
import math
from pathlib import Path
import struct
import sys

from PIL import Image, ImageOps


def read_gltf(path):
    raw = path.read_bytes()
    if path.suffix == '.glb':
        json_length = struct.unpack_from('<I', raw, 12)[0]
        return json.loads(raw[20:20 + json_length]), raw[28 + json_length:]
    doc = json.loads(raw)
    return doc, base64.b64decode(doc['buffers'][0]['uri'].split(',', 1)[1])


def accessor(doc, buffer, index):
    entry = doc['accessors'][index]
    view = doc['bufferViews'][entry['bufferView']]
    offset = view.get('byteOffset', 0) + entry.get('byteOffset', 0)
    width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[entry['type']]
    shape = struct.Struct('<' + {5121: 'B', 5123: 'H', 5125: 'I', 5126: 'f'}[entry['componentType']] * width)
    stride = view.get('byteStride', shape.size)
    return [shape.unpack_from(buffer, offset + index * stride) for index in range(entry['count'])]


def faces(path):
    doc, buffer = read_gltf(path)
    node = next(node for node in doc['nodes'] if node['name'] == path.stem)
    for primitive in doc['meshes'][node['mesh']]['primitives']:
        attrs = primitive['attributes']
        positions = accessor(doc, buffer, attrs['POSITION'])
        indices = accessor(doc, buffer, primitive['indices'])
        material = doc['materials'][primitive['material']]
        pbr = material['pbrMetallicRoughness']
        color_texture = pbr.get('baseColorTexture')
        if color_texture:
            image = doc['images'][doc['textures'][color_texture['index']]['source']]
            view = doc['bufferViews'][image['bufferView']]
            start = view.get('byteOffset', 0)
            texture = Image.open(io.BytesIO(buffer[start:start + view['byteLength']])).convert('RGB')
            uv = accessor(doc, buffer, attrs['TEXCOORD_0'])
        for offset in range(0, len(indices), 3):
            triangle = [index for index, in indices[offset:offset + 3]]
            color = material['name']
            if color_texture:
                u, v = (sum(uv[index][axis] for index in triangle) / 3 for axis in range(2))
                color = texture.getpixel((int(u % 1 * texture.width), int(v % 1 * texture.height)))
            yield tuple(positions[index] for index in triangle), color


def components(triangles):
    links = {}
    parent = list(range(len(triangles)))

    def root(index):
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    for index, (points, _) in enumerate(triangles):
        for point in points:
            key = tuple(round(value, 4) for value in point)
            parent[root(links.setdefault(key, index))] = root(index)
    groups = {}
    for index, face in enumerate(triangles):
        groups.setdefault(root(index), []).append(face)
    return sorted(groups.values(), key=len, reverse=True)


def fit(triangles, size, bottom, reverse=False):
    points = [point for face, _ in triangles for point in face]
    low = [min(point[axis] for point in points) for axis in range(3)]
    high = [max(point[axis] for point in points) for axis in range(3)]
    pivot = [(low[0] + high[0]) / 2, low[1], (low[2] + high[2]) / 2]
    scale = [length / (upper - lower) for length, lower, upper in zip(size, low, high)]
    if reverse:
        scale[0] *= -1
        scale[2] *= -1
    for face, color in triangles:
        yield tuple(((x - pivot[0]) * scale[0], (y - pivot[1]) * scale[1] + bottom,
                     (z - pivot[2]) * scale[2]) for x, y, z in face), color


def hull(path):
    shell, _, _, canopy, left_pod, right_pod, deck, prow, *_ = components(list(faces(path)))
    pieces = []
    for group, paint in [(shell, 0xb3c8bf), (canopy, 0x1b424b), (left_pod, 0x303c42),
                         (right_pod, 0x303c42), (deck, 0x8caaa6), (prow, 0xd5a85c)]:
        for face, color in group:
            # Compress the disk rim and shorten the old nacelles to leave room for mounts.
            outline = tuple((math.copysign(min(abs(x), 2.75) + max(0, abs(x) - 2.75) * .27, x),
                             y, min(z, 3.65) + max(0, z - 3.65) * .22) for x, y, z in face)
            tint = paint if paint != 0xb3c8bf or color[0] < 105 else 0xddd1a8
            pieces.append((outline, tint))
    return list(fit(pieces, (.93, .36, 1.04), -.16, reverse=True))


def rover(path, size, color, reverse=False):
    chassis, *_ = components(list(faces(path)))
    pieces = [(face, color if sampled[0] > 120 else 0x32444b) for face, sampled in chassis]
    return list(fit(pieces, size, -.17, reverse=reverse))


def prop(path, size, colors):
    return list(fit([(face, colors[material]) for face, material in faces(path)], size, 0))


def linear_byte(channel):
    value = channel / 255
    return round(255 * (value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4))


def write_bundle(path, meshes):
    doc = {'asset': {'version': '2.0'}, 'scene': 0, 'scenes': [{'nodes': []}], 'nodes': [],
           'meshes': [], 'bufferViews': [], 'accessors': [], 'buffers': []}
    binary = bytearray()

    def add(data, kind, component_type, count, **extra):
        binary.extend(b'\0' * (-len(binary) % 4))
        doc['bufferViews'].append({'buffer': 0, 'byteOffset': len(binary), 'byteLength': len(data)})
        binary.extend(data)
        doc['accessors'].append({'bufferView': len(doc['bufferViews']) - 1, 'type': kind,
                                 'componentType': component_type, 'count': count, **extra})
        return len(doc['accessors']) - 1

    for name, triangles in meshes.items():
        unique = {}
        indices = []
        for face, paint in triangles:
            color = tuple(linear_byte((paint >> shift) & 255) for shift in (16, 8, 0))
            # RGB vertex attributes are padded to four bytes for glTF alignment.
            keys = [tuple(round(value, 5) for value in point) + color + (255,) for point in face]
            if len(set(keys)) == 3:
                indices.extend(unique.setdefault(key, len(unique)) for key in keys)
        vertices = list(unique)
        positions = add(b''.join(struct.pack('<3f', *key[:3]) for key in vertices), 'VEC3', 5126,
                        len(vertices), min=[min(key[i] for key in vertices) for i in range(3)],
                        max=[max(key[i] for key in vertices) for i in range(3)])
        colors = add(b''.join(bytes(key[3:]) for key in vertices), 'VEC4', 5121, len(vertices), normalized=True)
        index = add(struct.pack(f'<{len(indices)}H', *indices), 'SCALAR', 5123, len(indices))
        count = len(doc['meshes'])
        doc['scenes'][0]['nodes'].append(count)
        doc['nodes'].append({'name': name, 'mesh': count})
        doc['meshes'].append({'primitives': [{'attributes': {'POSITION': positions, 'COLOR_0': colors}, 'indices': index}]})
        print(f'{name}: {len(indices) // 3} triangles')

    binary.extend(b'\0' * (-len(binary) % 4))
    doc['buffers'].append({'byteLength': len(binary)})
    header = json.dumps(doc, separators=(',', ':')).encode()
    header += b' ' * (-len(header) % 4)
    output = struct.pack('<4sII', b'glTF', 2, 28 + len(header) + len(binary))
    output += struct.pack('<I4s', len(header), b'JSON') + header
    output += struct.pack('<I4s', len(binary), b'BIN\0') + binary
    path.write_bytes(output)


def write_atlas(path, source):
    atlas = Image.new('RGBA', (256, 128))
    for file, center in [('trace_01.png', (42, 64)), ('scorch_01.png', (128, 64)), ('smoke_04.png', (214, 64))]:
        image = Image.open(source / file).convert('RGBA')
        image = ImageOps.contain(image.crop(image.getbbox()), (76, 88))
        atlas.paste(image, (center[0] - image.width // 2, center[1] - image.height // 2))
    atlas.save(path, optimize=True)


def main(source):
    output = Path(__file__).resolve().parents[1] / 'static' / 'art'
    output.mkdir(exist_ok=True)
    write_bundle(output / 'arena.glb', {
        'hull': hull(source / 'Pancake.gltf'),
        'forager': rover(source / 'Rover_Round.gltf', (1.35, .55, 1), 0xb19a62),
        'hunter': rover(source / 'Rover_1.gltf', (.87, .58, 1.25), 0xbd7a69),
        'scavenger': rover(source / 'Rover_2.gltf', (.76, .46, 1.56), 0x88aab3),
        'rock': prop(source / 'rock_largeA.glb', (1, 1, 1), {'dirt': 0xc1c9c6, 'grass': 0x899f92}),
        'stone': prop(source / 'rock_smallFlatA.glb', (1, .18, .78), {'dirt': 0xc1c9c6, 'grass': 0xadb6ae}),
        'grass': prop(source / 'grass_large.glb', (.68, .38, .70), {'grass': 0xb4c0a4}),
        'roots': prop(source / 'log_stack.glb', (1.16, .18, .60), {'woodBark': 0x9a9180, 'woodInner': 0xc4b99d}),
        'tree': prop(source / 'tree_oak.glb', (1.8, 1.74, 1.8), {'leafsGreen': 0x829c70, 'woodBark': 0x7f7360}),
    })
    write_atlas(output / 'effects.png', source)


if __name__ == '__main__':
    main(Path(sys.argv[1]))
