import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const worker = readFileSync(new URL('./offline-runtime.js', import.meta.url), 'utf8')

export function offlineWorker() {
  return {
    name: 'retriever-offline',
    apply: 'build',
    enforce: 'post',
    generateBundle(_output, bundle) {
      const files = [...new Set(['index.html', ...Object.keys(bundle).filter(file => !file.endsWith('.map') && !file.startsWith('assets/supabase-'))])].sort()
      const hash = createHash('sha256').update(JSON.stringify(files)).update(worker)
      hash.update(String(bundle['index.html']?.source ?? ''))
      this.emitFile({ type: 'asset', fileName: 'offline-sw.js', source:
        'const revision = ' + JSON.stringify(hash.digest('hex').slice(0, 16)) + '\n' +
        'const gameFiles = ' + JSON.stringify(files) + '\n' + worker })
    },
  }
}
