import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function parseDuration(value: string): number {
  const [m, s] = value.split(':').map(Number)
  if (isNaN(m) || isNaN(s)) return 0
  return m * 60 + s
}
``

function AdminPage() {
  const navigate = useNavigate()

  const [songs, setSongs] = useState<any[]>([])

  const [newSong, setNewSong] = useState({ name: '', duration: 180 })

  const [loading, setLoading] = useState(false)

  const [editingDurations, setEditingDurations] = useState<Record<number, string>>({})

  // ========================
  // LOAD DATA
  // ========================
  useEffect(() => {
    loadSongs()
  }, [])

  async function loadSongs() {
    const { data } = await supabase.from('SONGS').select('*').order('name')
    setSongs(data ?? [])
  }

  // ========================
  // SONGS
  // ========================
  async function addSong() {
    if (!newSong.name) return

    await supabase.from('SONGS').insert(newSong)
    setNewSong({ name: '', duration: 180 })
    loadSongs()
  }

  async function updateSong(id: number, field: string, value: any) {
    await supabase.from('SONGS').update({ [field]: value }).eq('id', id)
  }

  async function deleteSong(id: number) {
    await supabase.from('SONGS').delete().eq('id', id)
    loadSongs()
  }

  // ========================
  // UI
  // ========================
  return (
    <div className="card">
      <button className="button" onClick={() => navigate('/agenda')}>
        Retour
      </button>

      <h2>Administration</h2>

      {/* ====================== */}
      {/* SONGS */}
      {/* ====================== */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3>🎵 Musiques</h3>

        {/* ADD */}
        <div className="song-add">
            <input
                className="input"
                placeholder="Nom du morceau"
                value={newSong.name}
                onChange={(e) =>
                setNewSong({ ...newSong, name: e.target.value })
                }
            />

            <input
                className="input"
                placeholder="3:00"
                value={formatDuration(newSong.duration)}
                onChange={(e) => {
                    const val = e.target.value

                    if (!/^\d{0,2}:?\d{0,2}$/.test(val) && val !== '') return

                    if (val.includes(':')) {
                    setNewSong({
                        ...newSong,
                        duration: parseDuration(val)
                    })
                    }
                }}
            />


            <button className="button" onClick={addSong}>
                + Ajouter
            </button>
        </div>

        {/* LIST */}
        <ul className="songs-list">
            {songs.map((song) => (
                <li key={song.id} className="song-row">
                    <input
                        className="song-name"
                        value={song.name}
                        onChange={(e) =>
                        updateSong(song.id, 'name', e.target.value)
                        }
                    />

                    <input
                      className="song-duration-input"
                      value={
                        editingDurations[song.id] ??
                        formatDuration(song.duration)
                      }
                      onChange={(e) =>
                        setEditingDurations(prev => ({
                          ...prev,
                          [song.id]: e.target.value
                        }))
                      }
                      onBlur={() => {
                        const value =
                          editingDurations[song.id] ??
                          formatDuration(song.duration)

                        updateSong(
                          song.id,
                          'duration',
                          parseDuration(value)
                        )

                        loadSongs()
                      }}
                    />

                    <button
                        className="delete-button"
                        onClick={() => deleteSong(song.id)}
                        >
                        ✕
                    </button>
                </li>
            ))}
        </ul>
      </div>
    </div>
  )
}

export default AdminPage