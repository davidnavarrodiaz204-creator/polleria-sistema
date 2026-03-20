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
  const [estadoNubefact, setEstadoNubefact] = useState(null)

  useEffect(() => {
    if (tab === 'sunat') {
      api.get('/facturacion/estado').then(r => setEstadoNubefact(r.data)).catch(() => {})
    }
  }, [tab])
  const [creandoBk, setCreandoBk] = useState(false)
  const [msgBk, setMsgBk] = useState('')

  useEffect(() => {
    if (tab === 'backup') cargarBackups()
  }, [tab])

  const cargarBackups = () => {
    api.get('/backup').then(r => setBackups(r.data)).catch(() => {})
  }

  // Descarga real con fetch+blob (evita bloqueo del navegador)
  const descargarDirecto = async (formato = 'json') => {
    const token = localStorage.getItem('token')
    const baseUrl = import.meta.env.VITE_API_URL || ''
    const response = await fetch(`${baseUrl}/api/backup/descargar?formato=${formato}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error || 'Error al descargar')
    }
    const blob = await response.blob()
    const fecha = new Date().toISOString().split('T')[0]
    const ext = formato === 'excel' ? 'xlsx' : 'json'
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `polleria-backup-${fecha}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
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

  const crearBackup = async () => {
    setCreandoBk(true); setMsgBk('')
    try {
      const { data } = await api.post('/backup/crear', { tipo: 'manual' })
      setMsgBk('Descargando JSON...')
      await descargarDirecto('json')
      setMsgBk(`✅ Backup creado y descargado: ${data.tamaño} registros`)
      cargarBackups()
    } catch (err) {
      setMsgBk('Error: ' + (err.response?.data?.error || err.message))
    } finally { setCreandoBk(false) }
  }

  const descargarBackup = async (formato = 'json') => {
    try {
      setMsgBk(`Descargando ${formato === 'excel' ? 'Excel' : 'JSON'}...`)
      await descargarDirecto(formato)
      setMsgBk(`✅ Backup ${formato === 'excel' ? 'Excel' : 'JSON'} descargado`)
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
    { k: 'negocio',    l: 'Negocio' },
    { k: 'apariencia', l: 'Apariencia' },
    { k: 'modulos',    l: 'Módulos' },
    { k: 'sunat',      l: '🧾 SUNAT' },
    { k: 'backup',     l: 'Backups' },
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

            {/* WhatsApp CallMeBot */}
            <div style={{borderTop:'1px solid var(--gray-200)',marginTop:16,paddingTop:16}}>
              <div className="card-title" style={{marginBottom:12}}>💬 WhatsApp (CallMeBot)</div>
              <div style={{fontSize:13,color:'var(--gray-500)',marginBottom:14,lineHeight:1.7}}>
                Configura aquí tu número y API key para enviar mensajes de WhatsApp a tus clientes.
                Si ya tienes <code>CALLMEBOT_APIKEY</code> en Railway, tiene prioridad sobre este campo.
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Tu número WhatsApp</label>
                  <input className="form-input"
                    value={form.whatsapp?.numero || ''}
                    onChange={e => setForm({...form, whatsapp:{...form.whatsapp, numero:e.target.value}})}
                    placeholder="51987654321" maxLength={15}/>
                  <div style={{fontSize:11,color:'var(--gray-400)',marginTop:4}}>Con código de país: 51 + número</div>
                </div>
                <div className="form-group">
                  <label className="form-label">CallMeBot API Key</label>
                  <input className="form-input"
                    value={form.whatsapp?.apikey || ''}
                    onChange={e => setForm({...form, whatsapp:{...form.whatsapp, apikey:e.target.value}})}
                    placeholder="123456" type="password"/>
                  <div style={{fontSize:11,color:'var(--gray-400)',marginTop:4}}>
                    <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noreferrer" style={{color:'var(--info)'}}>
                      ¿Cómo obtener tu API key? →
                    </a>
                  </div>
                </div>
              </div>
              <div style={{fontSize:12,color:'var(--gray-500)',background:'var(--gray-50)',padding:'8px 12px',borderRadius:'var(--radius-sm)'}}>
                <strong>Pasos para activar:</strong> 1) Guarda +34 644 61 91 29 en WhatsApp
                2) Envíale: <code>I allow callmebot to send me messages</code>
                3) Recibirás tu API key por WhatsApp — pégala arriba
              </div>
            </div>

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
      {/* ── TAB SUNAT / FACTURACIÓN ELECTRÓNICA ── */}
      {tab === 'sunat' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,maxWidth:800}}>

          {/* Estado actual */}
          <div className="card">
            <div className="card-title">Estado de Facturación Electrónica</div>
            {estadoNubefact ? (
              <>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
                  <div style={{width:12,height:12,borderRadius:'50%',background:estadoNubefact.configurado?'var(--success)':'var(--gray-300)'}}/>
                  <span style={{fontWeight:700,color:estadoNubefact.configurado?'var(--success)':'var(--gray-500)'}}>
                    {estadoNubefact.configurado ? 'Nubefact Activo' : 'No configurado'}
                  </span>
                </div>
                {estadoNubefact.configurado && (
                  <div style={{background:estadoNubefact.modoActual==='produccion'?'#E8F5E9':'#FFF8E1',borderRadius:'var(--radius-sm)',padding:'10px 14px',fontSize:13,marginBottom:12}}>
                    <strong>Modo:</strong> {estadoNubefact.modoActual === 'produccion' ? '✅ PRODUCCIÓN — Comprobantes reales SUNAT' : '⚠️ DEMO — Sin valor legal (pruebas)'}
                  </div>
                )}
                <div style={{fontSize:13,color:'var(--gray-600)',lineHeight:1.8}}>
                  {estadoNubefact.mensaje}
                </div>
              </>
            ) : (
              <div style={{color:'var(--gray-400)',fontSize:13}}>Cargando estado...</div>
            )}
          </div>

          {/* Instrucciones de configuración */}
          <div className="card">
            <div className="card-title">Cómo activar</div>
            <div style={{fontSize:13,lineHeight:1.9,color:'var(--gray-700)'}}>
              <div><strong>1.</strong> Regístrate en <a href="https://nubefact.com" target="_blank" rel="noreferrer" style={{color:'var(--info)'}}>nubefact.com</a></div>
              <div><strong>2.</strong> Ve a <strong>Configuración → API</strong> y copia tu token</div>
              <div><strong>3.</strong> En Railway → backend → Variables agrega:</div>
              <div style={{background:'var(--gray-100)',borderRadius:6,padding:'8px 12px',fontFamily:'monospace',fontSize:12,margin:'6px 0'}}>
                NUBEFACT_TOKEN = tu_token_aqui<br/>
                NUBEFACT_RUC = ruc_del_negocio
              </div>
              <div><strong>4.</strong> Redespliega el backend</div>
              <div><strong>5.</strong> Cambia el modo a PRODUCCIÓN cuando estés listo</div>
            </div>
          </div>

          {/* Series de comprobantes */}
          <div className="card">
            <div className="card-title">Series de Comprobantes</div>
            <div style={{fontSize:13,color:'var(--gray-500)',marginBottom:14}}>
              Configura con tu contador. Por defecto: B001 boletas, F001 facturas.
            </div>
            {[
              {label:'Serie Tickets', key:'serieTicket', default:'T001', desc:'Sin valor SUNAT'},
              {label:'Serie Boletas', key:'serieBoleta', default:'B001', desc:'Personas naturales'},
              {label:'Serie Facturas', key:'serieFactura', default:'F001', desc:'Empresas con RUC'},
              {label:'Serie Notas Crédito', key:'serieNC', default:'BC01', desc:'Anulaciones'},
            ].map(s => (
              <div key={s.key} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <input className="form-input" style={{width:80,textTransform:'uppercase'}}
                  value={form[s.key]||s.default}
                  onChange={e=>setForm(f=>({...f,[s.key]:e.target.value.toUpperCase()}))}
                  maxLength={4}/>
                <div>
                  <div style={{fontSize:13,fontWeight:600}}>{s.label}</div>
                  <div style={{fontSize:11,color:'var(--gray-400)'}}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Datos SUNAT del negocio */}
          <div className="card">
            <div className="card-title">Datos SUNAT del Negocio</div>
            <div style={{fontSize:13,color:'var(--gray-500)',marginBottom:14}}>
              Estos datos aparecen en boletas y facturas.
            </div>
            <div className="form-group">
              <label className="form-label">RUC del negocio</label>
              <input className="form-input" value={form.ruc||''} maxLength={11}
                onChange={e=>setForm(f=>({...f,ruc:e.target.value}))}
                placeholder="20123456789"/>
            </div>
            <div className="form-group">
              <label className="form-label">Razón Social (SUNAT)</label>
              <input className="form-input" value={form.razonSocial||''}
                onChange={e=>setForm(f=>({...f,razonSocial:e.target.value}))}
                placeholder="EMPRESA S.A.C."/>
            </div>
            <div className="form-group">
              <label className="form-label">Modo Nubefact</label>
              <select className="form-select"
                value={form.nubefact?.modo||'demo'}
                onChange={e=>setForm(f=>({...f,nubefact:{...f.nubefact,modo:e.target.value}}))}>
                <option value="demo">⚠️ Demo (pruebas — sin valor legal)</option>
                <option value="produccion">✅ Producción (comprobantes reales SUNAT)</option>
              </select>
            </div>
          </div>

        </div>
      )}

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
              {creandoBk ? 'Generando...' : '⬇ Crear y Descargar Backup'}
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
            <div style={{display:'flex', gap:8, marginBottom:12, flexWrap:'wrap'}}>
              <button className="btn btn-primary btn-sm" onClick={() => descargarBackup('json')}>
                ⬇ Descargar JSON
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => descargarBackup('excel')}>
                📊 Descargar Excel
              </button>
            </div>
            {!backups.length ? (
              <div style={{ color: 'var(--gray-400)', textAlign: 'center', padding: 20 }}>Sin backups aún — crea uno con el botón de arriba</div>
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
                              onClick={() => descargarBackup('json')}>
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

    </div>
  )
}
