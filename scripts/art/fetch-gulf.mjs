import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { mkdir, readFile, rename, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { promisify } from 'node:util'

const [output] = process.argv.slice(2)
if (!output) throw new Error('Usage: node scripts/art/fetch-gulf.mjs <private scratch directory>')
const sources = JSON.parse(await readFile(new URL('../../art/gulf-inputs.json', import.meta.url)))
const download = promisify(execFile)
for (const [name, entry] of Object.entries(sources)) {
  const destination = resolve(output, name)
  const temporary = destination + '.part'
  await mkdir(dirname(destination), { recursive: true })
  try {
    await download('curl', ['--fail', '--silent', '--show-error', '--location', '--max-time', '60', entry.url, '-o', temporary])
    const bytes = await readFile(temporary)
    if (bytes.length !== entry.bytes || createHash('sha256').update(bytes).digest('hex') !== entry.sha256)
      throw new Error('Source does not match the registered digest: ' + name)
    await rename(temporary, destination)
    console.log(name, bytes.length)
  } finally {
    await rm(temporary, { force: true })
  }
}
