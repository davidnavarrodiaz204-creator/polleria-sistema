import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ usuario: '', password: '' })
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setCargando(true)
    try {
      const u = await login(form.usuario, form.password)
      navigate(u.rol === 'cocina' ? '/cocina' : '/')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión')
    } finally { setCargando(false) }
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">🍗</div>
        <h1 className="login-title">PollerOS</h1>
        <p className="login-sub">Sistema de Restaurante</p>
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}
          <div className="form-group">
            <label className="form-label">Usuario</label>
            <input className="form-input" type="text" placeholder="admin" value={form.usuario}
              onChange={e => setForm(f => ({...f, usuario: e.target.value}))} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input className="form-input" type="password" placeholder="••••••••" value={form.password}
              onChange={e => setForm(f => ({...f, password: e.target.value}))} required />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={cargando} style={{marginTop:8}}>
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

      </div>
    </div>
  )
}
