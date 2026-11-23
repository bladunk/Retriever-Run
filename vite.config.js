import { defineConfig, loadEnv } from 'vite'
import { publicCampConfig } from './build/camp-config.js'
import { offlineWorker } from './build/offline-worker.js'

export default defineConfig(({ mode }) => ({
  base: './',
  define: { __CAMP_PUBLIC_CONFIG__: JSON.stringify(publicCampConfig({
    ...loadEnv(mode, process.cwd(), 'SUPABASE_'), ...process.env,
  })) },
  plugins: [offlineWorker()],
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
}))
