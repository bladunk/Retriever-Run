import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createContentManifest, installation, manifestPath } from '../src/content-manifest.js'

const root = resolve(process.argv[2] ?? 'dist')
const read = file => readFile(resolve(root, file))
const raw = await read(manifestPath)
const manifest = createContentManifest(JSON.parse(raw))
const worker = await read('offline-sw.js')
assert.ok(worker.toString().startsWith('const release = ' + raw.toString() + '\n'), 'worker and release manifest differ')
for (const asset of manifest.assets) {
  const data = await read(asset.path)
  assert.equal(data.length, asset.bytes, asset.path)
  assert.equal(createHash('sha256').update(data).digest('hex'), asset.sha256, asset.path)
}
const installed = installation(manifest)
const bytes = assets => assets.reduce((sum, asset) => sum + asset.bytes, 0)
const unique = assets => new Map(assets.map(asset => [asset.sha256, asset.bytes])).values()
const files = (await readdir(root, { recursive: true, withFileTypes: true })).filter(file => file.isFile())
const total = await Promise.all(files.map(file => readFile(resolve(file.parentPath, file.name)).then(data => data.length)))
const shell = manifest.assets.filter(asset => asset.cache === 'release')
console.log(JSON.stringify({
  version: manifest.version, files: files.length, buildBytes: total.reduce((sum, size) => sum + size, 0),
  requiredFiles: installed.length, requiredBytes: bytes(installed),
  uniqueRequiredBytes: Array.from(unique(installed)).reduce((sum, size) => sum + size, 0),
  shellBytes: bytes(shell), uniqueShellBytes: Array.from(unique(shell)).reduce((sum, size) => sum + size, 0),
}))
