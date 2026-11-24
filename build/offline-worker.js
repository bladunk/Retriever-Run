import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { landscapeProfiles } from '../src/migration-landscapes.js'
import { createContentManifest, installation } from '../src/content-manifest.js'

const worker = readFileSync(new URL('./offline-runtime.js', import.meta.url), 'utf8')
const publicFiles = ['manifest.webmanifest', 'icons/retriever-192.png', 'icons/retriever-512.png',
  'icons/retriever-maskable-512.png', 'icons/apple-touch-icon.png']
const groups = {
  shell: { label: 'Application shell', license: 'original' },
  core: { label: 'Game engine and trail', license: 'code' },
  terrain: { label: 'Terrain and vegetation', license: 'terrain-materials' },
  vegetation: { label: 'Territory vegetation', license: 'landscape-vegetation',
    territories: landscapeProfiles.filter(region => region.licensedGrass).map(region => region.key) },
  dogs: { label: 'Labrador and animations', license: 'labrador' },
  audio: { label: 'Music and wildlife audio', license: 'game-audio' },
  diagnostics: { label: 'Developer diagnostics', license: 'code' },
}
const cleanId = file => file.replace(/-[\w-]{8}(?=\.[^.]+$)/, '').replace(/^assets\//, '')
const digest = input => createHash('sha256').update(input).digest('hex')

function groupFor(file, shell) {
  if (shell.has(file)) return 'shell'
  const key = cleanId(file)
  if (/^collision-debug/.test(key)) return 'diagnostics'
  if (/^lab(?:rador)?\./.test(key)) return 'dogs'
  if (key.endsWith('.mp3')) return 'audio'
  if (key.startsWith('landscape-')) return 'vegetation'
  if (key.endsWith('.webp')) return 'terrain'
  return 'core'
}

export function offlineWorker() {
  return {
    name: 'retriever-offline',
    apply: 'build',
    enforce: 'post',
    writeBundle(output, bundle) {
      const shell = new Set(publicFiles)
      function addShell(file) {
        if (shell.has(file) || !bundle[file]) return
        shell.add(file)
        const item = bundle[file]
        if (item.type === 'chunk') {
          for (const dependency of [...item.imports, ...(item.viteMetadata?.importedCss ?? []),
            ...(item.viteMetadata?.importedAssets ?? [])]) addShell(dependency)
        }
      }
      addShell('index.html')
      for (const item of Object.values(bundle)) {
        if (item.type === 'chunk' && item.isEntry && item.facadeModuleId?.endsWith('/index.html')) addShell(item.fileName)
      }
      const files = [...Object.keys(bundle).filter(file => !file.endsWith('.map')), ...publicFiles].sort()
      const assets = files.map(file => {
        const item = bundle[file]
        // Vite rewrites module-preload markers late. Hash the final bytes on disk.
        const bytes = readFileSync(resolve(output.dir, file))
        const group = groupFor(file, shell)
        const id = cleanId(file)
        const license = item?.type === 'chunk' ? 'code' : id === 'forest-needles.webp' ? 'original' : groups[group].license
        const references = item?.type === 'chunk' ? [...item.imports, ...(item.viteMetadata?.importedCss ?? []),
          ...(item.viteMetadata?.importedAssets ?? [])] : []
        return { id, path: file, group, sha256: digest(bytes), bytes: bytes.length,
          required: group !== 'diagnostics', variant: 'universal', dependencies: [...new Set(references)].map(cleanId),
          license, cache: group === 'shell' ? 'release' : 'immutable' }
      })
      const version = digest(JSON.stringify({ groups, assets }) + worker).slice(0, 20)
      const manifest = createContentManifest({ schema: 1, version, groups, assets })
      if (installation(manifest).filter(asset => asset.cache === 'release').reduce((sum, asset) => sum + asset.bytes, 0) > 180_000)
        this.error('The boot shell exceeds 180 KB. Keep the game behind a dynamic import.')
      writeFileSync(resolve(output.dir, 'content-manifest.json'), JSON.stringify(manifest))
      writeFileSync(resolve(output.dir, 'offline-sw.js'), 'const release = ' + JSON.stringify(manifest) + '\n' + worker)
    },
  }
}
