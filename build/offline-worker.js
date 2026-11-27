import { speciesPhotoFiles } from '../src/species-artwork.js'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { habitatEncounters } from '../src/wildlife-catalog.js'
import { landscapeProfiles } from '../src/migration-landscapes.js'
import { createContentManifest, installation } from '../src/content-manifest.js'

const worker = readFileSync(new URL('./offline-runtime.js', import.meta.url), 'utf8')
const publicShell = ['manifest.webmanifest', 'icons/boyd-heritage-48.png', 'branding/boyd-install.webp']
const lodgeArt = ['interior-1','interior-2','interior-3','interior-4','interior-5','decoy','pheasant','equipment','journal',
  'legend','map','medal','observation','record','shame','bronze-flight','skill-form','certificate','aurora-frame'].map(name => 'lodge/' + name + '.webp')
const publicFiles = [...publicShell, ...lodgeArt, ...speciesPhotoFiles, 'icons/boyd-heritage-192.png', 'icons/boyd-heritage-512.png',
  'icons/boyd-heritage-maskable-512.png', 'icons/boyd-heritage-180.png', 'branding/boyd-portrait.webp', 'branding/boyd-menu.webp',
  'branding/master-hunter.png']
const wildlifeTerritories = (...species) => Object.entries(habitatEncounters)
  .filter(([, tiers]) => tiers.some(tier => tier.some(id => species.includes(id)))).map(([territory]) => territory)
const groups = {
  shell: { label: 'Application shell', license: 'original' },
  core: { label: 'Game engine and trail', license: 'code' },
  terrain: { label: 'Terrain and vegetation', license: 'terrain-materials' },
  vegetation: { label: 'Territory vegetation', license: 'landscape-vegetation',
    territories: landscapeProfiles.filter(region => region.licensedGrass).map(region => region.key) },
  'field-surfaces': { label: 'Surface scans and building finishes', license: 'field-surfaces',
    territories: landscapeProfiles.map(({ key }) => key) },
  'gulf-surfaces': { label: 'Gulf Coast material scans', license: 'gulf-scans', territories: ['gulf'] },
  'woodland-plants': { label: 'Forest and riverbank plants', license: 'living-vegetation',
    territories: ['cypress','timber','ozark','parklands','boreal','foothills'] },
  'wetland-wildlife': { label: 'Wetland wildlife', license: 'living-wildlife', territories: wildlifeTerritories('mallard') },
  'upland-wildlife': { label: 'Fields and woodland wildlife', license: 'living-wildlife', territories: wildlifeTerritories('pheasant','deer') },
  'sky-wildlife': { label: 'River and northern airspace', license: 'living-wildlife', territories: wildlifeTerritories('eagle') },
  'field-recordings': { label: 'Wilderness field recordings', license: 'living-recordings' },
  'species-photos': { label: 'Field Journal photographs', license: 'species-photographs' },
  lodge: { label: 'Lodge interiors and display objects', license: 'original' },
  dogs: { label: 'Labrador and animations', license: 'labrador' },
  branding: { label: 'Boyd artwork and icons', license: 'boyd-artwork' },
  audio: { label: 'Music and wildlife audio', license: 'game-audio' },
  diagnostics: { label: 'Developer diagnostics', license: 'code' },
}
const cleanId = file => file.replace(/-[\w-]{8}(?=\.[^.]+$)/, '').replace(/^assets\//, '')
const digest = input => createHash('sha256').update(input).digest('hex')

function groupFor(file, shell) {
  if (shell.has(file)) return 'shell'
  const key = cleanId(file)
  if (/^(?:collision-debug|art-studio)/.test(key)) return 'diagnostics'
  if (/^(?:lab(?:rador)?|pointer|boyd)\./.test(key)) return 'dogs'
  if (file.startsWith('species/')) return 'species-photos'
  if (file.startsWith('lodge/') || /^lodge-gallery\./.test(key)) return 'lodge'
  if (/^(branding|icons)\//.test(file)) return 'branding'
  if (key.startsWith('living-fern.')) return 'woodland-plants'
  if (key.startsWith('living-mallard.')) return 'wetland-wildlife'
  if (/^living-(deer|pheasant)\./.test(key)) return 'upland-wildlife'
  if (key.startsWith('living-eagle.')) return 'sky-wildlife'
  if (/^field-.*\.mp3$/.test(key)) return 'field-recordings'
  if (key.endsWith('.mp3')) return 'audio'
  if (key.startsWith('field-atlas-')) return 'field-surfaces'
  if (key.startsWith('gulf-field-color.') || key.startsWith('gulf-field-pbr.')) return 'gulf-surfaces'
  if (key.startsWith('landscape-')) return 'vegetation'
  if (key.endsWith('.webp')) return 'terrain'
  return 'core'
}

export function offlineWorker(app) {
  let publicDir
  return {
    name: 'retriever-offline',
    apply: 'build',
    enforce: 'post',
    configResolved(config) { publicDir = config.publicDir },
    buildStart() {
      const approved = new Set(publicFiles)
      for (const file of readdirSync(publicDir, { recursive: true, withFileTypes: true })) {
        if (file.isDirectory()) continue
        const path = relative(publicDir, resolve(file.parentPath, file.name)).replaceAll('\\', '/')
        if (file.isSymbolicLink() || !approved.has(path)) this.error('Only registered release assets may be copied from public/')
      }
    },
    writeBundle(output, bundle) {
      const shell = new Set(publicShell)
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
        const license = item?.type === 'chunk' ? 'code' : id === 'forest-needles.webp' ? 'original'
          : /^(branding|icons)\//.test(file) ? 'boyd-artwork' : groups[group].license
        const references = item?.type === 'chunk' ? [...item.imports, ...(item.viteMetadata?.importedCss ?? []),
          ...(item.viteMetadata?.importedAssets ?? [])] : []
        return { id, path: file, group, sha256: digest(bytes), bytes: bytes.length,
          required: group !== 'diagnostics', variant: group === 'field-surfaces' ? id.replace('field-atlas-', '').split('.')[0] : 'universal', dependencies: [...new Set(references)].map(cleanId),
          license, cache: group === 'shell' ? 'release' : 'immutable' }
      })
      const version = digest(JSON.stringify({ groups, assets, app }) + worker).slice(0, 20)
      const manifest = createContentManifest({ schema: 1, version, groups, assets, app })
      if (installation(manifest).filter(asset => asset.cache === 'release').reduce((sum, asset) => sum + asset.bytes, 0) > 180_000)
        this.error('The boot shell exceeds 180 KB. Keep the game behind a dynamic import.')
      writeFileSync(resolve(output.dir, 'content-manifest.json'), JSON.stringify(manifest))
      writeFileSync(resolve(output.dir, 'offline-sw.js'), 'const release = ' + JSON.stringify(manifest) + '\n' + worker)
    },
  }
}
