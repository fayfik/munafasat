import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { assetsInlineLimit: 100000000 },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
