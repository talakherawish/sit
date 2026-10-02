import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages serves a project site under /<repo-name>/; the deploy workflow sets BASE_PATH.
  base: process.env.BASE_PATH || '/',
  server: { port: 5173 },
  // Each build gets an id so data saved in the browser by an older version is ignored after a deploy.
  define: { 'import.meta.env.VITE_BUILD_ID': JSON.stringify(String(Date.now())) },
})
