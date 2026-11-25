import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'

export function buildInfo(camp) {
  const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
  const hash = createHash('sha256')
  for (const directory of ['src', 'public', 'build']) {
    for (const file of readdirSync(directory, { recursive: true, withFileTypes: true })
      .filter(item => item.isFile()).map(item => item.parentPath + '/' + item.name).sort()) {
      hash.update(file).update(readFileSync(file))
    }
  }
  for (const file of ['index.html', 'package-lock.json', 'vite.config.js']) hash.update(readFileSync(file))
  hash.update(JSON.stringify(camp))
  return { version, id: hash.digest('hex').slice(0, 7) }
}
