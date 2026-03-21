/**
 * Configuracion.jsx — Configuración del sistema PollerOS
 * Pestañas: Negocio | Apariencia | Módulos | WhatsApp | Series | Backups | Reset
 * Autor: David Navarro Diaz
 */
import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import api from '../utils/api'

const COLORES = [
  { nombre: 'Amarillo', hex: '#F5C518', texto: '#212121' },
  { nombre: 'Naranja',  hex: '#FF6B35', texto: '#FFFFFF' },
  { nombre: 'Rojo',     hex: '#E53935', texto: '#FFFFFF' },
  { nombre: 'Verde',    hex: '#43A047', texto: '#FFFFFF' },
  { nombre: 'Azul',     hex: '#1E88E5', texto: '#FFFFFF' },
  { nombre: 'Morado',   hex: '#8E24AA', texto: '#FFFFFF' },
  { nombre: 'Café',     hex: '#6D4C41', texto: '#FFFFFF' },
]

export default function Configuracion() {
  const { config, guardarConfig } = useApp()
  const [form, setForm]       = useState({ ...config })
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk]           = useState(false)
  const [tab, setTab]         = useState('negocio')

  // Backups
  const [backups, setBackups]     = useState([])
  const [creandoBk, setCreandoBk] = useState(false)
  const [msgBk, setMsgBk]         = useState('')

  // SUNAT
  const [sunatActivo, setSunatActivo] = useState(false)
  useEffect(() => {
    api.get('/facturacion/estado')
      .then(r => setSunatActivo(r.data.configurado))
      .catch(() => {})
  }, [])

  // Reset
  const [preview, setPreview]         = useState(null)
  const [confirmarReset, setConfirmar] = useState('')
  const [resetClientes, setResetCli]  = useState(false)
  const [reseteando, setReseteando]   = useState(false)
  const [resetOk, setResetOk]         = useState(null)

  useEffect(() => {
    if (tab === 'backup') cargarBackups()
    if (tab === 'reset')  cargarPreview()
  }, [tab])

  const cargarBackups = () => {
    api.get('/backup').then(r => setBackups(r.data)).catch(() => {})
  }

  const cargarPreview = () => {
    api.get('/reset/preview').then(r => setPreview(r.data)).catch(() => {})
  }

  const descargarDirecto = async (formato = 'json') => {
    const token   = localStorage.getItem('token')
    const baseUrl = import.meta.env.VITE_API_URL || ''
    const response = await fetch(`${baseUrl}/api/backup/descargar?formato=${formato}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!response.ok) { const err = await response.json().catch(()=>({})); throw new Error(err.error||'Error') }
    const blob = await response.blob()
    const ext  = formato === 'excel' ? 'xlsx' : 'json'
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `polleria-backup-${new Date().toISOString().split('T')[0]}.${ext}`; a.click()
    URL.revokeObjectURL(url)
  }

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      await guardarConfig(form)
      localStorage.setItem('restaurantNombre', form.nombre || 'PollerOS')
      setOk(true); setTimeout(() => setOk(false), 3000)
    } catch { alert('Error al guardar') }
    finally { setGuardando(false) }
  }

  const crearBackup = async () => {
    setCreandoBk(true); setMsgBk('')
    try {
      const { data } = await api.post('/backup/crear', { tipo: 'manual' })
      setMsgBk('Descargando JSON...')
      await descargarDirecto('json')
      setMsgBk(`✅ Backup creado: ${data.tamaño} registros`)
      cargarBackups()
    } catch (err) { setMsgBk('Error: ' + (err.response?.data?.error || err.message)) }
    finally { setCreandoBk(false) }
  }

  const descargarBackup = async (formato = 'json') => {
    try {
      setMsgBk(`Descargando ${formato === 'excel' ? 'Excel' : 'JSON'}...`)
      await descargarDirecto(formato)
      setMsgBk(`✅ Descargado`)
    } catch (err) { setMsgBk('Error: ' + err.message) }
  }

  const eliminarBackup = async (id) => {
    if (!confirm('¿Eliminar este backup?')) return
    await api.delete('/backup/' + id); cargarBackups()
  }

  const ejecutarReset = async () => {
    if (!confirm('¿Estás SEGURO? Esta acción no se puede deshacer.')) return
    setReseteando(true)
    try {
      const { data } = await api.post('/reset/ejecutar', { confirmar: confirmarReset, resetClientes })
      setResetOk(data)
    } catch (err) { alert(err.response?.data?.error || 'Error al resetear') }
    finally { setReseteando(false) }
  }

  const TABS = [
    { k: 'negocio',    l: 'Negocio'    },
    { k: 'apariencia', l: 'Apariencia' },
    { k: 'modulos',    l: 'Módulos'    },
    { k: 'whatsapp',   l: '💬 WhatsApp' },
    { k: 'series',     l: '🧾 Series'   },
    { k: 'sunat',      l: sunatActivo ? '🟢 SUNAT' : '⚪ SUNAT' },
    { k: 'backup',     l: 'Backups'    },
    { k: 'reset',      l: '🔄 Reset'   },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">Configuración</div><div className="page-sub">Personaliza tu sistema</div></div>
      </div>

      {/* TABS */}
      <div style={{ display:'flex', gap:4, background:'var(--gray-100)', borderRadius:'var(--radius)', padding:4, marginBottom:20, flexWrap:'wrap' }}>
        {TABS.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{
            padding:'8px 16px', borderRadius:8, border:'none', cursor:'pointer',
            fontWeight:600, fontSize:13,
            background: tab === t.k ? 'white' : 'transparent',
            boxShadow:  tab === t.k ? 'var(--shadow-sm)' : 'none',
            color:      t.k === 'reset' ? (tab===t.k ? 'var(--danger)' : 'var(--danger)') : 'inherit',
          }}>{t.l}</button>
        ))}
      </div>

      <form onSubmit={guardar}>

        {/* ── NEGOCIO ── */}
        {tab === 'negocio' && (
          <div className="card" style={{ maxWidth:560 }}>
            <div className="card-title">Datos del negocio</div>

            <div className="form-group"><label className="form-label">Nombre del restaurante</label>
              <input className="form-input" value={form.nombre||''} onChange={e=>setForm({...form,nombre:e.target.value})}/></div>

            <div className="form-group"><label className="form-label">Slogan</label>
              <input className="form-input" value={form.slogan||''} onChange={e=>setForm({...form,slogan:e.target.value})}/></div>

            {/* Logo */}
            <div className="form-group">
              <label className="form-label">Logo del negocio</label>
              <div style={{display:'flex',gap:12,alignItems:'flex-start',flexWrap:'wrap'}}>
                <div style={{width:72,height:72,borderRadius:12,border:'2px dashed var(--gray-300)',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--gray-50)',flexShrink:0,overflow:'hidden'}}>
                  {form.logo?.startsWith('data:') ? (
                    <img src={form.logo} alt="logo" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  ) : (
                    <span style={{fontSize:36}}>{form.logo||'🍗'}</span>
                  )}
                </div>
                <div style={{flex:1,display:'flex',flexDirection:'column',gap:8}}>
                  <label style={{display:'inline-flex',alignItems:'center',gap:8,padding:'8px 14px',background:'var(--gray-100)',border:'1px solid var(--gray-300)',borderRadius:'var(--radius-sm)',cursor:'pointer',fontSize:13,fontWeight:600,width:'fit-content'}}>
                    📷 Subir imagen
                    <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{
                      const file = e.target.files[0]; if (!file) return
                      if (file.size > 500000) return alert('Máximo 500KB')
                      const reader = new FileReader()
                      reader.onload = ev => setForm(f=>({...f,logo:ev.target.result}))
                      reader.readAsDataURL(file)
                    }}/>
                  </label>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:12,color:'var(--gray-500)'}}>O escribe un emoji:</span>
                    <input className="form-input" style={{width:70,textAlign:'center',fontSize:20}}
                      value={form.logo?.startsWith('data:')?'':(form.logo||'')}
                      maxLength={4} placeholder="🍗"
                      onChange={e=>setForm(f=>({...f,logo:e.target.value}))}/>
                  </div>
                  {form.logo?.startsWith('data:') && (
                    <button type="button" className="btn btn-ghost btn-sm" style={{width:'fit-content'}}
                      onClick={()=>setForm(f=>({...f,logo:'🍗'}))}>✕ Quitar imagen</button>
                  )}
                  <div style={{fontSize:11,color:'var(--gray-400)'}}>JPG, PNG, WebP · Máx 500KB</div>
                </div>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group"><label className="form-label">RUC</label>
                <input className="form-input" value={form.ruc||''} placeholder="20123456789"
                  onChange={e=>setForm({...form,ruc:e.target.value})}/></div>
              <div className="form-group"><label className="form-label">Teléfono</label>
                <input className="form-input" value={form.telefono||''}
                  onChange={e=>setForm({...form,telefono:e.target.value})}/></div>
            </div>
            <div className="form-group"><label className="form-label">Dirección</label>
              <input className="form-input" value={form.direccion||''} onChange={e=>setForm({...form,direccion:e.target.value})}/></div>
            <div className="form-group"><label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})}/></div>
          </div>
        )}

        {/* ── APARIENCIA ── */}
        {tab === 'apariencia' && (
          <div className="card" style={{ maxWidth:560 }}>
            <div className="card-title">Color principal</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:16 }}>
              {COLORES.map(c => (
                <div key={c.hex} onClick={()=>setForm({...form,colorPrimario:c.hex,colorTexto:c.texto})}
                  title={c.nombre} style={{
                    width:42,height:42,borderRadius:10,background:c.hex,cursor:'pointer',
                    border: form.colorPrimario===c.hex ? '3px solid #212121' : '3px solid transparent',
                    transform: form.colorPrimario===c.hex ? 'scale(1.15)' : 'scale(1)',
                    transition:'all 0.15s', boxShadow:'var(--shadow-sm)'
                  }}/>
              ))}
            </div>
            <div style={{ borderRadius:12, padding:'14px 20px', marginBottom:12, background:form.colorPrimario||'#F5C518', display:'flex', alignItems:'center', gap:10 }}>
              {form.logo?.startsWith('data:') ? (
                <img src={form.logo} alt="logo" style={{width:32,height:32,borderRadius:6,objectFit:'cover',flexShrink:0}}/>
              ) : (
                <span style={{fontSize:28}}>{form.logo||'🍗'}</span>
              )}
              <span style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:800, color:form.colorTexto||'#212121' }}>
                {form.nombre||'Mi Pollería'}
              </span>
            </div>
          </div>
        )}

        {/* ── MÓDULOS ── */}
        {tab === 'modulos' && (
          <div className="card" style={{ maxWidth:400 }}>
            <div className="card-title">Módulos activos</div>
            {[
              ['mesas',    '🪑 Mesas y salón'],
              ['cocina',   '👨‍🍳 Pantalla cocina'],
              ['delivery', '🛵 Delivery'],
              ['bebidas',  '🥤 Bebidas en menú'],
              ['caja',     '💵 Caja y cobros'],
              ['reservas', '📅 Reservas'],
            ].map(([key, label]) => (
              <label key={key} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, cursor:'pointer', fontSize:14 }}>
                <input type="checkbox"
                  checked={form.modulos?.[key] ?? true}
                  onChange={e=>setForm({...form, modulos:{...form.modulos,[key]:e.target.checked}})}/>
                {label}
              </label>
            ))}
          </div>
        )}

        {/* Botón guardar para tabs con formulario */}
        {['negocio','apariencia','modulos','whatsapp','series'].includes(tab) && (
          <div style={{ marginTop:16 }}>
            {ok && <div style={{ background:'#E8F5E9', color:'var(--success)', border:'1px solid #C8E6C9', borderRadius:'var(--radius-sm)', padding:'10px 16px', marginBottom:12, fontWeight:600 }}>
              ✅ Configuración guardada correctamente
            </div>}
            <button type="submit" className="btn btn-primary" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        )}
      </form>

      {/* ── WHATSAPP ── */}
      {tab === 'whatsapp' && (
        <form onSubmit={guardar}>
          <div className="card" style={{ maxWidth:560 }}>
            <div className="card-title">💬 WhatsApp — CallMeBot</div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Tu número WhatsApp</label>
                <input className="form-input"
                  value={form.whatsapp?.numero||''}
                  onChange={e=>setForm({...form,whatsapp:{...form.whatsapp,numero:e.target.value}})}
                  placeholder="51987654321" maxLength={15}/>
                <div style={{fontSize:11,color:'var(--gray-400)',marginTop:4}}>Con código de país: 51 + tu número</div>
              </div>
              <div className="form-group">
                <label className="form-label">CallMeBot API Key</label>
                <input className="form-input" type="password"
                  value={form.whatsapp?.apikey||''}
                  onChange={e=>setForm({...form,whatsapp:{...form.whatsapp,apikey:e.target.value}})}
                  placeholder="123456"/>
                <div style={{fontSize:11,color:'var(--gray-400)',marginTop:4}}>
                  <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noreferrer" style={{color:'var(--info)'}}>
                    ¿Cómo obtener mi API key? →
                  </a>
                </div>
              </div>
            </div>

          </div>
          <div style={{marginTop:16}}>
            {ok && <div style={{background:'#E8F5E9',color:'var(--success)',border:'1px solid #C8E6C9',borderRadius:'var(--radius-sm)',padding:'10px 16px',marginBottom:12,fontWeight:600}}>✅ Guardado</div>}
            <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando?'Guardando...':'Guardar Cambios'}</button>
          </div>
        </form>
      )}

      {/* ── SERIES DE COMPROBANTES ── */}
      {tab === 'series' && (
        <form onSubmit={guardar}>
          <div className="card" style={{ maxWidth:560 }}>
            <div className="card-title">🧾 Series de Comprobantes</div>
            <div style={{fontSize:13,color:'var(--gray-500)',marginBottom:16,lineHeight:1.7}}>
              Configura con tu contador. Estas series aparecen en tickets, boletas y facturas.
              Cuando actives facturación SUNAT (Nubefact), deben coincidir con las series registradas ahí.
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16}}>
              {[
                {label:'Serie Tickets',      key:'serieTicket',  default:'T001', desc:'Sin valor SUNAT'},
                {label:'Serie Boletas',       key:'serieBoleta',  default:'B001', desc:'Personas naturales'},
                {label:'Serie Facturas',      key:'serieFactura', default:'F001', desc:'Empresas con RUC'},
                {label:'Serie Notas Crédito', key:'serieNC',      default:'BC01', desc:'Anulaciones'},
              ].map(s => (
                <div key={s.key} className="form-group" style={{margin:0}}>
                  <label className="form-label">{s.label}</label>
                  <input className="form-input"
                    style={{textTransform:'uppercase',fontFamily:'monospace',letterSpacing:2}}
                    value={form[s.key]||s.default}
                    onChange={e=>setForm(f=>({...f,[s.key]:e.target.value.toUpperCase()}))}
                    maxLength={4} placeholder={s.default}/>
                  <div style={{fontSize:11,color:'var(--gray-400)',marginTop:4}}>{s.desc}</div>
                </div>
              ))}
            </div>

            <div style={{marginTop:20,borderTop:'1px solid var(--gray-200)',paddingTop:16}}>
              <div className="card-title" style={{marginBottom:8,fontSize:13}}>Datos SUNAT del negocio</div>
              <div style={{fontSize:13,color:'var(--gray-500)',marginBottom:12}}>
                Estos datos aparecen en boletas y facturas. El RUC también puedes editarlo en la pestaña Negocio.
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">RUC del negocio</label>
                  <input className="form-input" value={form.ruc||''} maxLength={11}
                    onChange={e=>setForm(f=>({...f,ruc:e.target.value}))} placeholder="20123456789"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Razón Social (SUNAT)</label>
                  <input className="form-input" value={form.razonSocial||''}
                    onChange={e=>setForm(f=>({...f,razonSocial:e.target.value}))}
                    placeholder="EMPRESA S.A.C."/>
                </div>
              </div>
            </div>
          </div>
          <div style={{marginTop:16}}>
            {ok && <div style={{background:'#E8F5E9',color:'var(--success)',border:'1px solid #C8E6C9',borderRadius:'var(--radius-sm)',padding:'10px 16px',marginBottom:12,fontWeight:600}}>✅ Guardado</div>}
            <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando?'Guardando...':'Guardar Cambios'}</button>
          </div>
        </form>
      )}

      {/* ── SUNAT / NUBEFACT ── */}
      {tab === 'sunat' && (
        <div style={{maxWidth:600}}>
          {/* Estado actual */}
          <div className="card" style={{marginBottom:16}}>
            <div className="card-title">Estado de Facturación Electrónica</div>
            <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:'1px solid var(--gray-100)',marginBottom:16}}>
              <div style={{width:14,height:14,borderRadius:'50%',background:sunatActivo?'var(--success)':'var(--gray-300)',boxShadow:sunatActivo?'0 0 8px var(--success)':'none'}}/>
              <span style={{fontWeight:700,fontSize:15,color:sunatActivo?'var(--success)':'var(--gray-500)'}}>
                {sunatActivo ? '✅ Nubefact activo — emitiendo a SUNAT' : 'No configurado — funcionando sin SUNAT'}
              </span>
            </div>
            <div style={{fontSize:13,color:'var(--gray-600)',lineHeight:1.8}}>
              {sunatActivo
                ? 'Las boletas y facturas se envían automáticamente a SUNAT al cobrar.'
                : 'Para activar la facturación electrónica agrega NUBEFACT_TOKEN en Railway.'}
            </div>
          </div>

          {/* Instrucciones */}
          <div className="card" style={{marginBottom:16}}>
            <div className="card-title">Cómo activar Nubefact</div>
            <div style={{fontSize:13,lineHeight:2,color:'var(--gray-700)'}}>
              <div><strong>1.</strong> Regístrate en <a href="https://nubefact.com" target="_blank" rel="noreferrer" style={{color:'var(--info)'}}>nubefact.com</a> (~S/29/mes)</div>
              <div><strong>2.</strong> Ve a <strong>Configuración → API</strong> y copia tu token</div>
              <div><strong>3.</strong> En Railway → backend → Variables agrega:</div>
              <div style={{background:'var(--gray-100)',borderRadius:6,padding:'10px 14px',fontFamily:'monospace',fontSize:12,margin:'8px 0',lineHeight:2}}>
                NUBEFACT_TOKEN = tu_token_aqui<br/>
                NUBEFACT_RUC = ruc_del_negocio
              </div>
              <div><strong>4.</strong> Railway redespliega automáticamente (~1 min)</div>
              <div><strong>5.</strong> Vuelve aquí — el estado cambiará a 🟢 Activo</div>
              <div><strong>6.</strong> Haz una boleta de prueba en modo DEMO primero</div>
            </div>
          </div>

          {/* Modo demo/producción */}
          <div className="card">
            <div className="card-title">Modo de emisión</div>
            <div style={{fontSize:13,color:'var(--gray-500)',marginBottom:14}}>
              Cambia entre modo prueba y producción. En DEMO los comprobantes no tienen valor legal.
            </div>
            <div style={{display:'flex',gap:12}}>
              {['demo','produccion'].map(m => (
                <label key={m} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',padding:'12px 16px',borderRadius:'var(--radius-sm)',border:`2px solid ${(form.nubefact?.modo||'demo')===m?'var(--primary)':'var(--gray-200)'}`,flex:1}}>
                  <input type="radio" name="nubefact_modo" value={m}
                    checked={(form.nubefact?.modo||'demo')===m}
                    onChange={()=>setForm(f=>({...f,nubefact:{...f.nubefact,modo:m}}))}/>
                  <div>
                    <div style={{fontWeight:700,fontSize:13}}>
                      {m==='demo'?'⚠️ Demo':'✅ Producción'}
                    </div>
                    <div style={{fontSize:11,color:'var(--gray-400)'}}>
                      {m==='demo'?'Pruebas — sin valor legal':'Comprobantes reales SUNAT'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div style={{marginTop:16}}>
              {ok && <div style={{background:'#E8F5E9',color:'var(--success)',border:'1px solid #C8E6C9',borderRadius:'var(--radius-sm)',padding:'10px 16px',marginBottom:12,fontWeight:600}}>✅ Guardado</div>}
              <button type="button" className="btn btn-primary" disabled={guardando}
                onClick={async()=>{setGuardando(true);try{await guardarConfig(form);setOk(true);setTimeout(()=>setOk(false),3000)}catch{}finally{setGuardando(false)}}}>
                {guardando?'Guardando...':'Guardar modo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BACKUPS ── */}
      {tab === 'backup' && (
        <div>
          <div className="card" style={{ maxWidth:600, marginBottom:16 }}>
            <div className="card-title">Backup manual</div>
            <p style={{ fontSize:13, color:'var(--gray-600)', marginBottom:14, lineHeight:1.7 }}>
              Crea un backup de todos los datos del sistema guardado en MongoDB Atlas.
              Puedes descargarlo como JSON o Excel para guardarlo en tu computadora.
            </p>
            <div style={{ background:'#E3F2FD', borderRadius:'var(--radius-sm)', padding:'10px 14px', marginBottom:14, fontSize:13 }}>
              <strong>Backup automático:</strong> El sistema hace snapshots automáticos cada 6 horas.
              Este botón es para backups manuales bajo demanda.
            </div>
            <button className="btn btn-primary" onClick={crearBackup} disabled={creandoBk}>
              {creandoBk ? 'Generando...' : '⬇ Crear y Descargar Backup'}
            </button>
            {msgBk && (
              <div style={{ marginTop:10, fontSize:13, fontWeight:600, color:msgBk.startsWith('Error')?'var(--danger)':'var(--success)' }}>
                {msgBk}
              </div>
            )}
          </div>

          <div className="card" style={{ maxWidth:600 }}>
            <div className="card-title">Historial de backups</div>
            <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={()=>descargarBackup('json')}>⬇ Descargar JSON</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>descargarBackup('excel')}>📊 Descargar Excel</button>
            </div>
            {!backups.length ? (
              <div style={{ color:'var(--gray-400)', textAlign:'center', padding:20 }}>Sin backups aún</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Fecha</th><th>Tipo</th><th>Registros</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {backups.map(b => (
                      <tr key={b._id}>
                        <td style={{fontSize:13}}>{new Date(b.createdAt||b.fecha).toLocaleString('es-PE')}</td>
                        <td><span className="badge badge-info">{b.tipo}</span></td>
                        <td style={{fontWeight:700}}>{b.tamaño}</td>
                        <td>
                          <div style={{display:'flex',gap:6}}>
                            <button className="btn btn-success btn-sm" onClick={()=>descargarBackup('json')}>Descargar</button>
                            <button className="btn btn-danger btn-sm" onClick={()=>eliminarBackup(b._id)}>Eliminar</button>
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

      {/* ── RESET ── */}
      {tab === 'reset' && (
        <div style={{ maxWidth:600 }}>
          {resetOk ? (
            <div className="card" style={{textAlign:'center',padding:40,borderLeft:'4px solid var(--success)'}}>
              <div style={{fontSize:48}}>✅</div>
              <div style={{fontSize:22,fontWeight:800,color:'var(--success)',marginTop:12}}>Sistema reseteado</div>
              <div style={{fontSize:14,color:'var(--gray-600)',marginTop:8,lineHeight:1.8}}>
                Se borraron: <strong>{resetOk.borrado?.pedidos}</strong> pedidos,&nbsp;
                <strong>{resetOk.borrado?.cajas}</strong> cajas,&nbsp;
                <strong>{resetOk.borrado?.egresos}</strong> egresos
              </div>
              <div style={{fontSize:13,color:'var(--gray-500)',marginTop:6}}>Se conservaron: usuarios, mesas, carta/menú</div>
              <button className="btn btn-primary" style={{marginTop:20}}
                onClick={()=>{ setResetOk(null); setConfirmar(''); cargarPreview() }}>
                Volver
              </button>
            </div>
          ) : (
            <>
              <div style={{background:'#FFF3CD',border:'1px solid #FFE082',borderRadius:'var(--radius-sm)',padding:'14px 16px',marginBottom:16,fontSize:13,lineHeight:1.8}}>
                ⚠️ <strong>Esta acción es irreversible.</strong> Se borrará toda la data de ventas.
                Se crea un backup automático antes de ejecutar.
              </div>

              {preview && (
                <div className="card" style={{marginBottom:16}}>
                  <div className="card-title">Vista previa — qué se va a borrar</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:'var(--danger)',marginBottom:8,textTransform:'uppercase'}}>Se borra ❌</div>
                      {Object.entries(preview.seBorra).map(([k,v])=>(
                        <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid var(--gray-100)',fontSize:13}}>
                          <span style={{textTransform:'capitalize'}}>{k}</span>
                          <strong style={{color:v>0?'var(--danger)':'var(--gray-400)'}}>{v}</strong>
                        </div>
                      ))}
                      <div style={{padding:'5px 0',fontSize:13,color:'var(--gray-500)'}}>
                        Correlativo actual: <strong>#{preview.correlativoActual}</strong> → reinicia en #1
                      </div>
                    </div>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:'var(--success)',marginBottom:8,textTransform:'uppercase'}}>Se conserva ✅</div>
                      {Object.entries(preview.seConserva).map(([k,v])=>(
                        <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid var(--gray-100)',fontSize:13}}>
                          <span style={{textTransform:'capitalize'}}>{k==='productos'?'carta/menú':k}</span>
                          <strong style={{color:'var(--success)'}}>{v}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                  <label style={{display:'flex',alignItems:'center',gap:10,fontSize:13,cursor:'pointer',padding:'10px 0',borderTop:'1px solid var(--gray-200)'}}>
                    <input type="checkbox" checked={resetClientes} onChange={e=>setResetCli(e.target.checked)}/>
                    <div>
                      <div style={{fontWeight:600}}>También borrar clientes ({preview.seConserva.clientes})</div>
                      <div style={{fontSize:11,color:'var(--gray-500)'}}>Por defecto se conservan.</div>
                    </div>
                  </label>
                </div>
              )}

              <div className="card">
                <div className="card-title" style={{color:'var(--danger)'}}>⚠️ Confirmar reset</div>
                <div style={{fontSize:13,color:'var(--gray-600)',marginBottom:12}}>
                  Escribe exactamente:&nbsp;
                  <code style={{background:'var(--gray-100)',padding:'2px 6px',borderRadius:4,fontWeight:700}}>RESETEAR SISTEMA</code>
                </div>
                <input className="form-input" style={{marginBottom:12,fontFamily:'monospace'}}
                  placeholder="Escribe: RESETEAR SISTEMA"
                  value={confirmarReset}
                  onChange={e=>setConfirmar(e.target.value)}/>
                <button
                  type="button"
                  className="btn"
                  style={{
                    width:'100%',padding:14,fontSize:15,fontWeight:800,border:'none',
                    borderRadius:'var(--radius)',
                    background: confirmarReset==='RESETEAR SISTEMA' ? 'var(--danger)' : 'var(--gray-200)',
                    color:      confirmarReset==='RESETEAR SISTEMA' ? 'white' : 'var(--gray-500)',
                    cursor:     confirmarReset==='RESETEAR SISTEMA' ? 'pointer' : 'not-allowed',
                  }}
                  disabled={confirmarReset !== 'RESETEAR SISTEMA' || reseteando}
                  onClick={ejecutarReset}>
                  {reseteando ? '⏳ Reseteando...' : '🔄 Ejecutar Reset del Sistema'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
