import { useState } from 'react'
import { useApp } from '../context/AppContext'

const COLORES = [
  { nombre:'Amarillo', hex:'#F5C518', texto:'#212121' },
  { nombre:'Naranja',  hex:'#FF6B35', texto:'#FFFFFF' },
  { nombre:'Rojo',     hex:'#E53935', texto:'#FFFFFF' },
  { nombre:'Verde',    hex:'#43A047', texto:'#FFFFFF' },
  { nombre:'Azul',     hex:'#1E88E5', texto:'#FFFFFF' },
  { nombre:'Morado',   hex:'#8E24AA', texto:'#FFFFFF' },
  { nombre:'Café',     hex:'#6D4C41', texto:'#FFFFFF' },
]

export default function Configuracion() {
  const { config, guardarConfig } = useApp()
  const [form, setForm] = useState({ ...config })
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk] = useState(false)

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      await guardarConfig(form)
      setOk(true)
      setTimeout(() => setOk(false), 3000)
    } catch { alert('Error al guardar') }
    finally { setGuardando(false) }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">Configuración ⚙️</div><div className="page-sub">Personaliza tu sistema</div></div>
      </div>

      <form onSubmit={guardar}>
        <div className="grid-2" style={{ marginBottom:20 }}>
          <div className="card">
            <div className="card-title">🏪 Identidad del negocio</div>
            <div className="form-group"><label className="form-label">Nombre del restaurante</label><input className="form-input" value={form.nombre||''} onChange={e=>setForm({...form,nombre:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Slogan</label><input className="form-input" value={form.slogan||''} onChange={e=>setForm({...form,slogan:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Emoji / Logo</label><input className="form-input" value={form.logo||''} maxLength={4} onChange={e=>setForm({...form,logo:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">RUC</label><input className="form-input" value={form.ruc||''} onChange={e=>setForm({...form,ruc:e.target.value})} placeholder="20123456789" /></div>
            <div className="form-group"><label className="form-label">Dirección</label><input className="form-input" value={form.direccion||''} onChange={e=>setForm({...form,direccion:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={form.telefono||''} onChange={e=>setForm({...form,telefono:e.target.value})} /></div>
          </div>

          <div className="card">
            <div className="card-title">🎨 Color principal</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:16 }}>
              {COLORES.map(c => (
                <div key={c.hex} onClick={() => setForm({...form, colorPrimario:c.hex, colorTexto:c.texto})}
                  style={{ width:42, height:42, borderRadius:10, background:c.hex, cursor:'pointer', border: form.colorPrimario===c.hex ? '3px solid #212121' : '3px solid transparent', transform: form.colorPrimario===c.hex ? 'scale(1.12)' : 'scale(1)', transition:'all 0.15s', boxShadow:'var(--shadow-sm)' }}
                  title={c.nombre} />
              ))}
            </div>
            <div style={{ borderRadius:12, padding:'16px 20px', background: form.colorPrimario||'#F5C518', marginBottom:16 }}>
              <span style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:800, color: form.colorTexto||'#212121' }}>
                {form.logo||'🍗'} {form.nombre||'Mi Pollería'}
              </span>
            </div>

            <div className="card-title" style={{ marginTop:16 }}>🧩 Módulos activos</div>
            {[['mesas','🪑 Mesas'],['cocina','👨‍🍳 Cocina'],['delivery','🛵 Delivery'],['bebidas','🥤 Bebidas'],['caja','💵 Caja'],['reservas','📅 Reservas']].map(([key, label]) => (
              <label key={key} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8, cursor:'pointer', fontSize:14 }}>
                <input type="checkbox" checked={form.modulos?.[key] || false} onChange={e=>setForm({...form, modulos:{...form.modulos,[key]:e.target.checked}})} />
                {label}
              </label>
            ))}
          </div>
        </div>

        {ok && <div style={{ background:'#E8F5E9', color:'var(--success)', border:'1px solid #C8E6C9', borderRadius:'var(--radius-sm)', padding:'10px 16px', marginBottom:14, fontWeight:600 }}>✅ Configuración guardada correctamente</div>}
        <button type="submit" className="btn btn-primary" disabled={guardando}>
          {guardando ? '⏳ Guardando...' : '💾 Guardar Cambios'}
        </button>
      </form>
    </div>
  )
}
