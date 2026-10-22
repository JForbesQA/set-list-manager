# Set List Manager

A small personal app for building gig set lists from a song library. Data is stored in your browser's `localStorage`; there is no backend.

## Features

- Song library: title, artist, key you play in, capo, tempo (slow / medium / high), duration, notes; add, edit, delete, search
- Capo support: enter the sounding key and capo fret and the app shows the shapes you finger, e.g. `F#m · Capo 2 (Em)`
- "Needs review" flag for drafted data, with one-tap Confirm; last-played date per song
- Starter library of drafted songs to get going (durations from MusicBrainz and published album lengths)
- Set lists with name, date and venue; add, reorder, remove, duplicate; running total time
- Templates (open mic opener, 30 and 45 minute sets, 3 and 4 hour shows, plus your own) weighted towards high and
  medium tempo songs. A tempo plan per template (strict, loose or anything goes) controls how closely a set follows
  the mix. The generator also avoids repeating an artist back to back, favours songs you have not played recently,
  and prefers fewer capo changes
- Time targets use a small window rather than an exact number: tight below the target, a little looser above it, so a
  30 minute set lands between about 29:15 and 32:00 and an extra song beats stopping short
- Readable set list sheet modelled on a printed set list (two numbered columns, artist beneath each title) with
  options for key and capo, tempo, times and notes, a large-text stage mode, and Save as PDF / Save as Word (.docx)
  files (through the share sheet on iPhone, where web apps cannot print), print on desktop, and share or copy as text
- Backup: share (iPhone share sheet, Save to Files, AirDrop) or download everything as one JSON file, and restore it
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
