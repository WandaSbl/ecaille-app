import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage('')

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setMessage(error.message)
      } else {
        setMessage('Vérifie ton email pour confirmer ton compte.')
      }
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage(error.message)
      return
    }

    navigate('/agenda')
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src="/logo.png" alt="Velcros Brass Band" className="login-logo" />
          <h1>Écaille</h1>
          <p className="login-subtitle">Gestion de groupe musical</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              required
              placeholder="ton@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password" className="form-label">Mot de passe</label>
            <input
              id="password"
              className="input"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="button button-login" type="submit">
            {mode === 'login' ? 'Se connecter' : 'Créer un compte'}
          </button>
        </form>

        {message ? (
          <div className={`login-message ${message.includes('Vérifie') || message.includes('succès') ? 'login-message--success' : 'login-message--error'}`}>
            {message}
          </div>
        ) : null}

        <div className="login-toggle">
          <button
            className="login-toggle-btn"
            type="button"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login' ? "Je n'ai pas de compte" : `J'ai déjà un compte`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
