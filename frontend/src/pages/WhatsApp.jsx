import { useEffect, useState } from 'react'
import api from '../utils/api'

const PLANTILLAS = [
  { label:'Oferta del día',     texto:'Hola! Hoy en {nombre} tenemos una oferta especial: 1/4 de pollo + papas + gaseosa por S/18. Ven hoy y disfruta!' },
  { label:'Finde especial',     texto:'Este fin de semana en {nombre} te esperamos con precios especiales en pollos a la brasa. Trae a tu familia!' },
  { label:'Nuevo producto',     texto:'Hola! En {nombre} acaba de llegar nuestro nuevo menú. Ven y prueba nuestras novedades esta semana.' },
  { label:'Aniversario',        texto:'Estamos de aniversario en {nombre}! Celebra con nosotros con un 10% de descuento en toda la carta. Solo por hoy.' },
]

export default function WhatsApp() {
  const [stats, setStats]       = useState(null)
  const [mensaje, setMensaje]   = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [tab, setTab]           = useState('promo')
  const [msgCump, setMsgCump]   = useState('')
  const [enviandoCump, setEnviandoCump] = useState(false)
  const [resCump, setResCump]   = useState(null)

  useEffect(() => {
    api.get('/whatsapp/stats').then(r => setStats(r.data)).catch(() => {})
  }, [])

  const enviarPromo = async () => {
    if (!mensaje.trim()) return alert('Escribe un mensaje primero')
    if (!confirm(`¿Enviar este mensaje a ${stats?.conPromo || 0} clientes?`)) return
    setEnviando(true)
    setResultado(null)
    try {
      const { data } = await api.post('/whatsapp/enviar-promo', { mensaje })
      setResultado(data)
    } catch (err) {
      setResultado({ error: err.response?.data?.error || 'Error al enviar' })
    } finally {
      setEnviando(false)
    }
  }

  const enviarCumpleanos = async () => {
    setEnviandoCump(true)
    setResCump(null)
    try {
      const { data } = await api.post('/whatsapp/enviar-cumpleanos', { mensaje: msgCump || undefined })
      setResCump(data)
    } catch (err) {
      setResCump({ error: err.response?.data?.error || 'Error al enviar' })
    } finally {
      setEnviandoCump(false)
    }
  }

  const usarPlantilla = (t) => {
    const nombre = localStorage.getItem('restaurantNombre') || 'nuestra pollería'
    setMensaje(t.replace('{nombre}', nombre))
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">WhatsApp</div>
          <div className="page-sub">Envía promociones y mensajes a tus clientes</div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid-4" style={{ marginBottom:20 }}>
        {[
          { icon:'👥', label:'Clientes total',         val: stats?.total||0,    color:'blue' },
          { icon:'📱', label:'Con WhatsApp y promo',   val: stats?.conPromo||0, color:'green' },
          { icon:'🎂', label:'Con cumpleaños',          val: stats?.conCump||0,  color:'orange' },
          { icon:'🎉', label:'Cumplen este mes',        val: stats?.cumpleMes||0,color:'yellow' },
        ].map((s,i) => (
          <div key={i} className="stat-card">
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div><div className="stat-value">{s.val}</div><div className="stat-label">{s.label}</div></div>
          </div>
        ))}
      </div>

      {/* Aviso configuración */}
      <div style={{ background:'#FFF8E1', border:'1px solid #FFE082', borderRadius:'var(--radius-sm)', padding:'12px 16px', marginBottom:20, fontSize:13 }}>
        <strong>Cómo activar WhatsApp:</strong> Agrega el número <strong>+34 644 61 91 29</strong> a tu WhatsApp, envíale el mensaje:
        <em> "I allow callmebot to send me messages"</em> y recibirás tu API key.
        Luego agrégala en el archivo <code>.env</code> del backend: <code>CALLMEBOT_APIKEY=tu-key</code>
      </div>

      {/* TABS */}
      <div style={{ display:'flex', gap:4, background:'var(--gray-100)', borderRadius:'var(--radius)', padding:4, marginBottom:20, width:'fit-content' }}>
        {[{k:'promo',l:'Promoción masiva'},{k:'cump',l:'Cumpleaños'}].map(t => (
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

            {/* Plantillas rápidas */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, color:'var(--gray-500)', marginBottom:8, fontWeight:600 }}>Plantillas rápidas:</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {PLANTILLAS.map((p,i) => (
                  <button key={i} onClick={() => usarPlantilla(p.texto)}
                    style={{ padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
                      border:'1px solid var(--gray-300)', background:'white', transition:'all 0.15s' }}
                    onMouseOver={e=>e.currentTarget.style.borderColor='var(--primary)'}
                    onMouseOut={e=>e.currentTarget.style.borderColor='var(--gray-300)'}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mensaje</label>
              <textarea className="form-input" rows={5} placeholder="Escribe tu mensaje aquí..."
                value={mensaje} onChange={e => setMensaje(e.target.value)} style={{ resize:'vertical' }} />
              <div style={{ fontSize:11, color:'var(--gray-400)', marginTop:4 }}>{mensaje.length} caracteres</div>
            </div>

            <button className="btn btn-primary btn-block" style={{ background:'#25D366', color:'white', fontSize:15 }}
              onClick={enviarPromo} disabled={enviando}>
              {enviando ? 'Enviando...' : `Enviar a ${stats?.conPromo||0} clientes`}
            </button>

            {resultado && (
              <div style={{ marginTop:14, padding:'12px 14px', borderRadius:'var(--radius-sm)',
                background: resultado.error ? '#FFEBEE' : '#E8F5E9',
                color:      resultado.error ? 'var(--danger)' : 'var(--success)',
                fontSize:14, fontWeight:600 }}>
                {resultado.error
                  ? `Error: ${resultado.error}`
                  : `Enviados: ${resultado.enviados} / ${resultado.total} (${resultado.errores} fallaron)`
                }
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">Vista previa</div>
            <div style={{ background:'#ECE5DD', borderRadius:'var(--radius)', padding:16, minHeight:200 }}>
              <div style={{ background:'white', borderRadius:'0 8px 8px 8px', padding:'10px 14px', maxWidth:'85%', boxShadow:'0 1px 2px rgba(0,0,0,0.1)', position:'relative' }}>
                <div style={{ fontSize:13, lineHeight:1.6, color:'#111', whiteSpace:'pre-wrap' }}>
                  {mensaje || 'Tu mensaje aparecerá aquí...'}
                </div>
                <div style={{ fontSize:10, color:'#888', textAlign:'right', marginTop:4 }}>
                  {new Date().toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})} ✓✓
                </div>
              </div>
            </div>
            <div style={{ marginTop:14, fontSize:12, color:'var(--gray-500)' }}>
              Se enviará a clientes que tienen celular registrado y aceptaron recibir promociones.
            </div>
          </div>
        </div>
      )}

      {/* TAB CUMPLEAÑOS */}
      {tab==='cump' && (
        <div className="card" style={{ maxWidth:560 }}>
          <div className="card-title">Mensaje de cumpleaños automático</div>
          <div style={{ background:'var(--primary-light)', borderRadius:'var(--radius-sm)', padding:'12px 14px', marginBottom:16, fontSize:14 }}>
            Hoy cumplen años <strong>{stats?.cumpleMes||0}</strong> clientes registrados este mes.
            El sistema enviará el mensaje automáticamente a los que cumplen <strong>hoy</strong>.
          </div>

          <div className="form-group">
            <label className="form-label">Mensaje personalizado (opcional)</label>
            <textarea className="form-input" rows={4}
              placeholder="Dejar vacío para usar el mensaje por defecto: ¡Feliz cumpleaños! Ven hoy y te invitamos un postre gratis."
              value={msgCump} onChange={e => setMsgCump(e.target.value)} style={{ resize:'vertical' }} />
          </div>

          <button className="btn btn-primary btn-block" style={{ background:'#25D366', color:'white' }}
            onClick={enviarCumpleanos} disabled={enviandoCump}>
            {enviandoCump ? 'Enviando...' : 'Enviar saludo de cumpleaños de hoy'}
          </button>

          {resCump && (
            <div style={{ marginTop:14, padding:'12px 14px', borderRadius:'var(--radius-sm)',
              background: resCump.error ? '#FFEBEE' : '#E8F5E9',
              color:      resCump.error ? 'var(--danger)' : 'var(--success)',
              fontSize:14, fontWeight:600 }}>
              {resCump.error ? `Error: ${resCump.error}` : `Enviados: ${resCump.enviados} mensajes`}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
