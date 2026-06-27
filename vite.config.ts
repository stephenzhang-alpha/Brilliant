import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Algebra Quest is a single-page app (HashRouter) served at the site root.
// `base` defaults to '/'; override with the VITE_BASE env var for sub-path hosting
// (e.g. VITE_BASE=/Brilliant/ for a GitHub Pages project site).
export default defineConfig(({ command }) => ({
  base: command === 'build' ? process.env.VITE_BASE ?? '/' : '/',
  plugins: [react(), tailwindcss()],
}))
