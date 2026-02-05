import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import path from 'path'
import { nitro } from 'nitro/vite'


export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  plugins: [
    viteTsConfigPaths({ projects: ['./tsconfig.json'] }),
    tanstackStart(),
    nitro(),
    viteReact(),
  ],
  server: {
    port: 5173,
  },
  envDir: __dirname,
})
