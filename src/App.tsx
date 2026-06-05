import { Route, Routes, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import AgendaPage from './pages/AgendaPage'
import EventDetailPage from './pages/EventDetailPage'
import EventFormPage from './pages/EventFormPage'
import { useSupabaseSession } from './hooks/useSupabaseSession'
import '../src/App.css'

function App() {
  const { session, loading } = useSupabaseSession()

  if (loading) {
    return <div className="app-shell">Chargement...</div>
  }

  return (
    <div className="app-shell">
      { <header className="app-header">
        <h1>Écaille</h1>
      </header>}

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/agenda"
          element={session ? <AgendaPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/events/new"
          element={session ? <EventFormPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/events/:id/edit"
          element={session ? <EventFormPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/events/:id"
          element={session ? <EventDetailPage /> : <Navigate to="/login" replace />}
        />
        <Route path="/" element={<Navigate to={session ? '/agenda' : '/login'} replace />} />
      </Routes>
    </div>
  )
}

export default App
