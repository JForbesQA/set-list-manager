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
export function setListText(set: SetList, songs: Song[], o: SheetOptions, gapSec = 0): string {
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
    lines.push('', `${inSet.length} songs · ${formatDuration(totalDuration(set, songs, gapSec))}`)
  }
  return lines.join('\n')
}

export interface SheetItem {
  title: string
  artist: string
  extras: string
}

/** Everything a file export needs, already resolved from the set list and the chosen options. */
export interface SheetModel {
  title: string
  subtitle: string
  /** e.g. "8 songs · 30:02", or '' when times are switched off. */
  total: string
  large: boolean
  items: SheetItem[]
}

export function sheetModel(set: SetList, songs: Song[], o: SheetOptions, gapSec = 0): SheetModel {
  const inSet = setListSongs(set, songs)
  return {
    title: set.name,
    subtitle: sheetSubtitle(set),
    total:
      o.showDuration && inSet.length > 0 ? `${inSet.length} songs · ${formatDuration(totalDuration(set, songs, gapSec))}` : '',
    large: o.large,
    items: inSet.map((s) => ({
      title: s.title,
      artist: o.showArtist ? s.artist : '',
      extras: songExtras(s, o).join(' · '),
    })),
  }
}

/** A safe file name stem from a set list name, e.g. "Friday Night Gig" -> "friday-night-gig". */
export function fileStem(name: string): string {
  const stem = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return stem || 'set-list'
}
