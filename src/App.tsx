import { useState } from 'react'
import './App.css'
import { BackupView } from './BackupView'
import { SetListsView } from './SetListsView'
import { SongsView } from './SongsView'
import { TemplatesView } from './TemplatesView'
import { starterSongsMissingFrom } from './data/starterLibrary'
import { DEFAULT_SETTINGS, normalizeSettings, type Settings } from './lib/settings'
import { useLocalStorage } from './lib/useLocalStorage'
import { normalizeSetList, normalizeSong, type SetList, type Song } from './lib/setlist'
import { BUILT_IN_TEMPLATES, normalizeTemplate, type Template } from './lib/templates'

type Tab = 'songs' | 'sets' | 'templates' | 'backup'

const TABS: [Tab, string][] = [
  ['songs', 'Songs'],
  ['sets', 'Set Lists'],
  ['templates', 'Templates'],
  ['backup', 'Backup'],
]

const migrateList =
  <T,>(normalize: (raw: unknown) => T | null) =>
  (raw: unknown): T[] =>
    Array.isArray(raw) ? raw.flatMap((x) => normalize(x) ?? []) : []

export default function App() {
  const [songs, setSongs] = useLocalStorage<Song[]>('slm.songs', [], migrateList(normalizeSong))
  const [setLists, setSetLists] = useLocalStorage<SetList[]>('slm.setlists', [], migrateList(normalizeSetList))
  const [templates, setTemplates] = useLocalStorage<Template[]>('slm.templates', [], migrateList(normalizeTemplate))
  const [settings, setSettings] = useLocalStorage<Settings>('slm.settings', DEFAULT_SETTINGS, normalizeSettings)
  const [tab, setTab] = useState<Tab>('songs')

  function saveSong(song: Song) {
    setSongs((prev) => (prev.some((s) => s.id === song.id) ? prev.map((s) => (s.id === song.id ? song : s)) : [...prev, song]))
  }

  function deleteSong(id: string) {
    setSongs((prev) => prev.filter((s) => s.id !== id))
    setSetLists((prev) => prev.map((s) => ({ ...s, songIds: s.songIds.filter((sid) => sid !== id) })))
  }

  function loadStarter(): number {
    const added = starterSongsMissingFrom(songs)
    setSongs((prev) => [...prev, ...added])
    return added.length
  }

  return (
    <div className="app">
      <header>
        <h1>Set List Manager</h1>
        <nav aria-label="Main">
          {TABS.map(([id, label]) => (
            <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </nav>
      </header>
      <main>
        {tab === 'songs' && (
          <SongsView
            songs={songs}
            setLists={setLists}
            onSave={saveSong}
            onDelete={deleteSong}
            onLoadStarter={loadStarter}
          />
        )}
        {tab === 'sets' && (
          <SetListsView
            songs={songs}
            setLists={setLists}
            templates={[...BUILT_IN_TEMPLATES, ...templates]}
            gapSec={settings.gapSec}
            onGapChange={(gapSec) => setSettings({ ...settings, gapSec })}
            onChange={setSetLists}
          />
        )}
        {tab === 'templates' && (
          <TemplatesView builtIn={BUILT_IN_TEMPLATES} custom={templates} onChange={setTemplates} />
        )}
        {tab === 'backup' && (
          <BackupView
            data={{ songs, setLists, templates, settings }}
            onRestore={(d) => {
              setSongs(d.songs)
              setSetLists(d.setLists)
              setTemplates(d.templates)
              setSettings(d.settings)
            }}
          />
        )}
      </main>
      <footer className="version">
        Set List Manager v{__APP_VERSION__} · built {__BUILD_DATE__} · {__COMMIT__}
      </footer>
    </div>
  )
}
