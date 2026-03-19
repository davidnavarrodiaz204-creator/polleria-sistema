import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import api from '../utils/api'

const COLORES = [
  { nombre: 'Amarillo', hex: '#F5C518', texto: '#212121' },
  { nombre: 'Naranja', hex: '#FF6B35', texto: '#FFFFFF' },
  { nombre: 'Rojo', hex: '#E53935', texto: '#FFFFFF' },
  { nombre: 'Verde', hex: '#43A047', texto: '#FFFFFF' },
  { nombre: 'Azul', hex: '#1E88E5', texto: '#FFFFFF' },
  { nombre: 'Morado', hex: '#8E24AA', texto: '#FFFFFF' },
  { nombre: 'Café', hex: '#6D4C41', texto: '#FFFFFF' },
]

export default function Configuracion() {
  const { config, guardarConfig } = useApp()
  const [form, setForm] = useState({ ...config })
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk] = useState(false)
  const [tab, setTab] = useState('negocio')

  // Backups
  const [backups, setBackups] = useState([])
  const [creandoBk, setCreandoBk] = useState(false)
  const [msgBk, setMsgBk] = useState('')

  useEffect(() => {
    if (tab === 'backup') cargarBackups()
  }, [tab])

  const cargarBackups = () => {
    api.get('/backup').then(r => setBackups(r.data)).catch(() => { })
  }

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      await guardarConfig(form)
      localStorage.setItem('restaurantNombre', form.nombre || 'PollerOS')
      setOk(true)
      setTimeout(() => setOk(false), 3000)
    } catch { alert('Error al guardar') }
    finally { setGuardando(false) }
  }

  // Descarga real usando fetch + blob (evita bloqueo del navegador)
  const descargarDirecto = async () => {
    const token = localStorage.getItem('token')
    const baseUrl = import.meta.env.VITE_API_URL || ''
    const response = await fetch(`${baseUrl}/api/backup/descargar`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Error al descargar')
    }
    const blob = await response.blob()
    const fecha = new Date().toISOString().split('T')[0]
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `polleria-backup-${fecha}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const crearBackup = async () => {
    setCreandoBk(true); setMsgBk('')
    try {
      const { data } = await api.post('/backup/crear', { tipo: 'manual' })
      setMsgBk('Descargando backup...')
      await descargarDirecto()
      setMsgBk(`✅ Backup descargado: ${data.tamaño} registros`)
    } catch (err) {
      setMsgBk('Error: ' + (err.response?.data?.error || err.message))
    } finally { setCreandoBk(false) }
  }

  const descargarBackup = async () => {
    try {
      setMsgBk('Descargando...')
      await descargarDirecto()
      setMsgBk('✅ Backup descargado correctamente')
    } catch (err) {
      setMsgBk('Error: ' + err.message)
    }
  }
  const eliminarBackup = async (id) => {
    if (!confirm('¿Eliminar este backup?')) return
    await api.delete('/backup/' + id)
    cargarBackups()
  }

  const TABS = [
    { k: 'negocio', l: 'Negocio' },
    { k: 'apariencia', l: 'Apariencia' },
    { k: 'modulos', l: 'Módulos' },
    { k: 'backup', l: 'Backups' },
    { k: 'apis', l: 'APIs' },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">Configuración</div><div className="page-sub">Personaliza tu sistema</div></div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--gray-100)', borderRadius: 'var(--radius)', padding: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: 13,
            background: tab === t.k ? 'white' : 'transparent',
            boxShadow: tab === t.k ? 'var(--shadow-sm)' : 'none',
          }}>{t.l}</button>
        ))}
      </div>

      <form onSubmit={guardar}>

        {/* NEGOCIO */}
        {tab === 'negocio' && (
          <div className="card" style={{ maxWidth: 560 }}>
            <div className="card-title">Datos del negocio</div>
            <div className="form-group"><label className="form-label">Nombre del restaurante</label>
              <input className="form-input" value={form.nombre || ''} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Slogan</label>
              <input className="form-input" value={form.slogan || ''} onChange={e => setForm({ ...form, slogan: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Emoji / Ícono</label>
              <input className="form-input" value={form.logo || ''} maxLength={4} onChange={e => setForm({ ...form, logo: e.target.value })} /></div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">RUC</label>
                <input className="form-input" value={form.ruc || ''} placeholder="20123456789" onChange={e => setForm({ ...form, ruc: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Teléfono</label>
                <input className="form-input" value={form.telefono || ''} onChange={e => setForm({ ...form, telefono: e.target.value })} /></div>
            </div>
            <div className="form-group"><label className="form-label">Dirección</label>
              <input className="form-input" value={form.direccion || ''} onChange={e => setForm({ ...form, direccion: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          </div>
        )}

        {/* APARIENCIA */}
        {tab === 'apariencia' && (
          <div className="card" style={{ maxWidth: 560 }}>
            <div className="card-title">Color principal</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
              {COLORES.map(c => (
                <div key={c.hex}
                  onClick={() => setForm({ ...form, colorPrimario: c.hex, colorTexto: c.texto })}
                  title={c.nombre}
                  style={{
                    width: 42, height: 42, borderRadius: 10, background: c.hex, cursor: 'pointer',
                    border: form.colorPrimario === c.hex ? '3px solid #212121' : '3px solid transparent',
                    transform: form.colorPrimario === c.hex ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.15s', boxShadow: 'var(--shadow-sm)'
                  }} />
              ))}
            </div>
            <div style={{
              borderRadius: 12, padding: '14px 20px', marginBottom: 12,
              background: form.colorPrimario || '#F5C518'
            }}>
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800,
                color: form.colorTexto || '#212121'
              }}>
                {form.logo || '🍗'} {form.nombre || 'Mi Pollería'}
              </span>
            </div>
          </div>
        )}

        {/* MÓDULOS */}
        {tab === 'modulos' && (
          <div className="card" style={{ maxWidth: 400 }}>
            <div className="card-title">Módulos activos</div>
            {[
              ['mesas', '🪑 Mesas y salón'],
              ['cocina', '👨‍🍳 Pantalla cocina'],
              ['delivery', '🛵 Delivery'],
              ['bebidas', '🥤 Bebidas en menú'],
              ['caja', '💵 Caja y cobros'],
              ['reservas', '📅 Reservas'],
            ].map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer', fontSize: 14 }}>
                <input type="checkbox"
                  checked={form.modulos?.[key] ?? true}
                  onChange={e => setForm({ ...form, modulos: { ...form.modulos, [key]: e.target.checked } })} />
                {label}
              </label>
            ))}
          </div>
        )}

        {/* Botón guardar para tabs con formulario */}
        {['negocio', 'apariencia', 'modulos'].includes(tab) && (
          <div style={{ marginTop: 16 }}>
            {ok && <div style={{ background: '#E8F5E9', color: 'var(--success)', border: '1px solid #C8E6C9', borderRadius: 'var(--radius-sm)', padding: '10px 16px', marginBottom: 12, fontWeight: 600 }}>
              Configuración guardada correctamente
            </div>}
            <button type="submit" className="btn btn-primary" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        )}
      </form>

      {/* BACKUPS */}
      {tab === 'backup' && (
        <div>
          <div className="card" style={{ maxWidth: 600, marginBottom: 16 }}>
            <div className="card-title">Backup manual</div>
            <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 14, lineHeight: 1.7 }}>
              Crea un backup de todos los datos del sistema (pedidos, clientes, menú, etc.)
              guardado en tu misma base de datos MongoDB Atlas. Puedes descargarlo como JSON
              para guardarlo en tu computadora.
            </p>
            <div style={{ background: '#E3F2FD', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
              <strong>Backup automático:</strong> MongoDB Atlas Free ya hace snapshots automáticos
              cada 6 horas. Este botón es adicional para backups manuales bajo demanda.
            </div>
            <button className="btn btn-primary" onClick={crearBackup} disabled={creandoBk}>
              {creandoBk ? 'Descargando...' : '⬇ Crear y Descargar Backup'}
            </button>
            {msgBk && (
              <div style={{
                marginTop: 10, fontSize: 13, fontWeight: 600,
                color: msgBk.startsWith('Error') ? 'var(--danger)' : 'var(--success)'
              }}>
                {msgBk}
              </div>
            )}
          </div>

          <div className="card" style={{ maxWidth: 600 }}>
            <div className="card-title">Historial de backups</div>
            {!backups.length ? (
              <div style={{ color: 'var(--gray-400)', textAlign: 'center', padding: 20 }}>Sin backups aún</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Fecha</th><th>Tipo</th><th>Registros</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {backups.map(b => (
                      <tr key={b._id}>
                        <td style={{ fontSize: 13 }}>{new Date(b.fecha).toLocaleString('es-PE')}</td>
                        <td><span className="badge badge-info">{b.tipo}</span></td>
                        <td style={{ fontWeight: 700 }}>{b.tamaño}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-success btn-sm"
                              onClick={() => descargarBackup()}>
                              Descargar
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => eliminarBackup(b._id)}>
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* APIs */}
      {tab === 'apis' && (
        <div className="card" style={{ maxWidth: 600 }}>
          <div className="card-title">Configuración de APIs externas</div>
          <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 16, lineHeight: 1.7 }}>
            Estas variables se configuran en el servidor (Render → backend → Environment).
            No se pueden cambiar desde aquí por seguridad.
          </p>

          {[
            { key: 'APIS_PERU_TOKEN', label: 'Token DNI/RUC (apis.net.pe)', link: 'https://apis.net.pe', desc: 'Consulta automática de DNI y RUC de SUNAT/RENIEC. Registro gratis.' },
            { key: 'CALLMEBOT_APIKEY', label: 'API Key WhatsApp (CallMeBot)', link: 'https://callmebot.com', desc: 'Envío de mensajes WhatsApp gratis. Agrega +34 644 61 91 29 y envíale "I allow callmebot to send me messages".' },
            { key: 'JWT_SECRET', label: 'JWT Secret (seguridad)', link: null, desc: 'Clave secreta para autenticación. Cámbiala por un texto largo y seguro.' },
            { key: 'MONGODB_URI', label: 'MongoDB URI', link: 'https://mongodb.com/atlas', desc: 'String de conexión a tu base de datos MongoDB Atlas.' },
          ].map((item, i) => (
            <div key={i} style={{ marginBottom: 16, padding: '12px 14px', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <code style={{ fontWeight: 700, fontSize: 13 }}>{item.key}</code>
                {item.link && (
                  <a href={item.link} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, color: 'var(--info)', fontWeight: 600 }}>
                    Registrarse →
                  </a>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)', lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
