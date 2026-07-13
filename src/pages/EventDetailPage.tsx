import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Event } from '../types'
import { Printer } from 'lucide-react'

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

  async function handleDuplicate() {
    if (!event) return

    const { data: newEvent, error } = await supabase
      .from('EVENT')
      .insert({
        title: event.title + ' (copie)',
        event_type_id: event.event_type_id,
        event_status_id: event.event_status_id,
        date_from: event.date_from,
        date_to: event.date_to,
        location: event.location,
        dresscode: event.dresscode,
        comment: event.comment
      })
      .select('id')
      .single()

    if (error) {
      console.error(error)
      return
    }

    const newEventId = newEvent.id

    if (event.event_songs) {
      const rows = event.event_songs.map((item: any) => ({
        event_id: newEventId,
        song_id: item.song_id,
        setlist: item.setlist,
        position: item.position
      }))

      await supabase.from('EVENT_SONGS').insert(rows)
    }

    if (event.event_musicians) {
      const rows = event.event_musicians.map((item: any) => ({
        event_id: newEventId,
        musician_id: item.musician_id,
        is_present: item.is_present
      }))

      await supabase.from('EVENT_MUSICIANS').insert(rows)
    }

    navigate(`/events/${newEventId}/edit`)
  }

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
          '*, event_type:EVENT_TYPE(name), event_status:EVENT_STATUS(name), event_musicians:EVENT_MUSICIANS(*, musicians:MUSICIANS(*)), event_songs:EVENT_SONGS(*, songs:SONGS(*))'
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

  function printSetlists() {
    if (!sortedSetLists.length) return

    const html = `
      <html>
        <head>
          <title>Setlists ${event?.title}</title>

          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }

            .setlist {
              page-break-after: always;
            }

            .setlist:last-child {
              page-break-after: auto;
            }

            h1 {
              font-size: 28px;
              margin-bottom: 8px;
            }

            h2 {
              margin-bottom: 20px;
            }

            li {
              font-size: 40px;
              margin-bottom: 8px;
            }
          </style>
        </head>

        <body>
          ${sortedSetLists
            .map((setlistSongs) => {
              const setlistName = setlistSongs[0].setlist

              const orderedSongs = [...setlistSongs].sort(
                (a, b) => a.position - b.position
              )

              return `
                <div class="setlist">
                  <h1>${event?.title ?? ''}</h1>
                  <h2>Setlist ${setlistName}</h2>

                  <ol>
                    ${orderedSongs
                      .map(
                        (song) =>
                          `<li>${song.songs?.name ?? song.SONGS?.name ?? ''}</li>`
                      )
                      .join('')}
                  </ol>
                </div>
              `
            })
            .join('')}
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')

    if (!printWindow) return

    printWindow.document.write(html)
    printWindow.document.close()

    printWindow.focus()
    printWindow.print()
  }

  return (
    <div>
      <button className="button" type="button" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
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
                {isAdmin && (
                  <div>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => navigate(`/events/${event.id}/edit`)}>
                      Modifier
                    </button>
                    <button
                      className="button button-secondary"
                      onClick={() => handleDuplicate()}>
                      Dupliquer
                    </button>
                  </div>
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
            <div className="setlists-header">
              <h3>Setlists</h3>
              <button
                type="button"
                className="icon-button"
                onClick={printSetlists}
                title="Imprimer les setlists"
              >
                <Printer size={20} />
              </button>
            </div>
            <div className="setlists-grid">
              {sortedSetLists.length > 0 ? (
                  sortedSetLists.map((setlistSongs) => {
                    const setlistName = setlistSongs[0].setlist
                    const orderedSongs = [...setlistSongs].sort(
                      (a, b) => a.position - b.position
                    )

                    const duration = getSetListDuration(
                      orderedSongs.map(s => s.songs)
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
                              {item.songs?.name}
                              {item.songs?.duration && (
                                <span style={{ marginLeft: 8, color: '#64748b', fontSize: 13 }}>
                                  ({formatDuration(item.songs?.duration)})
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
                    <li key={item.id}>{item.musicians?.name}</li>
                  ))}
              </ul>

              <h4>❌ Absents</h4>
              <ul className="musicians-list columns">
                {event.event_musicians
                  .filter(item => item.is_present === false)
                  .map(item => (
                    <li key={item.id}>{item.musicians?.name}</li>
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
