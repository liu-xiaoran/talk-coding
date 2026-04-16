import { defineConfig } from 'vite';

export default defineConfig({
  root: 'frontend',
  build: {
    outDir: '../dist/public',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/ws': 'http://localhost:3000',
      '/api': 'http://localhost:3000',
      '/projects': 'http://localhost:3000',
    },
  },
});
