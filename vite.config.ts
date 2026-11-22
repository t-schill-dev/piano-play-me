import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  // Older iPads stay on older Safari, so turn newer JavaScript syntax
  // (??=, private #fields, static blocks) into code Safari 13+ can run.
  build: { target: ['es2019', 'safari13'] },
})
