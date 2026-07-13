import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Event, EventType, EventStatus } from '../types'
import Select from 'react-select'
import {DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors} from '@dnd-kit/core'

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'

import { CSS } from '@dnd-kit/utilities'

function SortableSongItem({
  song,
  onRemove
}: {
  song: { id: number; name: string }
  onRemove: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id: song.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="sortable-song"
    >
      <span
        className="drag-handle"
        {...attributes}
        {...listeners}
      >
        ⠿
      </span>

      <span className="song-name">{song.name}</span>

      <button
          type="button"
          className="remove-song"
          onClick={(e) => {
            e.stopPropagation()   // ✅ empêche le drag
            onRemove()
          }}
          onPointerDown={(e) => {
            e.stopPropagation()   // ✅ empêche drag au mousedown
          }}
        >
          ✕
      </button>
    </li>
  )
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function getSetListDuration(songs: { duration: number }[]): number {
  return songs.reduce((total, song) => total + (song.duration ?? 0), 0)
}

function getNowFormatted() {
  const now = new Date()
  
  now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30)

  const pad = (n: number) => n.toString().padStart(2, '0')

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

function getNowPlusHours(hours: number) {
  const now = new Date()
  now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30)
  now.setHours(now.getHours() + hours)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}


function EventFormPage() {
  const { id } = useParams<{ id: string }>()

  const [event, setEvent] = useState<Partial<Event>>({
    date_from: getNowFormatted(),
    date_to: getNowPlusHours(2)
  })

  const [types, setTypes] = useState<EventType[]>([])
  const [statuses, setStatuses] = useState<EventStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingRights, setCheckingRights] = useState(true)
  const [allMusicians, setAllMusicians] = useState<Musician[]>([])
  const [presences, setPresences] = useState<Record<number, boolean | undefined>>({})
  
  const sensors = useSensors(
    useSensor(MouseSensor),   // ✅ IMPORTANT desktop
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  )

  function generateTimeOptions() {
    const times: string[] = []

    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        times.push(
          `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        )
      }
    }

    return times
  }

  const TIME_OPTIONS = generateTimeOptions()

  
function togglePresence(musicianId: number) {
  setPresences(prev => {
    const current = prev[musicianId]

    if (current !== undefined) {
      return {
        ...prev,
        [musicianId]: !current
      }
    }

    return {
      ...prev,
      [musicianId]: true
    }
  })
}

  type SetList = {
    id: string;          // uuid local
    name: string;        // "A", "B", "C"
    songs: {
      id: number;
      name: string;
      duration: number;
    }[];
  };
  
  type Musician = {
    id: number
    name: string
    instrument?: string
  }

  const [setLists, setSetLists] = useState<SetList[]>([]);

  function normalizeSetListNames(lists: SetList[]): SetList[] {
    return lists.map((list, index) => ({
      ...list,
      name: String.fromCharCode(65 + index) // A, B, C...
    }))
  }


  useEffect(() => {
    if (!isEdit) {
      const now = getNowFormatted()

      setEvent(prev => ({
        ...prev,
        date_from: now,
        date_to: getNowPlusHours(2)
      }))
    }
  }, [isEdit])


  useEffect(() => {
    async function loadMetadata() {
      console.log('Chargement des métadonnées...')
      const [typeResult, statusResult] = await Promise.all([
        supabase.from('EVENT_TYPE').select('*'),
        supabase.from('EVENT_STATUS').select('*')
      ])
      
      console.log('typeResult:', typeResult)
      console.log('statusResult:', statusResult)
      
      if (typeResult.error) {
        console.error('Erreur event_type:', typeResult.error)
        setError(`Erreur types: ${typeResult.error.message}`)
      } else {
        console.log('Types chargés:', typeResult.data)
        setTypes(typeResult.data ?? [])
        setError(`Types: ${typeResult.data?.length ?? 0} lignes reçues`)
      }
      
      if (statusResult.error) {
        console.error('Erreur event_status:', statusResult.error)
        setError(prev => `${prev}; Erreur statuts: ${statusResult.error.message}`)
      } else {
        console.log('Statuts chargés:', statusResult.data)
        setStatuses(statusResult.data ?? [])
      }
    }

    loadMetadata()
  }, [])

  const [songs, setSongs] = useState<{ value: number; label: string; duration: number }[]>([]);
  const songDurationMap = new Map(
    songs.map(s => [s.value, Number(s.duration)])
  )

  useEffect(() => {
      supabase.from('SONGS').select('id, name, duration').order('name', { ascending: true }).then(({ data }) => {
        if (data) {
          setSongs(data.map(s => ({ value: s.id, label: s.name, duration: s.duration })));
        }
      });
    }, []);

    useEffect(() => {
    async function loadMusicians() {
      const { data } = await supabase
        .from('MUSICIANS')
        .select('*')

      if (data) setAllMusicians(data)
    }

    loadMusicians()
  }, [])


useEffect(() => {
  if (!id) return

  async function loadCurrent() {
    setLoading(true)

    const { data, error } = await supabase
      .from('EVENT')
      .select(`
        *,
        EVENT_SONGS(
          *,
          SONGS(*)
        ), EVENT_MUSICIANS(*)
      `)
      .eq('id', Number(id))
      .single()

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    if (data) {
      setEvent(data)

      if (data.EVENT_SONGS) {
        const grouped = data.EVENT_SONGS.reduce((acc: Record<string, any>, item: any) => {
          const key = item.setlist ?? 'A'

          if (!acc[key]) {
            acc[key] = {
              id: crypto.randomUUID(),
              name: key,
              songs: []
            }
          }

          acc[key].songs.push({
            id: item.SONGS?.id,
            name: item.SONGS?.name,
            duration: item.SONGS?.duration ?? 0,
            position: item.position
          })

          return acc
        }, {} as Record<string, any>)

        const setlists = Object.values(grouped).map((sl: any) => ({
          ...sl,
          songs: sl.songs.sort((a: any, b: any) => a.position - b.position)
        }))

        setSetLists(setlists)
      }

      if (data.EVENT_MUSICIANS) {
        const presenceMap: Record<number, boolean> = {}

        data.EVENT_MUSICIANS.forEach((item: any)=> {
          presenceMap[item.musician_id] = item.is_present
        })
        setPresences(presenceMap)
      }

    }

    setLoading(false)
  }

  loadCurrent()
}, [id])

  const handleChange = (field: keyof Event, value: string) => {
    setEvent((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (eventSubmit: React.FormEvent) => {
    eventSubmit.preventDefault()
    setLoading(true)

    const payload = {
      title: event.title,
      event_type_id: Number(event.event_type_id),
      event_status_id: event.event_status_id ? Number(event.event_status_id) : undefined,
      date_from: event.date_from,
      date_to: event.date_to,
      location: event.location,
      dresscode: event.dresscode,
      comment: event.comment
    }

    if (isEdit && id) {
      const { error } = await supabase
        .from('EVENT')
        .update(payload)
        .eq('id', Number(id))

      if (error) {
        console.error(error)
        setError(`Échec mise à jour : ${error.message}`)
        setLoading(false)
        return
      }

      const eventId = Number(id)

      //supprimer les anciennes setlists
      const { error: deleteError } = await supabase
        .from('EVENT_SONGS')
        .delete()
        .eq('event_id', eventId)

      if (deleteError) {
        console.error(deleteError)
        setError(`Erreur suppression setlists : ${deleteError.message}`)
        setLoading(false)
        return
      }

      // réinsérer les setlists actuelles
      if (setLists.length > 0) {
        const rows = setLists.flatMap(setlist =>
          setlist.songs.map((song, index) => ({
            event_id: eventId,
            song_id: song.id,
            setlist: setlist.name,   // A, B, C
            position: index
          }))
        )

        const { error: insertError } = await supabase
          .from('EVENT_SONGS')
          .insert(rows)

        if (insertError) {
          console.error(insertError)
          setError(`Erreur sauvegarde setlists : ${insertError.message}`)
          setLoading(false)
          return
        }
      }

      // ✅ SUPPRIMER anciennes présences
      const { error: deletePresenceError } = await supabase
        .from('EVENT_MUSICIANS')
        .delete()
        .eq('event_id', eventId)

      if (deletePresenceError) {
        console.error(deletePresenceError)
        setError(`Erreur suppression présences : ${deletePresenceError.message}`)
        setLoading(false)
        return
      }

      // ✅ INSÉRER nouvelles présences
      const presenceRows = Object.entries(presences).map(([musicianId, isPresent]) => ({
        event_id: eventId,
        musician_id: Number(musicianId),
        is_present: isPresent
      }))

      if (presenceRows.length > 0) {
        const { error: insertPresenceError } = await supabase
          .from('EVENT_MUSICIANS')
          .insert(presenceRows)

        if (insertPresenceError) {
          console.error(insertPresenceError)
          setError(`Erreur sauvegarde présences : ${insertPresenceError.message}`)
          setLoading(false)
          return
        }
      }

      navigate(`/events/${eventId}`)
    }

    else {
      const { data, error } = await supabase
        .from('EVENT')
        .insert(payload)
        .select('id')
        .single()

      if (error) {
        console.error(error)
        setError(`Échec création : ${error.message}`)
        setLoading(false)
        return
      }

      const eventId = data.id

      if (setLists.length > 0) {
        const rows = setLists.flatMap(setlist =>
          setlist.songs.map((song, index) => ({
            event_id: eventId,
            song_id: song.id,
            setlist: setlist.name,   // A, B, C…
            position: index          // ordre
          }))
        )

        const { error: setlistError } = await supabase
          .from('EVENT_SONGS')
          .insert(rows)

        if (setlistError) {
          console.error(setlistError)
          setError(`Erreur setlists : ${setlistError.message}`)
          setLoading(false)
          return
        }
      }
      navigate(`/events/${eventId}`)
    }


    setLoading(false)
  }

  useEffect(() => {
    async function loadAdminStatus() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) {
        setCheckingRights(false)
        return
      }

      const { data, error } = await supabase
        .from('MUSICIANS')
        .select('is_admin')
        .eq('user_id', userData.user.id)
        .single()

      if (!error && data?.is_admin) {
        setIsAdmin(true)
      }

      setCheckingRights(false)
    }

    loadAdminStatus()
  }, [])

  if (checkingRights) {
    return <div className="card">Vérification des droits…</div>
  }

  if (!isAdmin) {
    return (
      <div className="card">
        <h2>Accès restreint</h2>
        <p>
          Seuls les administrateurs peuvent créer ou modifier des événements.
        </p>
        <button
          className="button"
          type="button"
          onClick={() => navigate('/agenda')}
        >
          Retour à l’agenda
        </button>
      </div>
    )
  }

  
function addHours(dateTime: string, hours: number): string {
  const date = new Date(dateTime)
  date.setHours(date.getHours() + hours)

  const pad = (n: number) => n.toString().padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function handleDateFromChange(value: string) {
  setEvent(prev => ({
    ...prev,
    date_from: value,
    date_to: addHours(value, 2)
  }))
}


  return (
    <div className="card">
      <button className="button" type="button" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        Retour à l’agenda
      </button>
      <h2>{isEdit ? 'Modifier un événement' : 'Ajouter un événement'}</h2>
      <form className="grid" onSubmit={handleSubmit}>
        <input
          className="input"
          value={event.title ?? ''}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Titre de l’événement"
          required
        />
        <select
          className="select"
          value={event.event_type_id ?? ''}
          onChange={(e) => handleChange('event_type_id', e.target.value)}
          required
        >
          <option value="">Type d’événement</option>
          {types.map((type) => (
            <option key={type.id} value={type.id}>{type.name}</option>
          ))}
        </select>
        <select
          className="select"
          value={event.event_status_id ?? ''}
          onChange={(e) => handleChange('event_status_id', e.target.value)}
        >
          <option value="">Statut (optionnel)</option>
          {statuses.map((status) => (
            <option key={status.id} value={status.id}>{status.name}</option>
          ))}
        </select>
        
        <input
          className="input"
          type="datetime-local"
          step={900}
          value={event.date_from ?? ''}
          onChange={(e) => handleDateFromChange(e.target.value)}
          required
        />
        <input
          className="input"
          type="datetime-local"
          step={900}
          value={event.date_to ?? ''}
          onChange={(e) => handleChange('date_to', e.target.value)}
        />
        
        <input
          className="input"
          value={event.location ?? ''}
          onChange={(e) => handleChange('location', e.target.value)}
          placeholder="Lieu"
        />
        <input
          className="input"
          value={event.dresscode ?? ''}
          onChange={(e) => handleChange('dresscode', e.target.value)}
          placeholder="Dresscode"
        />
        <textarea
          className="textarea"
          value={event.comment ?? ''}
          onChange={(e) => handleChange('comment', e.target.value)}
          placeholder="Commentaire"
          rows={4}
        />
        <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              const nextName = String.fromCharCode(65 + setLists.length); // A, B, C
              setSetLists(prev => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  name: nextName,
                  songs: []
                }
              ]);
            }}
          >
            Ajouter setlist
        </button>

        <div className="setlist-grid">
          {setLists.map(setlist => (
            <div key={setlist.id} className="card setlist-card">
              <div className="setlist-header">
                <h4> Setlist {setlist.name}
                  <span className="setlist-duration">
                    {formatDuration(getSetListDuration(setlist.songs))}
                  </span>
                </h4>

                <button
                  type="button"
                  className="remove-setlist"
                  onClick={() => {
                    setSetLists(prev =>
                      normalizeSetListNames(
                        prev.filter(sl => sl.id !== setlist.id)
                      )
                    )
                  }}
                >
                  ✕
                </button>
              </div>

                <Select
                  isMulti
                  options={songs}
                  value={setlist.songs.map(s => ({ value: s.id, label: s.name }))}
                  styles={{ multiValue: () => ({ display: 'none' }) }}
                  controlShouldRenderValue={false}
                  hideSelectedOptions={true}
                  closeMenuOnSelect={false}
                  menuPortalTarget={document.body}

                  placeholder="Ajouter…"

                  onChange={(selected) => {
                    setSetLists(prev =>
                      prev.map(sl =>
                        sl.id === setlist.id
                          ? {
                              ...sl,
                              songs: selected.map(s => ({
                                id: s.value,
                                name: s.label,
                                duration: songDurationMap.get(s.value) ?? 0
                              }))

                            }
                          : sl
                      )
                    )
                  }}
                />

                {setlist.songs.length > 0 && (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => {
                      const { active, over } = event
                      if (!over || active.id === over.id) return

                      setSetLists(prev =>
                        prev.map(sl => {
                          if (sl.id !== setlist.id) return sl

                          const oldIndex = sl.songs.findIndex(s => s.id === active.id)
                          const newIndex = sl.songs.findIndex(s => s.id === over.id)

                          const updated = [...sl.songs]
                          const [moved] = updated.splice(oldIndex, 1)
                          updated.splice(newIndex, 0, moved)

                          return { ...sl, songs: updated }
                        })
                      )
                    }}
                    autoScroll={false}
                  >
                    <SortableContext
                      items={setlist.songs.map(s => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <ul className="sortable-song-list">
                        {setlist.songs.map(song => (
                          <SortableSongItem
                            key={song.id}
                            song={song}
                            onRemove={() =>
                              setSetLists(prev =>
                                prev.map(sl =>
                                  sl.id === setlist.id
                                    ? {
                                        ...sl,
                                        songs: sl.songs.filter(s => s.id !== song.id)
                                      }
                                    : sl
                                )
                              )
                            }
                          />
                        ))}
                      </ul>
                    </SortableContext>
                  </DndContext>
                )}

            </div>
          ))}
        </div>

        <div className="card" style={{ marginTop: 18 }}>
          <h3>Présences</h3>

          <ul className="musicians-list columns">
            {allMusicians.map(musician => {
              const present = presences[musician.id] ?? false
              const state = presences[musician.id]
              return (
                <li
                  key={musician.id}
                  onClick={() => togglePresence(musician.id)}
                  style={{
                    cursor: 'pointer',
                    padding: 8,
                    borderRadius: 6,
                    background:
                      state === true
                        ? '#dcfce7'   // ✅ présent
                        : state === false
                        ? '#fee2e2'   // ❌ absent
                        : '#e5e7eb'   // ⏳ sans réponse
                  }}
                >
                  {state === true && '✅ '}
                  {state === false && '❌ '}
                  {state === undefined && '⏳ '}
                  {musician.name}
                  <span style={{ marginLeft: 8, color: '#64748b' }}>
                    ({musician.instrument})
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        <button className="button" type="submit" disabled={loading}>
          {loading ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer l’événement'}
        </button>
      </form>
    </div>
  )
}

export default EventFormPage
