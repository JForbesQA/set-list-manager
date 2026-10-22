import { describeKey } from './chords'
import { formatDuration, setListSongs, totalDuration, type SetList, type Song } from './setlist'

/** What to show on the readable set list sheet. */
export interface SheetOptions {
  showArtist: boolean
  showKey: boolean
  showTempo: boolean
  showDuration: boolean
  showNotes: boolean
  /** Bigger single-column type that is easy to read on a stage. */
  large: boolean
}

export const DEFAULT_SHEET: SheetOptions = {
  showArtist: true,
  showKey: false,
  showTempo: false,
  showDuration: false,
  showNotes: false,
  large: false,
}

/** Merges stored options over the defaults so newly added options still get a value. */
export function normalizeSheetOptions(raw: unknown): SheetOptions {
  const stored = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
  const pick = (k: keyof SheetOptions) => (typeof stored[k] === 'boolean' ? (stored[k] as boolean) : DEFAULT_SHEET[k])
  return {
    showArtist: pick('showArtist'),
    showKey: pick('showKey'),
    showTempo: pick('showTempo'),
    showDuration: pick('showDuration'),
    showNotes: pick('showNotes'),
    large: pick('large'),
  }
}

/** The small print under a song title: key and capo, tempo, length, notes, as chosen. */
export function songExtras(song: Song, o: SheetOptions): string[] {
  return [
    o.showKey ? describeKey(song) : '',
    o.showTempo && song.tempo ? `${song.tempo} tempo` : '',
    o.showDuration ? formatDuration(song.durationSec) : '',
    o.showNotes ? song.notes : '',
  ].filter(Boolean)
}

export function sheetSubtitle(set: SetList): string {
  return [set.date, set.venue].filter(Boolean).join(' · ')
}

/** Plain text version of the sheet, for messages, email or pasting somewhere else. */
export function setListText(set: SetList, songs: Song[], o: SheetOptions): string {
  const inSet = setListSongs(set, songs)
  const lines = [set.name]
  const sub = sheetSubtitle(set)
  if (sub) lines.push(sub)
  lines.push('')
  inSet.forEach((s, i) => {
    const extras = songExtras(s, o)
    const head = `${i + 1}. ${s.title}${o.showArtist && s.artist ? ` — ${s.artist}` : ''}`
    lines.push(extras.length > 0 ? `${head} (${extras.join(' · ')})` : head)
  })
  if (o.showDuration && inSet.length > 0) {
    lines.push('', `${inSet.length} songs · ${formatDuration(totalDuration(set, songs))}`)
  }
  return lines.join('\n')
}
