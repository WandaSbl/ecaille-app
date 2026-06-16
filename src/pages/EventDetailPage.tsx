import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Event } from '../types'

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function getSetListDuration(songs: { duration: number }[]): number {
  return songs.reduce((total, song) => total + (song.duration ?? 0), 0)
}

function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function loadAdminStatus() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) return

      const { data, error } = await supabase
        .from('MUSICIANS')
        .select('is_admin')
        .eq('user_id', userData.user.id)
        .single()

      if (!error && data?.is_admin) {
        setIsAdmin(true)
      }
    }

    loadAdminStatus()
  }, [])

  useEffect(() => {
    async function loadEvent() {
      if (!id) return
      setLoading(true)
      const { data, error } = await supabase
        .from('EVENT')
        .select(
          '*, EVENT_TYPE(name), EVENT_STATUS(name), EVENT_MUSICIANS(*, MUSICIANS(*)), EVENT_SONGS(*, SONGS(*))'
        )
        .eq('id', Number(id))
        .single()

      if (error) {
        console.error(error)
      } else {
        setEvent(data)
      }
      setLoading(false)
    }

    loadEvent()
  }, [id])

  const togglePresence = async (musicianId: number) => {
    if (!event?.event_musicians) return
    const record = event.event_musicians.find((item) => item.musician_id === musicianId)
    if (!record) return

    const updated = await supabase
      .from('EVENT_MUSICIANS')
      .update({ is_present: !record.is_present })
      .eq('id', record.id)

    if (updated.error) {
      console.error(updated.error)
      return
    }

    setEvent((current) => {
      if (!current) return current
      return {
        ...current,
        event_musicians: current.event_musicians?.map((item) =>
          item.id === record.id ? { ...item, is_present: !record.is_present } : item,
        )
      }
    })
  }

  const groupedSetLists = event?.event_songs? Object.values(
      event.event_songs.reduce((acc, item) => {
        const key = item.setlist ?? 'A'
        if (!acc[key]) acc[key] = []

        acc[key].push(item)
        return acc
      }, {} as Record<string, any[]>)
    )
  : []

  const sortedSetLists = groupedSetLists.sort(
    (a, b) => a[0].setlist.localeCompare(b[0].setlist)
  )

  return (
    <div>
      <button className="button" type="button" onClick={() => navigate('/agenda')} style={{ marginBottom: 16 }}>
        Retour à l’agenda
      </button>
      {loading ? (
        <div className="card">Chargement du détail...</div>
      ) : event ? (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                  alignItems: 'flex-start'
                }}
              >
              <div>
                <h2>{event.title}</h2>
                <p>{event.event_type?.name ?? 'Événement'}</p>
              </div>

              <div style={{ textAlign: 'right', display: 'flex', gap: 8 }}>
                {event.event_status?.name && (
                  <span className="event-label">{event.event_status.name}</span>
                )}

                {isAdmin && (
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => navigate(`/events/${event.id}/edit`)}
                  >
                    Modifier
                  </button>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {event.event_status?.name && <span className="event-label">{event.event_status.name}</span>}
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
            <p><strong>Lieu :</strong> {event.location ?? 'À définir'}</p>
            <p>
              <strong>Date :</strong>{' '}
              {new Date(event.date_from).toLocaleDateString('fr-FR')} à{' '}
              {new Date(event.date_from).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            {event.date_to ? (
              <p>
                <strong>Fin :</strong>{' '}
                {new Date(event.date_to).toLocaleDateString('fr-FR')} à{' '}
                {new Date(event.date_to).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            ) : null}
            {event.dresscode ? <p><strong>Dresscode :</strong> {event.dresscode}</p> : null}
            {event.comment ? <p><strong>Commentaire :</strong> {event.comment}</p> : null}
          </div>
            <div className="card" style={{ marginTop: 18 }}>
            <h3>Setlists</h3>
            <div className="setlists-grid">
              {sortedSetLists.length > 0 ? (
                  sortedSetLists.map((setlistSongs) => {
                    const setlistName = setlistSongs[0].setlist
                    const orderedSongs = [...setlistSongs].sort(
                      (a, b) => a.position - b.position
                    )

                    const duration = getSetListDuration(
                      orderedSongs.map(s => s.SONGS)
                    )

                    return (
                      <div key={setlistName} style={{ marginBottom: 16 }}>
                        <h4>
                          Setlist {setlistName}
                          <span className="setlist-duration">
                            {formatDuration(duration)}
                          </span>
                        </h4>

                        <ol>
                          {orderedSongs.map((item) => (
                            <li key={item.id}>
                              {item.SONGS?.name}
                              {item.SONGS?.duration && (
                                <span style={{ marginLeft: 8, color: '#64748b', fontSize: 13 }}>
                                  ({formatDuration(item.SONGS.duration)})
                                </span>
                              )}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )
                  })
                ) : (
                  <p>Pas de setlist enregistrée.</p>
                )}
            </div>
          </div>

        <div className="card" style={{ marginTop: 18 }}>
            <h3>Musiciens</h3>

            {event.event_musicians?.length ? (
              <>
              <h4>✅ Présents</h4>
              <ul className="musicians-list columns">
                {event.event_musicians
                  .filter(item => item.is_present)
                  .map(item => (
                    <li key={item.id}>{item.musician?.name}</li>
                  ))}
              </ul>

              <h4>❌ Absents</h4>
              <ul className="musicians-list columns">
                {event.event_musicians
                  .filter(item => item.is_present === false)
                  .map(item => (
                    <li key={item.id}>{item.musician?.name}</li>
                  ))}
              </ul>
              </>
            ) : (
              <p>Pas de réponses pour cet événement.</p>
            )}
          </div>

      </div>
    ) : (
      <div className="card">Événement introuvable.</div>
    )}
  </div>
  )
}

export default EventDetailPage
