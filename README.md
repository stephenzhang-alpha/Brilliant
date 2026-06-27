# Algebra Quest

A playful, single-page web game that teaches introductory algebra through a
seven-stage journey — from variables to equations and inequalities. Built with
React, TypeScript, Vite, Tailwind, and Firebase.

## The journey

Seven gated pages — finish each to unlock the next; you can always go back and
replay an earlier one:

1. **Variables** — an interactive intro with a concept check.
2. **Dino Run** — an endless runner; every 300–500 points a variables checkpoint pops up.
3. **Expressions** — a concept check on reading `ax + b`.
4. **Gate Runner** — pick the gates that grow your crowd, then evaluate the expression to beat the boss.
5. **Pull the Pins** — an embedded physics puzzle reinforcing variable thinking.
6. **Equations & Inequalities** — scrub `x` on a live balance scale to build intuition.
7. **Balance Game** — set `x` so the scale balances (inspired by SolveMe Mobiles).

Along the way, **Pip** — an AI tutor sprite (Firebase AI Logic / Gemini) — flies
in to offer a hint or explanation when you miss a concept check, with an authored
fallback when the live model isn't available.

Your **overall score** is the sum of your best runs, layered with a five-tier
rank ladder and an optional global leaderboard (Firestore) when signed in.

## Develop

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check (tsc -b) + production build
npm run lint     # eslint
npm test         # vitest
```

The app is a single Vite entry (`index.html` → `src/games-main.tsx` →
`src/GamesApp.tsx`) using a `HashRouter`, so it deploys as static files with no
server rewrites required.

## Configuration

Firebase is optional — without it the quest still runs fully (scores persist
locally and Pip uses authored fallbacks). To enable auth, the cloud leaderboard,
and Pip's live AI, copy `.env.example` to `.env` and fill in your Firebase web
config (the `VITE_FIREBASE_*` values); see `.env.example` for the full list.

## Deploy

Built to `dist/` and hosted on Firebase Hosting:

```bash
VITE_BASE=/ npm run build
npx firebase-tools deploy --only hosting
```
