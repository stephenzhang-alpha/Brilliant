# Project Equation — Algebra 1 Learn-by-Doing

**Subject: Algebra 1**

A Brilliant-style interactive learning app that teaches Algebra 1 through hands-on manipulation. No videos, no memorization — drag equations, balance scales, and plot lines until algebra clicks.

## Target User

"Struggling Sam" (Age 14-15) — A high school freshman taking Algebra 1 who needs visual, tactile representations of abstract variables.

## Features (Phase 1 MVP)

- **Interactive Algebra Engine**
  - Drag terms across equations — signs flip automatically
  - Visual balance scale that tilts when unbalanced
  - Coordinate grid plotter with draggable lines
  - Number input and multiple choice for reinforcement

- **Instant Feedback**
  - Every wrong answer gets a specific, helpful hint
  - Escalating hints after repeated attempts
  - Synthesis explanations after correct answers

- **Progress & Persistence**
  - Progress saves to Firestore — resume on any device
  - Exact step restoration on return
  - Sequential lesson unlock path

- **Habit Loop**
  - Daily streak tracking
  - XP system with lesson rewards
  - Milestone animations on completion

- **5 Lessons in Progressive Path**
  1. Variables & Expressions
  2. One-Step Equations (drag)
  3. Balancing Equations (scale)
  4. Two-Step Equations (drag)
  5. Graphing Linear Equations (plot)

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS (responsive/mobile-first)
- Zustand (state management)
- Firebase (Auth + Firestore + Hosting)
- SVG + HTML5 drag-and-drop for interactions

## Setup

```bash
cd brilliant-algebra
npm install
cp .env.example .env
# Fill in your Firebase project credentials in .env
npm run dev
```

## Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Email/Password authentication
3. Create a Firestore database
4. Copy your web app config into `.env`
5. Deploy: `firebase deploy`

## Architecture

```
src/
├── components/
│   ├── auth/           Auth forms and route guards
│   ├── interactions/   TermDrag, ScaleBalance, GraphPlot, MultipleChoice, NumberInput
│   ├── lesson/         LessonRenderer, StepRenderer, FeedbackPanel
│   ├── course/         CourseMap with unlock logic
│   ├── streak/         StreakCounter
│   └── layout/         Navbar and Layout
├── content/            Structured lesson data (JSON-as-code)
├── stores/             Zustand stores (auth, progress, lesson)
├── firebase/           Firebase config and helpers
├── types/              TypeScript interfaces
└── pages/              Route-level page components
```

## Content Model

Lessons are structured data objects with typed steps:
- `concept` steps show explanatory text
- `problem` steps render interactive components (TERM_DRAG, SCALE_BALANCE, GRAPH_PLOT, etc.)
- `synthesis` steps wrap up with a conceptual summary

Each problem has a `feedbackMatrix` mapping error types to specific hints.

## Deployment

```bash
npm run build
firebase deploy
```

## No AI

This MVP contains zero AI features. All content is hand-built, all feedback is deterministic, and all validation is client-side math. The app teaches entirely through its interactive design.
