import { formatDuration, type Song } from './setlist'
import type { Template } from './templates'

/**
 * Message to show after generating a set, or '' when it came out as asked.
 * Only blames the library when the whole library really cannot reach the target.
 */
export function generationNotice(template: Template, totalSec: number, songs: Song[]): string {
  if (template.limitType === 'songs') {
    return songs.length < template.limitValue
      ? `Your library only has ${songs.length} songs, so this set has fewer than ${template.limitValue}.`
      : ''
  }
  const target = template.limitValue * 60
  const library = songs.reduce((sum, s) => sum + s.durationSec, 0)
  if (library < target) {
    return `Your whole library is only ${formatDuration(library)} of music, so this set cannot reach the ${template.limitValue} minute target. Add more songs to fill it.`
  }
  if (Math.abs(totalSec - target) > Math.max(120, target * 0.08)) {
    return `This set came out at ${formatDuration(totalSec)} against a ${template.limitValue} minute target. Try Regenerate for another draw.`
  }
  return ''
}
