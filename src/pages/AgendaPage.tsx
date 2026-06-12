import { useEffect, useMemo, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Event } from '../types'
import { useAdmin } from '../hooks/useAdmin'

const EVENT_COLORS: Record<string, string> = {
  Répétition: '#ed81ef',
  Concert: '#81efaa',
  Atelier: '#ed9c63',
}

const EVENT_BACKGROUND: Record<string, string> = {
  'Répétition': 'linear-gradient(135deg, #ed81ef 0%, #0ea5e9 100%)',
  'Concert': 'linear-gradient(135deg, #81efaa 0%, #0ea5e9 100%)',
  'Atelier': 'linear-gradient(135deg, #ed9c63 0%, #0ea5e9 100%)'
}

const STATUS_COLORS: Record<string, string> = {
  'En attente orga': '#b1a9b8',
  'En attente musiciens': '#b1a9b8',
  'Confirmé': '#007400'
}

function formatDayKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}


function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1)
  const startDay = (first.getDay() + 6) % 7
  const days: Date[] = []
  const startDate = new Date(first)
  startDate.setDate(first.getDate() - startDay)

  for (let i = 0; i < 42; i += 1) {
    const current = new Date(startDate)
    current.setDate(startDate.getDate() + i)
    days.push(current)
  }

  return days
}

function AgendaPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(false)
  const [offline, setOffline] = useState(!navigator.onLine)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState(new Date())
  const navigate = useNavigate()
  const eventsSectionRef = useRef<HTMLDivElement>(null)
  const [attendances, setAttendances] = useState<Record<string, boolean>>({})
  const { isAdmin, loading:adminLoading } = useAdmin()

  useEffect(() => {
    const updateOnlineStatus = () => setOffline(!navigator.onLine)
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  useEffect(() => {
    async function loadEvents() {
      setLoading(true)
      const { data, error } = await supabase
        .from('EVENT')
        .select('*, EVENT_TYPE(name), EVENT_STATUS(name)')
        .order('date_from', { ascending: true })

      if (error) {
        console.error(error)
        const cached = localStorage.getItem('ecaille-events')
        if (cached) {
          setEvents(JSON.parse(cached))
        }
      } else if (data) {
        setEvents(data)
        localStorage.setItem('ecaille-events', JSON.stringify(data))
      }
      setLoading(false)
    }

    loadEvents()

    async function loadAttendances() {
      const musician = await getCurrentMusician()
      if (!musician) return

      const { data } = await supabase
        .from('EVENT_MUSICIANS')
        .select('event_id, is_present')
        .eq('musician_id', musician.id)

      if (!data) return

      const map: Record<string, boolean> = {}
      data.forEach(a => {
        map[a.event_id] = a.is_present
      })

      setAttendances(map)
    }

    loadAttendances()

  }, [])

  const eventMap = useMemo(() => {
    const map: Record<string, Event[]> = {}
    events.forEach((event) => {
      const key = formatDayKey(new Date(event.date_from))
      if (!map[key]) map[key] = []
      map[key].push(event)
    })
    return map
  }, [events])

  const monthDays = useMemo(() => getMonthDays(currentMonth.getFullYear(), currentMonth.getMonth()), [currentMonth])

  const selectedKey = formatDayKey(selectedDate)
  const dayEvents = eventMap[selectedKey] ?? []

  const hasEvents = (date: Date) => {
    const dayKey = formatDayKey(date)
    return eventMap[dayKey]?.length > 0
  }

  const getDotColor = (typeName?: string) => {
    if (!typeName) return '#94a3b8'
    return EVENT_COLORS[typeName] ?? '#94a3b8'
  }

   const getEventColor = (eventName?: string) => {
    if (!eventName) return '#94a3b8'
    return EVENT_BACKGROUND[eventName] ?? '#94a3b8'
  }
  

  const getEventStatusColor = (statusName?: string) => {
    if (!statusName) return '#94a3b8'
    return STATUS_COLORS[statusName] ?? '#94a3b8'
  }

  const handleDayClick = (day: Date) => {
    const dayKey = formatDayKey(day)
    const dayHasEvents = eventMap[dayKey]?.length > 0
    setSelectedDate(day)
    
    if (dayHasEvents) {
      setTimeout(() => {
        eventsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 0)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  async function getCurrentMusician() {
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) return null

    const { data: musician } = await supabase
      .from('MUSICIANS')
      .select('id')
      .eq('user_id', userData.user.id)
      .single()

    return musician
  }

  
  function getNextState(current?: boolean) {
    if (current === undefined) return true   // 1er clic → présent
    return !current                          // ensuite toggle
  }

  async function togglePresence(eventId: string, nextState: boolean) {
    const musician = await getCurrentMusician()
    if (!musician) return

    const { error } = await supabase
      .from('EVENT_MUSICIANS')
      .upsert(
        {
          event_id: eventId,
          musician_id: musician.id,
          is_present: nextState
        },
        {
          onConflict: 'event_id,musician_id'
        }
      )

    if (error) console.error(error)
  }


  return (
    <div>
      {offline && (
        <div className="offline-banner">
          Tu es hors connexion. L’agenda affiche les dernières données disponibles.
        </div>
      )}

      <div className="list-header">
        <div>
          <h2>Agenda général</h2>
        </div>
        <div>
          {!adminLoading && isAdmin && (<button className="button button-primary" onClick={() => navigate('/events/new')}>
            Ajouter un événement
          </button>)}
          
          {!adminLoading && isAdmin && (
            <button
              className="button button-secondary"
              onClick={() => navigate('/admin')}
            >
              Administration
            </button>
          )}

          <button className="button button-secondary" onClick={handleLogout}>
            Se déconnecter
          </button>
        </div>
      </div>

      <div className="calendar-panel">
        <div className="calendar-header">
          <button className="calendar-nav" type="button" onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>
            ‹
          </button>
          <div className="calendar-title">
            {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </div>
          <button className="calendar-nav" type="button" onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>
            ›
          </button>
        </div>
        <div className="calendar-grid">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((label) => (
            <div key={label} className="calendar-weekday">
              {label}
            </div>
          ))}
          {monthDays.map((day) => {
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
            const isToday = formatDayKey(day) === formatDayKey(new Date())
            const isSelected = formatDayKey(day) === selectedKey
            const eventsForDay = eventMap[formatDayKey(day)] ?? []
            return (
              <button
                key={day.toISOString()}
                type="button"
                className={`calendar-day ${isCurrentMonth ? '' : 'calendar-day--muted'} ${isSelected ? 'calendar-day--selected' : ''} ${hasEvents(day) ? 'calendar-day--clickable' : ''}`}
                onClick={() => handleDayClick(day)}
              >
                <span className="calendar-day-number">{day.getDate()}</span>
                {isToday ? <span className="calendar-day-today"></span> : null}
                <div className="calendar-dots">
                  {eventsForDay.slice(0, 3).map((event) => (
                    <span key={event.id} className="calendar-dot" style={{ backgroundColor: getDotColor(event.EVENT_TYPE?.name) }} />
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        <div className="calendar-legend">
          <div className="legend-item">
            <span className="legend-chip" style={{ backgroundColor: EVENT_COLORS['Répétition'] }} />
            Répète
          </div>
          <div className="legend-item">
            <span className="legend-chip" style={{ backgroundColor: EVENT_COLORS['Concert'] }} />
            Concert
          </div>
          <div className="legend-item">
            <span className="legend-chip" style={{ backgroundColor: EVENT_COLORS['Atelier'] }} />
            Atelier
          </div>
        </div>
      </div>

      <div className="day-summary" ref={eventsSectionRef}>
        <div className="day-summary-title">
          <h3>{selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
          <span>{dayEvents.length} événement{dayEvents.length > 1 ? 's' : ''}</span>
        </div>
        {dayEvents.length === 0 ? (
          <div className="card card-muted">Aucun événement pour cette journée.</div>
        ) : null}
      </div>

      {loading ? (
        <div className="card">Chargement des événements...</div>
      ) : (
        <div className="grid event-tile-grid">
          {(dayEvents.length > 0 ? dayEvents : events).map((event) => (
            <Link key={event.id} to={`/events/${event.id}`} className="event-card" style={{borderLeft : `6px solid ${getEventStatusColor(event.EVENT_STATUS?.name)}`} }>
              <div className="event-card-header">
                <div>
                  <span className="event-type" style={{ background: getEventColor(event.EVENT_TYPE?.name) }}>
                    {event.EVENT_TYPE?.name ?? 'Évènement'}
                  </span>
                </div>
                {/*{event.EVENT_STATUS?.name ? (
                  <span className="event-badge" style={{ backgroundColor: event.EVENT_STATUS?.color ?? '#64748b' }}>
                    {event.EVENT_STATUS.name}
                  </span>
                ) : null}*/}
              </div>
              <h3>{event.title}</h3>
              <p className="event-meta">
                {new Date(event.date_from).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                {event.location ? ` · ${event.location}` : ''}
              </p>
              <p className="event-card-note">{event.comment ?? 'Pas de commentaire.'}</p>

              <button
                className={`presence-toggle 
                  ${attendances[event.id] === true ? 'present' : ''} 
                  ${attendances[event.id] === false ? 'absent' : ''}`}
                onClick={(e) => {
                  e.preventDefault()

                  const current = attendances[event.id]
                  const next = getNextState(current)

                  togglePresence(event.id, next)

                  setAttendances(prev => ({
                    ...prev,
                    [event.id]: next
                  }))
                }}
              >
                {attendances[event.id] === undefined && '⬜ Répondre'}
                {attendances[event.id] === true && '✅ Présent'}
                {attendances[event.id] === false && '❌ Absent'}
              </button>

            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default AgendaPage
