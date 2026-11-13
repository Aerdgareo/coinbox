import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    assetsInlineLimit: 4096,
    cssCodeSplit: false,
    sourcemap: false
  },
  server: {
    port: 5173,
    strictPort: true
  }
})