import { useState } from 'react'
import './App.css'
import { SetListsView } from './SetListsView'
import { SongsView } from './SongsView'
import { useLocalStorage } from './lib/useLocalStorage'
import type { SetList, Song } from './lib/setlist'

type Tab = 'songs' | 'sets'

export default function App() {
  const [songs, setSongs] = useLocalStorage<Song[]>('slm.songs', [])
  const [setLists, setSetLists] = useLocalStorage<SetList[]>('slm.setlists', [])
  const [tab, setTab] = useState<Tab>('songs')

  function deleteSong(id: string) {
    setSongs((prev) => prev.filter((s) => s.id !== id))
    setSetLists((prev) => prev.map((s) => ({ ...s, songIds: s.songIds.filter((sid) => sid !== id) })))
  }

  return (
    <div className="app">
      <header>
        <h1>Set List Manager</h1>
        <nav aria-label="Main">
          <button type="button" aria-pressed={tab === 'songs'} onClick={() => setTab('songs')}>
            Songs
          </button>
          <button type="button" aria-pressed={tab === 'sets'} onClick={() => setTab('sets')}>
            Set Lists
          </button>
        </nav>
      </header>
      <main>
        {tab === 'songs' ? (
          <SongsView songs={songs} onAdd={(s) => setSongs((prev) => [...prev, s])} onDelete={deleteSong} />
        ) : (
          <SetListsView songs={songs} setLists={setLists} onChange={setSetLists} />
        )}
      </main>
    </div>
  )
}
