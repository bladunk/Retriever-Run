const idPattern = /^[a-zA-Z0-9][\w.-]*(?:\/[\w.-]+)*$/
export const manifestPath = 'content-manifest.json'

export function createContentManifest(value) {
  if (value?.schema !== 1 || !/^[a-f0-9]{20}$/.test(value.version) ||
      !value.groups || !Array.isArray(value.assets) || !value.assets.length) throw new Error('Unsupported game content manifest')
  const ids = new Map()
  const paths = new Set()
  for (const asset of value.assets) {
    if (!asset || !idPattern.test(asset.id) || !idPattern.test(asset.path) ||
      asset.path.split('/').some(segment => segment === '.' || segment === '..') ||
      ids.has(asset.id) || paths.has(asset.path) || !Object.hasOwn(value.groups, asset.group) ||
      !Number.isSafeInteger(asset.bytes) || asset.bytes <= 0 || !/^[a-f0-9]{64}$/.test(asset.sha256) ||
      !['release', 'immutable'].includes(asset.cache) || typeof asset.required !== 'boolean' ||
      typeof asset.variant !== 'string' || !asset.license || !Array.isArray(asset.dependencies))
      throw new Error('Invalid game asset ' + asset?.id)
    ids.set(asset.id, asset)
    paths.add(asset.path)
  }
  const shell = value.assets.find(asset => asset.path === 'index.html' && asset.cache === 'release' && asset.required)
  if (!shell) throw new Error('Missing application shell')
  resolveAssets(value, [...ids.keys()])
  return value
}

export function resolveAssets(manifest, requested) {
  const source = new Map(manifest.assets.map(asset => [asset.id, asset]))
  const result = new Map()
  const active = new Set()
  function include(id) {
    if (result.has(id)) return
    const asset = source.get(id)
    if (!asset || active.has(id)) throw new Error('Invalid content dependency ' + id)
    active.add(id)
    for (const dependency of asset.dependencies) include(dependency)
    active.delete(id)
    result.set(id, asset)
  }
  for (const id of requested) include(id)
  return [...result.values()]
}

export const installation = manifest => resolveAssets(manifest,
  manifest.assets.filter(asset => asset.required).map(asset => asset.id))
