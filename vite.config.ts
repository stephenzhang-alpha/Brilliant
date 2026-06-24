import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages serves project sites from https://<user>.github.io/<repo>/, so the
// production build needs base = '/<repo>/'. Dev server stays at '/'.
// Override with the VITE_BASE env var if you rename the repo or add a custom domain.
//
// This is a multi-page build of two independent apps that share auth + styles:
//   index.html        -> Project Equation (interactive Algebra course)
//   games/index.html  -> Algebra Quest arcade (Dino / Gates / Tower)
export default defineConfig(({ command }) => ({
  base: command === 'build' ? process.env.VITE_BASE ?? '/Brilliant/' : '/',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('index.html', import.meta.url)),
        games: fileURLToPath(new URL('games/index.html', import.meta.url)),
      },
    },
  },
}))
