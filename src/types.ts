export type EventType = {
  id: number
  name: string
  description: string | null
}

export type EventStatus = {
  id: number
  name: string
  color: string | null
}

export type Musician = {
  id: number
  name: string
  instrument: string | null
}

export type Song = {
  id: number
  name: string
  duration: number | null
}

export type EventSong = {
  id: number
  event_id: number
  song_id: number
  setlist: string | null
  position: number | null
  song?: Song
}

export type EventMusician = {
  id: number
  event_id: number
  musician_id: number
  is_present: boolean | null
  musician?: Musician
}

export type Event = {
  id: number
  event_type_id: number
  title: string
  date_from: string
  date_to: string | null
  location: string | null
  event_status_id: number | null
  dresscode: string | null
  comment: string | null
  created_at: string | null
  event_type?: EventType
  event_status?: EventStatus
  event_musicians?: EventMusician[]
  event_songs?: EventSong[]
}
