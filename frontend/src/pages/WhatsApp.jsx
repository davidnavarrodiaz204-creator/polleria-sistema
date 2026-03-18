import { useEffect, useState } from 'react'
import api from '../utils/api'

const PLANTILLAS = [
  { label:'Oferta del día',   texto:'Hola! Hoy en {negocio} tenemos pollo a la brasa al mejor precio. Ven y disfruta con tu familia!' },
  { label:'Fin de semana',    texto:'Este fin de semana en {negocio} te esperamos con descuentos especiales. Trae a toda la familia!' },
  { label:'Nuevo producto',   texto:'Novedad en {negocio}! Nuevo plato especial disponible esta semana. Ven y pruébalo!' },
  { label:'Aniversario',      texto:'Estamos de aniversario en {negocio}! Celebra con nosotros, hay sorpresas para ti. Solo por hoy.' },
]

export default function WhatsApp() {
  const [stats, setStats]         = useState(null)
  const [mensaje, setMensaje]     = useState('')
  const [enviando, setEnviando]   = useState(false)
  const [resultado, setResultado] = useState(null)
  const [tab, setTab]             = useState('promo')
  const [msgCump, setMsgCump]     = useState('')
  const [resCump, setResCump]     = useState(null)
  const [enviandoCump, setEnviandoCump] = useState(false)

  useEffect(() => {
    api.get('/whatsapp/stats').then(r => setStats(r.data)).catch(() => {})
  }, [])

  const enviarPromo = async () => {
    if (!mensaje.trim()) return alert('Escribe un mensaje primero')
    if (!confirm(`¿Enviar este mensaje a ${stats?.conPromo || 0} clientes?`)) return
    setEnviando(true); setResultado(null)
    try {
      const { data } = await api.post('/whatsapp/enviar-promo', { mensaje })
      setResultado(data)
    } catch (err) {
      setResultado({ error: err.response?.data?.error || 'Error al enviar' })
    } finally { setEnviando(false) }
  }

  const enviarCumpleanos = async () => {
    setEnviandoCump(true); setResCump(null)
    try {
      const { data } = await api.post('/whatsapp/enviar-cumpleanos', { mensaje: msgCump || undefined })
      setResCump(data)
    } catch (err) {
      setResCump({ error: err.response?.data?.error || 'Error al enviar' })
    } finally { setEnviandoCump(false) }
  }

  const usarPlantilla = (texto) => {
    const neg = localStorage.getItem('restaurantNombre') || 'nuestra pollería'
    setMensaje(texto.replace('{negocio}', neg))
  }

  const whatsappActivo = stats?.whatsappActivo

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">WhatsApp</div>
          <div className="page-sub">Envía promociones a tus clientes</div>
        </div>
        <div style={{ padding:'6px 14px', borderRadius:20, fontSize:13, fontWeight:700,
          background: whatsappActivo ? '#E8F5E9' : '#FFF8E1',
          color:      whatsappActivo ? 'var(--success)' : '#E65100',
          border:     `1px solid ${whatsappActivo ? '#C8E6C9' : '#FFE082'}`,
        }}>
          {whatsappActivo ? 'WhatsApp activo' : 'WhatsApp no configurado'}
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom:20 }}>
        {[
          { icon:'👥', label:'Clientes total',       val: stats?.total||0,    color:'blue' },
          { icon:'📱', label:'Con WhatsApp + promos', val: stats?.conPromo||0, color:'green' },
          { icon:'🎂', label:'Con cumpleaños',        val: stats?.conCump||0,  color:'orange' },
          { icon:'🎉', label:'Cumplen este mes',      val: stats?.cumpleMes||0,color:'yellow' },
        ].map((s,i) => (
          <div key={i} className="stat-card">
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div><div className="stat-value">{s.val}</div><div className="stat-label">{s.label}</div></div>
          </div>
        ))}
      </div>

      {/* Aviso si no está configurado */}
      {!whatsappActivo && (
        <div style={{ background:'#FFF8E1', border:'1px solid #FFE082', borderRadius:'var(--radius-sm)', padding:'14px 16px', marginBottom:20 }}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>Cómo activar WhatsApp gratis (CallMeBot)</div>
          <div style={{ fontSize:13, lineHeight:1.8 }}>
            <strong>1.</strong> Guarda este número en tus contactos de WhatsApp: <strong>+34 644 61 91 29</strong><br/>
            <strong>2.</strong> Envíale EXACTAMENTE este mensaje: <code style={{background:'#eee',padding:'1px 6px',borderRadius:4}}>I allow callmebot to send me messages</code><br/>
            <strong>3.</strong> Recibirás tu API key por WhatsApp<br/>
            <strong>4.</strong> En Render → backend → Environment agrega: <code style={{background:'#eee',padding:'1px 6px',borderRadius:4}}>CALLMEBOT_APIKEY = tu_key</code><br/>
            <strong>5.</strong> Redespliega el backend y vuelve aquí
          </div>
        </div>
      )}

      {/* TABS */}
      <div style={{ display:'flex', gap:4, background:'var(--gray-100)', borderRadius:'var(--radius)', padding:4, marginBottom:20, width:'fit-content' }}>
        {[{k:'promo',l:'Promo masiva'},{k:'cump',l:'Cumpleaños'}].map(t => (
          <button key={t.k} onClick={()=>setTab(t.k)} style={{
            padding:'8px 18px', borderRadius:8, border:'none', cursor:'pointer',
            fontWeight:600, fontSize:14,
            background: tab===t.k ? 'white' : 'transparent',
            boxShadow:  tab===t.k ? 'var(--shadow-sm)' : 'none',
          }}>{t.l}</button>
        ))}
      </div>

      {/* TAB PROMO */}
      {tab==='promo' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-title">Redactar mensaje</div>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:12, color:'var(--gray-500)', marginBottom:6, fontWeight:600 }}>Plantillas:</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {PLANTILLAS.map((p,i) => (
                  <button key={i} onClick={() => usarPlantilla(p.texto)}
                    style={{ padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
                      border:'1px solid var(--gray-300)', background:'white' }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Mensaje</label>
              <textarea className="form-input" rows={5}
                placeholder="Escribe tu promoción aquí..."
                value={mensaje} onChange={e => setMensaje(e.target.value)}
                style={{ resize:'vertical' }} />
              <div style={{ fontSize:11, color:'var(--gray-400)', marginTop:3 }}>{mensaje.length} caracteres</div>
            </div>
            <button
              style={{ width:'100%', padding:'12px', borderRadius:'var(--radius-sm)', border:'none',
                background: whatsappActivo ? '#25D366' : 'var(--gray-300)',
                color: whatsappActivo ? 'white' : 'var(--gray-600)',
                fontSize:15, fontWeight:700, cursor: whatsappActivo ? 'pointer' : 'not-allowed' }}
              onClick={whatsappActivo ? enviarPromo : () => alert('Configura primero WhatsApp siguiendo las instrucciones.')}
              disabled={enviando}>
              {enviando ? 'Enviando...' : `Enviar a ${stats?.conPromo||0} clientes`}
            </button>

            {resultado && (
              <div style={{ marginTop:12, padding:'10px 14px', borderRadius:'var(--radius-sm)', fontSize:14, fontWeight:600,
                background: resultado.error ? '#FFEBEE' : '#E8F5E9',
                color:      resultado.error ? 'var(--danger)' : 'var(--success)' }}>
                {resultado.error
                  ? `Error: ${resultado.error}`
                  : `Enviados: ${resultado.enviados} de ${resultado.total} (${resultado.errores} fallaron)`}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">Vista previa</div>
            <div style={{ background:'#ECE5DD', borderRadius:'var(--radius)', padding:16, minHeight:180 }}>
              <div style={{ background:'white', borderRadius:'0 10px 10px 10px', padding:'10px 14px',
                maxWidth:'85%', boxShadow:'0 1px 2px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize:13, lineHeight:1.7, whiteSpace:'pre-wrap' }}>
                  {mensaje || 'Tu mensaje aparecerá aquí...'}
                </div>
                <div style={{ fontSize:10, color:'#888', textAlign:'right', marginTop:4 }}>
                  {new Date().toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})} ✓✓
                </div>
              </div>
            </div>
            <div style={{ marginTop:12, fontSize:12, color:'var(--gray-500)', lineHeight:1.6 }}>
              Solo se envía a clientes con celular registrado que aceptaron promos.
              Espera 1.5 segundos entre mensajes para no ser bloqueado.
            </div>
          </div>
        </div>
      )}

      {/* TAB CUMPLEAÑOS */}
      {tab==='cump' && (
        <div className="card" style={{ maxWidth:540 }}>
          <div className="card-title">Saludo de cumpleaños automático</div>
          <div style={{ background:'var(--primary-light)', borderRadius:'var(--radius-sm)', padding:'12px 14px', marginBottom:16, fontSize:14 }}>
            Hoy cumplen años <strong>{stats?.cumpleMes||0}</strong> clientes registrados este mes.
            El mensaje se enviará a quienes cumplen <strong>exactamente hoy</strong> y tienen WhatsApp registrado.
          </div>
          <div className="form-group">
            <label className="form-label">Mensaje personalizado (opcional)</label>
            <textarea className="form-input" rows={3}
              placeholder="Si dejas vacío: Hola [Nombre]! Hoy es tu día especial! Te deseamos un feliz cumpleaños de parte de [negocio]! Ven hoy y te invitamos un postre gratis."
              value={msgCump} onChange={e => setMsgCump(e.target.value)}
              style={{ resize:'vertical' }} />
          </div>
          <button
            style={{ width:'100%', padding:'12px', borderRadius:'var(--radius-sm)', border:'none',
              background: whatsappActivo ? '#25D366' : 'var(--gray-300)',
              color: whatsappActivo ? 'white' : 'var(--gray-600)',
              fontSize:15, fontWeight:700, cursor: whatsappActivo ? 'pointer' : 'not-allowed' }}
            onClick={whatsappActivo ? enviarCumpleanos : () => alert('Configura primero WhatsApp.')}
            disabled={enviandoCump}>
            {enviandoCump ? 'Enviando...' : 'Enviar felicitaciones de hoy'}
          </button>
          {resCump && (
            <div style={{ marginTop:12, padding:'10px 14px', borderRadius:'var(--radius-sm)', fontSize:14, fontWeight:600,
              background: resCump.error ? '#FFEBEE' : '#E8F5E9',
              color:      resCump.error ? 'var(--danger)' : 'var(--success)' }}>
              {resCump.error ? `Error: ${resCump.error}` : `Enviados: ${resCump.enviados} mensajes`}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
