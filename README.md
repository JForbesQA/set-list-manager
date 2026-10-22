# Set List Manager

A small personal app for building gig set lists from a song library. Data is stored in your browser's `localStorage`; there is no backend.

## Features

- Song library: title, artist, key, tempo (slow / medium / high), duration, notes; add, edit, delete, search
- "Needs review" flag for drafted data, with one-tap Confirm; last-played date per song
- Starter library of drafted songs to get going (durations from MusicBrainz and published album lengths)
- Set lists with name, date and venue; add, reorder, remove, duplicate; running total time
- Templates (open mic opener, short set, full show, plus your own) and a generator that balances tempo, avoids
  repeating an artist back to back and favours songs you have not played recently
- Backup: download and restore everything as one JSON file
- Installable on iPhone as an offline app (PWA)

## Install on iPhone

Open the deployed site in Safari, tap Share, then **Add to Home Screen**. It then launches full screen and works
offline. The home-screen app has its own storage, so open **Backup** on your laptop version, download a backup, and
restore it in the phone app (AirDrop or Files works for moving the file).

## Develop

```bash
npm install
npm run dev     # local dev server
npm test        # unit tests (Vitest)
npm run lint
npm run build   # production build into dist/
npx pwa-assets-generator   # regenerate icons from public/icon.svg
```

Requires Node 22+.

## Deploy

Pushes to `main` run lint, tests and build, then deploy to GitHub Pages via `.github/workflows/deploy.yml`. In the repo settings, set **Pages → Source** to **GitHub Actions**.

## End-to-end tests

E2E coverage runs in QA Wolf against the deployed Pages URL.
