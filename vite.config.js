import { defineConfig, loadEnv } from 'vite'
import { publicCampConfig } from './build/camp-config.js'
import { buildInfo } from './build/build-info.js'
import { offlineWorker } from './build/offline-worker.js'

export default defineConfig(({ mode }) => {
  const camp = publicCampConfig({ ...loadEnv(mode, process.cwd(), 'SUPABASE_'), ...process.env })
  const app = buildInfo(camp)
  return {
    base: './',
    define: { __CAMP_PUBLIC_CONFIG__: JSON.stringify(camp), __RUNNING_BUILD__: JSON.stringify(app) },
    plugins: [offlineWorker(app)],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/node_modules/@supabase/')) return 'supabase'
            if (id.endsWith('/three/build/three.core.js')) return 'three-core'
            if (id.endsWith('/three/build/three.module.js')) return 'three-webgl'
          },
        },
      },
    },
  }
})
