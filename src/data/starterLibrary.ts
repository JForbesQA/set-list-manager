import { newId, songKeyOf, type Song, type Tempo } from '../lib/setlist'

type Starter = [title: string, artist: string, durationSec: number, tempo: Tempo, key?: string, notes?: string]

/**
 * Starter repertoire. Durations come mostly from MusicBrainz studio recordings (a few from the
 * commonly published album length), tempos are rough slow / medium / high calls, and keys are the
 * original recording's key where it is well known. Everything is flagged "Needs review" until
 * confirmed in the app, because the keys, capo and length you actually play may differ.
 */
const STARTER: Starter[] = [
  ['Dock of the Bay', 'Otis Redding', 162, 'slow', 'G'],
  ['Folsom Prison Blues', 'Johnny Cash', 168, 'high', 'E'],
  ['Bobcaygeon', 'The Tragically Hip', 296, 'medium'],
  ["Don't Think Twice", 'Bob Dylan', 220, 'medium', 'C'],
  ['Renegades', 'X Ambassadors', 194, 'high'],
  ['Take It Easy', 'Eagles', 212, 'medium', 'G'],
  ["Mary Jane's Last Dance", 'Tom Petty and the Heartbreakers', 275, 'medium', 'Am'],
  ['Island in the Sun', 'Weezer', 200, 'medium'],
  ['Heart of Gold', 'Neil Young', 188, 'slow', 'Em'],
  ['Norwegian Wood', 'The Beatles', 125, 'slow'],
  ['I Shot the Sheriff', 'Bob Marley', 265, 'medium', 'Gm', 'Eric Clapton version'],
  ['Unwell', 'Matchbox Twenty', 229, 'slow'],
  ['The Boxer', 'Simon & Garfunkel', 311, 'medium'],
  ["Hasn't Hit Me Yet", 'Blue Rodeo', 313, 'medium'],
  ['Under the Bridge', 'Red Hot Chili Peppers', 268, 'slow', 'D'],
  ['Santeria', 'Sublime', 185, 'medium'],
  ['All My Loving', 'The Beatles', 128, 'high', 'E'],
  ['Crabbuckit', 'k-os', 227, 'high'],
  ['Murder in the City', 'The Avett Brothers', 256, 'slow'],
  ["The Times They Are A-Changin'", 'Bob Dylan', 195, 'slow'],
  ['Sweater Weather', 'The Neighbourhood', 240, 'medium'],
  ['I Will', 'The Beatles', 106, 'slow'],
  ['Wheat Kings', 'The Tragically Hip', 259, 'slow'],
  ['Bad Moon Rising', 'Creedence Clearwater Revival', 140, 'high', 'D'],
  ['Banana Pancakes', 'Jack Johnson', 191, 'slow'],
  ["Ain't No Sunshine", 'Bill Withers', 125, 'slow', 'Am'],
  ['What I Got', 'Sublime', 170, 'medium'],
  ["Won't Back Down", 'Tom Petty', 185, 'medium'],
  ["I've Just Seen a Face", 'The Beatles', 126, 'high'],
  ['No Diggity', 'Blackstreet', 304, 'medium'],
  ["I'm on Fire", 'Bruce Springsteen', 157, 'slow'],
  ['Little Black Submarines', 'The Black Keys', 251, 'medium'],
  ['Superstition', 'Stevie Wonder', 266, 'high', 'Ebm'],
  ['Sweet Home Chicago', 'The Blues Brothers', 431, 'high', 'E'],
]

/** Starter songs that are not already in the library (matched on title + artist). */
export function starterSongsMissingFrom(existing: Song[]): Song[] {
  const have = new Set(existing.map(songKeyOf))
  return STARTER.flatMap(([title, artist, durationSec, tempo, key = '', notes = '']) => {
    const song: Song = { id: newId(), title, artist, key, tempo, durationSec, notes, needsReview: true }
    return have.has(songKeyOf(song)) ? [] : [song]
  })
}

export const STARTER_COUNT = STARTER.length
