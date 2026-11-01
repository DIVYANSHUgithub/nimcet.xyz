import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const adminRoot = fileURLToPath(new URL('.', import.meta.url))
const workspaceRoot = resolve(adminRoot, '..')

export default defineConfig({
  root: adminRoot,
  envDir: workspaceRoot,
  plugins: [react()],
  server: { fs: { allow: [workspaceRoot] } },
  build: { outDir: resolve(adminRoot, 'dist'), emptyOutDir: true },
})
