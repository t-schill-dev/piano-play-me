import { svelte } from '@sveltejs/vite-plugin-svelte'
import legacy from '@vitejs/plugin-legacy'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    // Older iPads can't update past iOS 12 (Safari 12). Rewrite newer
    // JavaScript syntax for it and add polyfills for missing built-ins.
    // Safari 12 runs ES modules, so no separate legacy bundle is needed.
    legacy({
      modernTargets: ['safari >= 12', 'ios_saf >= 12', 'chrome >= 80', 'firefox >= 78', 'edge >= 80'],
      modernPolyfills: true,
      renderLegacyChunks: false,
    }),
  ],
})
