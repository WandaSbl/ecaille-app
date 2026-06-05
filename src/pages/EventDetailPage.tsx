import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Event } from '../types'

function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

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
            <div>
              <h2>{event.title}</h2>
              <p>{event.event_type?.name ?? 'Événement'}</p>
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
            <h3>Setlist / Planning</h3>
            {event.event_songs?.length ? (
              <ol>
                {event.event_songs.map((eventSong) => (
                  <li key={eventSong.id}>
                    {eventSong.song?.name ?? eventSong.setlist ?? 'Morceau inconnu'}
                  </li>
                ))}
              </ol>
            ) : (
              <p>Pas de setlist enregistrée.</p>
            )}
          </div>

          <div className="card" style={{ marginTop: 18 }}>
            <h3>Musiciens</h3>

            {event.EVENT_MUSICIANS?.length ? (
              <>
                <h4>✅ Présents</h4>
                <ul>
                  {event.EVENT_MUSICIANS
                    .filter((item) => item.is_present)
                    .map((item) => (
                      <li key={item.id}>
                        {item.MUSICIANS?.name}
                      </li>
                    ))}
                </ul>

                <h4>❌ Absents</h4>
                <ul>
                  {event.EVENT_MUSICIANS
                    .filter((item) => item.is_present === false)
                    .map((item) => (
                      <li key={item.id}>
                        {item.MUSICIANS?.name}
                      </li>
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
