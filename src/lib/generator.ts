import { lastPlayed, TEMPOS, type SetList, type Song, type Tempo } from './setlist'
import type { Template } from './templates'

export interface GenerateOptions {
  /** Same seed + same inputs gives the same set, which keeps tests deterministic. */
  seed?: number
  /** YYYY-MM-DD used to work out how recently each song was played. */
  today?: string
}

export interface GeneratedSet {
  songIds: string[]
  totalSec: number
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Splits `total` across tempos in proportion to `weights` (largest remainder). */
export function allocate(total: number, weights: Record<Tempo, number>): Record<Tempo, number> {
  const sum = TEMPOS.reduce((s, t) => s + weights[t], 0)
  const counts: Record<Tempo, number> = { slow: 0, medium: 0, high: 0 }
  if (total <= 0 || sum <= 0) return counts
  const remainders = TEMPOS.map((t) => {
    const exact = (total * weights[t]) / sum
    counts[t] = Math.floor(exact)
    return { t, rem: exact - counts[t] }
  })
  let left = total - TEMPOS.reduce((s, t) => s + counts[t], 0)
  remainders.sort((a, b) => b.rem - a.rem)
  for (const { t } of remainders) {
    if (left <= 0) break
    counts[t] += 1
    left -= 1
  }
  return counts
}

/** A mild nudge, so tempo and variety still win, towards fewer capo moves on stage. */
const CAPO_CHANGE_PENALTY = 0.4

const TIE_ORDER: Tempo[] = ['medium', 'high', 'slow']

/** One random tempo, weighted by the mix, skipping `avoid` unless nothing else has any weight. */
function drawTempo(mix: Record<Tempo, number>, rng: () => number, avoid: Tempo | null = null): Tempo {
  const weight = (t: Tempo) => (t === avoid ? 0 : mix[t])
  const usable = TEMPOS.some((t) => weight(t) > 0)
  const w = (t: Tempo) => (usable ? weight(t) : mix[t])
  const total = TEMPOS.reduce((s, t) => s + w(t), 0)
  let roll = rng() * total
  for (const t of TEMPOS) {
    roll -= w(t)
    if (roll < 0) return t
  }
  return TEMPOS[TEMPOS.length - 1]
}

/**
 * Tempo wanted for each of `n` slots (null means any tempo).
 * strict: exact counts, opener/closer at the ends, no back-to-back repeats where possible.
 * loose: opener/closer at the ends, every other slot a random draw weighted by the mix.
 * any: no tempo preference at all.
 */
export function planTempos(
  n: number,
  t: Pick<Template, 'mix' | 'opener' | 'closer' | 'variety'>,
  rng: () => number = Math.random,
): (Tempo | null)[] {
  if (n <= 0) return []
  if (t.variety === 'any') return Array<null>(n).fill(null)
  if (n === 1) {
    const counts = allocate(1, t.mix)
    return [t.opener ?? t.closer ?? TEMPOS.find((k) => counts[k] > 0) ?? 'medium']
  }
  const first = t.opener
  const last = t.closer
  const middleLen = n - (first ? 1 : 0) - (last ? 1 : 0)
  const plan: Tempo[] = first ? [first] : []

  if (t.variety === 'loose') {
    for (let i = 0; i < middleLen; i++) {
      const prev = plan[plan.length - 1] ?? null
      // Never three of the same tempo in a row, including into the closing song.
      const twoSame = plan.length >= 2 && prev === plan[plan.length - 2]
      const beforeCloser = i === middleLen - 1 && last !== null && prev === last
      plan.push(drawTempo(t.mix, rng, twoSame || beforeCloser ? prev : null))
    }
  } else {
    const counts = allocate(middleLen, t.mix)
    let prev: Tempo | null = first
    for (let i = 0; i < middleLen; i++) {
      const open = TIE_ORDER.filter((k) => counts[k] > 0)
      const differing = open.filter((k) => k !== prev)
      const pool = differing.length > 0 ? differing : open
      const pick = pool.reduce((best, k) => (counts[k] > counts[best] ? k : best), pool[0])
      counts[pick] -= 1
      plan.push(pick)
      prev = pick
    }
  }
  if (last) plan.push(last)
  return plan
}

function staleness(songId: string, setLists: SetList[], today: string): number {
  const last = lastPlayed(songId, setLists)
  if (!last) return 1
  const days = (Date.parse(today) - Date.parse(last)) / 86_400_000
  return Math.min(Math.max(days, 0), 365) / 365
}

function build(
  n: number,
  template: Template,
  songs: Song[],
  setLists: SetList[],
  seed: number,
  today: string,
): GeneratedSet {
  const rng = mulberry32(seed)
  const plan = planTempos(n, template, rng)
  const chosen: Song[] = []
  const used = new Set<string>()

  for (const tempo of plan) {
    const unused = songs.filter((s) => !used.has(s.id))
    if (unused.length === 0) break
    const exact = tempo === null ? [] : unused.filter((s) => s.tempo === tempo)
    const untagged = unused.filter((s) => s.tempo === null)
    const pool = tempo === null ? unused : exact.length > 0 ? exact : untagged.length > 0 ? untagged : unused
    const prev = chosen[chosen.length - 1]

    let best = pool[0]
    let bestScore = -Infinity
    for (const song of pool) {
      let score = rng() + staleness(song.id, setLists, today)
      if (prev && song.artist && song.artist === prev.artist) score -= 1.5
      if (prev && song.key && song.key === prev.key) score -= 0.3
      if (prev && song.capo !== prev.capo) score -= CAPO_CHANGE_PENALTY
      if (score > bestScore) {
        bestScore = score
        best = song
      }
    }
    chosen.push(best)
    used.add(best.id)
  }

  return { songIds: chosen.map((s) => s.id), totalSec: chosen.reduce((sum, s) => sum + s.durationSec, 0) }
}

export function generateSet(
  template: Template,
  songs: Song[],
  setLists: SetList[],
  options: GenerateOptions = {},
): GeneratedSet {
  if (songs.length === 0) return { songIds: [], totalSec: 0 }
  const seed = options.seed ?? Math.floor(Math.random() * 2 ** 32)
  const today = options.today ?? new Date().toISOString().slice(0, 10)

  if (template.limitType === 'songs') {
    return build(Math.min(template.limitValue, songs.length), template, songs, setLists, seed, today)
  }

  // Time-based: try a few song counts around the estimate and keep the closest to the target.
  const target = template.limitValue * 60
  const avg = songs.reduce((s, x) => s + x.durationSec, 0) / songs.length
  const estimate = Math.max(1, Math.round(target / avg))
  let best: GeneratedSet | null = null
  // A library that cannot reach the target just uses every song it has.
  const from = Math.min(Math.max(1, estimate - 2), songs.length)
  const to = Math.min(songs.length, estimate + 2)
  for (let n = from; n <= to; n++) {
    const candidate = build(n, template, songs, setLists, seed, today)
    const better =
      best === null ||
      Math.abs(candidate.totalSec - target) < Math.abs(best.totalSec - target) ||
      (Math.abs(candidate.totalSec - target) === Math.abs(best.totalSec - target) &&
        candidate.songIds.length < best.songIds.length)
    if (better) best = candidate
  }
  return best ?? { songIds: [], totalSec: 0 }
}
