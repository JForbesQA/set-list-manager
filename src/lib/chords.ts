import type { Song } from './setlist'

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const NATURAL_SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

export const MAX_CAPO = 11

/**
 * The chord shapes you finger when playing `key` with a capo, e.g. F#m with capo 2 gives Em.
 * Returns null when there is no capo or the key can't be read.
 */
export function shapeKey(key: string, capo: number): string | null {
  if (capo <= 0 || capo > MAX_CAPO) return null
  const match = /^([A-G])([#b]?)(.*)$/.exec(key.trim())
  if (!match) return null
  const [, letter, accidental, rest] = match
  const root = (NATURAL_SEMITONES[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0) + 12) % 12
  const shapeRoot = (root - capo + 12) % 12
  // Flat-side keys (F, C and anything written with a flat) read more naturally with flats.
  const useFlats = accidental === 'b' || (accidental === '' && (letter === 'C' || letter === 'F'))
  return (useFlats ? FLATS : SHARPS)[shapeRoot] + rest
}

/** Display text for a song's key and capo, e.g. "Key F#m · Capo 2 (Em)". */
export function describeKey(song: Pick<Song, 'key' | 'capo'>): string {
  const capo = song.capo > 0 ? `Capo ${song.capo}` : ''
  if (!song.key) return capo
  if (!capo) return `Key ${song.key}`
  const shape = shapeKey(song.key, song.capo)
  return `Key ${song.key} · ${capo}${shape ? ` (${shape})` : ''}`
}

/** How many times the capo has to move between consecutive songs. */
export function capoChanges(songs: Pick<Song, 'capo'>[]): number {
  let changes = 0
  for (let i = 1; i < songs.length; i++) {
    if (songs[i].capo !== songs[i - 1].capo) changes++
  }
  return changes
}
