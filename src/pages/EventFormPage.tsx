import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Event, EventType, EventStatus } from '../types'

function EventFormPage() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<Partial<Event>>({})
  const [types, setTypes] = useState<EventType[]>([])
  const [statuses, setStatuses] = useState<EventStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const isEdit = Boolean(id)

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

  useEffect(() => {
    if (!id) return

    async function loadCurrent() {
      setLoading(true)
      const { data, error } = await supabase.from<Event>('EVENT').select('*').eq('id', Number(id)).single()
      if (data) setEvent(data)
      if (error) console.error(error)
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
      const { error } = await supabase.from('EVENT').update(payload).eq('id', Number(id))
      if (error) {
        console.error(error)
        setError(`Échec mise à jour : ${error.message}`)
      } else {
        navigate(`/events/${id}`)
      }
    } else {
      const { data, error } = await supabase.from('EVENT').insert(payload).select('id').single()
      if (error) {
        console.error(error)
        setError(`Échec création : ${error.message}`)
      } else if (data?.id) {
        navigate(`/events/${data.id}`)
      }
    }

    setLoading(false)
  }

  return (
    <div className="card">
      <button className="button" type="button" onClick={() => navigate('/agenda')} style={{ marginBottom: 16 }}>
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
          value={event.date_from ?? ''}
          onChange={(e) => handleChange('date_from', e.target.value)}
          required
        />
        <input
          className="input"
          type="datetime-local"
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
        <button className="button" type="submit" disabled={loading}>
          {loading ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer l’événement'}
        </button>
      </form>
    </div>
  )
}

export default EventFormPage
