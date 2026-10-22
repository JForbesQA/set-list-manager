import type { Song } from './setlist'

export const makeSong = (id: string, durationSec = 200, extra: Partial<Song> = {}): Song => ({
  id,
  title: id,
  artist: `Artist ${id}`,
  key: '',
  tempo: 'medium',
  durationSec,
  notes: '',
  needsReview: false,
  ...extra,
})
