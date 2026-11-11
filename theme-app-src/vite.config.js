import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Builds to ../theme-app so GitHub Pages serves it at /munafasat/theme-app/
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: '../theme-app', emptyOutDir: true, assetsInlineLimit: 0 },
});
