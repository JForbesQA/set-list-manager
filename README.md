# Set List Manager

A small personal app for building gig set lists: keep a song library (title, artist, key, BPM, duration), then assemble ordered set lists with a running total time. Data is stored in your browser's `localStorage`; there is no backend.

## Features

- Song library with add, delete and search
- Set lists with name, date and venue
- Add songs to a set, reorder (move up / down) and remove
- Live total running time per set list
- Deleting a song also removes it from every set list

## Develop

```bash
npm install
npm run dev     # local dev server
npm test        # unit tests (Vitest)
npm run lint
npm run build   # production build into dist/
```

Requires Node 22+.

## Deploy

Pushes to `main` run lint, tests and build, then deploy to GitHub Pages via `.github/workflows/deploy.yml`. In the repo settings, set **Pages → Source** to **GitHub Actions**.

## End-to-end tests

E2E coverage runs in QA Wolf against the deployed Pages URL.
