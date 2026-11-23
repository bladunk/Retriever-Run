"""Select the two CC-BY static grass meshes and pack their color textures."""
from io import BytesIO
from pathlib import Path
import json, struct, sys
from PIL import Image

source, target = map(Path, sys.argv[1:])
blob = source.read_bytes()
json_size = struct.unpack_from('<I', blob, 12)[0]
data = json.loads(blob[20:20 + json_size])
payload = blob[28 + json_size:]
packed = bytearray()
views, accessors, meshes, nodes = [], [], [], []
atlas = Image.new('RGBA', (512, 512))
# The padded slots keep silhouettes separated after mipmapping.
for slot, (index, name) in enumerate([(0, 'dryTuft'), (4, 'marshTuft')]):
    p = data['meshes'][index]['primitives'][0]
    material = data['materials'][p['material']]
    texture = data['textures'][material['pbrMetallicRoughness']['baseColorTexture']['index']]
    image = data['images'][texture['source']]
    view = data['bufferViews'][image['bufferView']]
    img = Image.open(BytesIO(payload[view.get('byteOffset', 0):view.get('byteOffset', 0) + view['byteLength']]))
    color = img.convert('RGBA').resize((240, 240), Image.Resampling.LANCZOS)
    atlas.paste(color, (8 + slot * 256, 8))
    output = {'attributes': {}, 'mode': 4}
    for attr, source_index in [*p['attributes'].items(), ('indices', p['indices'])]:
        if attr not in ('POSITION', 'NORMAL', 'TEXCOORD_0', 'indices'):
            continue
        access = data['accessors'][source_index]
        view = data['bufferViews'][access['bufferView']]
        dimensions = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[access['type']]
        size = {5121: 1, 5123: 2, 5125: 4, 5126: 4}[access['componentType']] * dimensions
        stride = view.get('byteStride', size)
        start = view.get('byteOffset', 0) + access.get('byteOffset', 0)
        mapped = bytearray()
        for element in range(access['count']):
            raw = payload[start + element * stride:start + element * stride + size]
            if attr == 'TEXCOORD_0':
                u, v = struct.unpack('<ff', raw)
                raw = struct.pack('<ff', (8 + slot * 256 + u * 240) / 512, (8 + v * 240) / 512)
            mapped.extend(raw)
        packed.extend(b'\0' * (-len(packed) % 4))
        views.append({'buffer': 0, 'byteOffset': len(packed), 'byteLength': len(mapped)})
        packed.extend(mapped)
        accessor = {k: v for k, v in access.items() if k not in ('byteOffset', 'bufferView')}
        if attr == 'TEXCOORD_0':
            accessor.pop('min', None)
            accessor.pop('max', None)
        accessor['bufferView'] = len(views) - 1
        if attr == 'indices':
            output['indices'] = len(accessors)
        else:
            output['attributes'][attr] = len(accessors)
        accessors.append(accessor)
    nodes.append({'name': name, 'mesh': len(meshes)})
    meshes.append({'name': name, 'primitives': [output]})
atlas.save(target / 'landscape-grass-atlas.webp', quality=87, method=6)
packed.extend(b'\0' * (-len(packed) % 4))
content = json.dumps({'asset': {'version': '2.0', 'copyright': 'Nicholas-3D · CC BY 4.0, edited for Retriever Run'},
    'scene': 0, 'scenes': [{'nodes': list(range(len(nodes)))}], 'nodes': nodes, 'meshes': meshes,
    'accessors': accessors, 'bufferViews': views, 'buffers': [{'byteLength': len(packed)}]},
    separators=(',', ':')).encode('utf-8')
content += b' ' * (-len(content) % 4)
(target / 'landscape-grass.glb').write_bytes(struct.pack('<4sIIII', b'glTF', 2, 28 + len(content) + len(packed), len(content), 0x4e4f534a)
    + content + struct.pack('<II', len(packed), 0x004e4942) + packed)
