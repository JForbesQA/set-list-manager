import type { SheetModel } from '../lib/sheet'

/** The printed-style set list: centred title with a rule, then a numbered list in two columns. */
export function SheetPaper({ model }: { model: SheetModel }) {
  return (
    <article className={`sheet${model.large ? ' sheet-large' : ''}`} aria-label={`${model.title} set list`}>
      <h2 className="sheet-title">{model.title}</h2>
      {model.subtitle && <p className="sheet-subtitle">{model.subtitle}</p>}
      {model.items.length === 0 ? (
        <p className="muted">This set list is empty.</p>
      ) : (
        <ol className="sheet-list">
          {model.items.map((item, i) => (
            <li key={i}>
              <span className="sheet-song">{item.title}</span>
              {item.artist && <span className="sheet-artist">{item.artist}</span>}
              {item.extras && <span className="sheet-extra">{item.extras}</span>}
            </li>
          ))}
        </ol>
      )}
      {model.total && <p className="sheet-total">{model.total}</p>}
    </article>
  )
}
