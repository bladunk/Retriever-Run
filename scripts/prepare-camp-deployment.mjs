import { build } from 'esbuild'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repository = new URL('../', import.meta.url)
const target = process.argv[2] ? resolve(process.argv[2]) : await mkdtemp(resolve(tmpdir(), 'retriever-camp-deploy-'))
const output = resolve(target, 'supabase/functions/verify-hunt')
await mkdir(output, { recursive: true })
const handler = new URL('supabase/functions/verify-hunt/handler.js', repository)
// Bundle the same physics, including its existing Three.js convex-hull math.
// Vite already installs the pinned esbuild package. Keep the staged function
// self-contained so the CLI needs no modules outside the function directory.
await build({ entryPoints: [fileURLToPath(handler)], bundle: true, format: 'esm', platform: 'neutral',
  mainFields: ['module', 'main'], target: 'es2022', minify: true, outfile: resolve(output,'handler.js') })
await writeFile(resolve(output,'index.ts'), await readFile(new URL('supabase/functions/verify-hunt/index.ts',repository)))
await writeFile(resolve(target,'supabase/config.toml'), await readFile(new URL('supabase/config.toml',repository)))
console.log(JSON.stringify({ target, handlerBytes: (await readFile(resolve(output,'handler.js'))).length }))
