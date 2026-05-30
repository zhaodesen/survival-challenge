import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5191,
    strictPort: true,
    open: true
  },
  build: {
    target: 'es2019',
    chunkSizeWarningLimit: 1600
  }
});
