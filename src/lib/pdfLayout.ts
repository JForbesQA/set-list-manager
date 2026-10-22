/** Splits wrapped-text items into pages of balanced columns. Pure maths, so it is easy to test. */

export interface Placed<T> {
  item: T
  height: number
}

export type Page<T> = T[][] // columns

/**
 * Places items (in order) into columns of `capacity` height, `columns` per page.
 * Each page is balanced across its columns so a short set does not pile up in the first column.
 */
export function paginate<T>(placed: Placed<T>[], capacity: number, columns: number): Page<T>[] {
  const pages: Page<T>[] = []
  let i = 0
  while (i < placed.length) {
    // Take as many items as fit on one page (columns x capacity), column by column.
    const pageItems: Placed<T>[] = []
    let used = 0
    let colUsed = 0
    let col = 0
    while (i < placed.length) {
      const h = placed[i].height
      if (colUsed + h > capacity && colUsed > 0) {
        col += 1
        colUsed = 0
        if (col >= columns) break
      }
      pageItems.push(placed[i])
      colUsed += h
      used += h
      i += 1
    }
    pages.push(balance(pageItems, used, capacity, columns))
  }
  return pages
}

function balance<T>(items: Placed<T>[], total: number, capacity: number, columns: number): Page<T> {
  const cols: T[][] = Array.from({ length: columns }, () => [])
  if (columns === 1) {
    cols[0] = items.map((p) => p.item)
    return cols
  }
  // Fill each column up to an even share, never beyond the page capacity.
  const share = total / columns
  let col = 0
  let colUsed = 0
  for (const p of items) {
    const wouldOverflow = colUsed + p.height > capacity && colUsed > 0
    const reachedShare = colUsed >= share - p.height / 2 && colUsed > 0
    if (col < columns - 1 && (wouldOverflow || reachedShare)) {
      col += 1
      colUsed = 0
    }
    cols[col].push(p.item)
    colUsed += p.height
  }
  return cols
}
