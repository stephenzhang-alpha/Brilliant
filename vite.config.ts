import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages serves project sites from https://<user>.github.io/<repo>/, so the
// production build needs base = '/<repo>/'. Dev server stays at '/'.
// Override with the VITE_BASE env var if you rename the repo or add a custom domain.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? process.env.VITE_BASE ?? '/Brilliant/' : '/',
  plugins: [react(), tailwindcss()],
}))
