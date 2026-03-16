import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import './Notificaciones.css'

export default function Notificaciones() {
  const auth = useAuth()
  if (!auth?.usuario) return null
  return <NotificacionesInner />
}

function NotificacionesInner() {
  const app = useApp()
  if (!app) return null
  const { notificaciones, cerrarNotif } = app
  if (!notificaciones?.length) return null
  const iconos = { info: '🔔', success: '✅', warning: '⚠️', danger: '❌' }
  return (
    <div className="notif-panel no-print">
      {notificaciones.map(n => (
        <div key={n.id} className={`notif-toast notif-${n.tipo || 'info'}`}>
          <span className="notif-icon">{iconos[n.tipo] || '🔔'}</span>
          <div className="notif-body">
            <div className="notif-title">{n.titulo}</div>
            {n.mensaje && <div className="notif-msg">{n.mensaje}</div>}
          </div>
          <button className="notif-close" onClick={() => cerrarNotif(n.id)}>✕</button>
        </div>
      ))}
    </div>
  )
}
