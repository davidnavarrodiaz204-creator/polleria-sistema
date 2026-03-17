import { useState } from 'react'
import { useApp } from '../context/AppContext'

const COLORES = [
  { label:'Amarillo', hex:'#F5C518', texto:'#212121' },
  { label:'Naranja',  hex:'#FF6B35', texto:'#FFFFFF' },
  { label:'Rojo',     hex:'#E53935', texto:'#FFFFFF' },
  { label:'Verde',    hex:'#43A047', texto:'#FFFFFF' },
  { label:'Azul',     hex:'#1E88E5', texto:'#FFFFFF' },
  { label:'Morado',   hex:'#8E24AA', texto:'#FFFFFF' },
  { label:'Café',     hex:'#6D4C41', texto:'#FFFFFF' },
]

export default function Configuracion() {
  const { config, guardarConfig } = useApp()
  const [form, setForm] = useState({ ...config })
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk] = useState(false)

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    await guardarConfig(form)
    setGuardando(false); setOk(true)
    setTimeout(() => setOk(false), 3000)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">Configuración ⚙️</div><div className="page-sub">Personaliza tu sistema</div></div>
      </div>

      <form onSubmit={guardar}>
        <div className="grid-2" style={{gap:20}}>
          {/* Identidad */}
          <div className="card">
            <div className="card-title">🍗 Identidad del negocio</div>
            <div className="form-group"><label className="form-label">Nombre del restaurante</label><input className="form-input" value={form.nombre||''} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Mi Pollería" /></div>
            <div className="form-group"><label className="form-label">Slogan</label><input className="form-input" value={form.slogan||''} onChange={e=>setForm(f=>({...f,slogan:e.target.value}))} placeholder="El mejor pollo del barrio" /></div>
            <div className="form-group"><label className="form-label">Logo (emoji)</label><input className="form-input" value={form.logo||''} onChange={e=>setForm(f=>({...f,logo:e.target.value}))} maxLength={4} placeholder="🍗" style={{fontSize:24}} /></div>
            <div className="form-group"><label className="form-label">RUC</label><input className="form-input" value={form.ruc||''} onChange={e=>setForm(f=>({...f,ruc:e.target.value}))} placeholder="20xxxxxxxxx" /></div>
            <div className="form-group"><label className="form-label">Dirección</label><input className="form-input" value={form.direccion||''} onChange={e=>setForm(f=>({...f,direccion:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={form.telefono||''} onChange={e=>setForm(f=>({...f,telefono:e.target.value}))} /></div>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:20}}>
            {/* Color */}
            <div className="card">
              <div className="card-title">🎨 Color principal</div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:14}}>
                {COLORES.map(c => (
                  <div key={c.hex} onClick={()=>setForm(f=>({...f,colorPrimario:c.hex,colorTexto:c.texto}))}
                    style={{width:40,height:40,borderRadius:10,background:c.hex,cursor:'pointer',border:`3px solid ${form.colorPrimario===c.hex?'#333':'transparent'}`,transform:form.colorPrimario===c.hex?'scale(1.1)':'scale(1)',transition:'all 0.15s'}} title={c.label} />
                ))}
              </div>
              <div style={{height:48,borderRadius:10,background:form.colorPrimario,display:'flex',alignItems:'center',padding:'0 16px',fontFamily:'var(--font-display)',fontSize:18,fontWeight:800,color:form.colorTexto}}>
                {form.logo||'🍗'} {form.nombre||'Mi Pollería'}
              </div>
            </div>

            {/* Módulos */}
            <div className="card">
              <div className="card-title">🧩 Módulos activos</div>
              {[
                {key:'mesas',   label:'🪑 Mesas y salón'},
                {key:'cocina',  label:'👨‍🍳 Pantalla cocina'},
                {key:'delivery',label:'🛵 Delivery'},
                {key:'bebidas', label:'🥤 Bebidas'},
                {key:'caja',    label:'💵 Caja chica'},
                {key:'reservas',label:'📅 Reservas'},
              ].map(m => (
                <label key={m.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--gray-100)',cursor:'pointer'}}>
                  <span style={{fontSize:14}}>{m.label}</span>
                  <input type="checkbox" checked={form.modulos?.[m.key]||false}
                    onChange={e=>setForm(f=>({...f,modulos:{...f.modulos,[m.key]:e.target.checked}}))}
                    style={{width:18,height:18,accentColor:'var(--primary)',cursor:'pointer'}} />
                </label>
              ))}
            </div>
          </div>
        </div>

        <div style={{marginTop:20,display:'flex',gap:10,justifyContent:'flex-end',alignItems:'center'}}>
          {ok && <span style={{color:'var(--success)',fontWeight:600}}>✅ Guardado correctamente</span>}
          <button type="submit" className="btn btn-primary" disabled={guardando} style={{padding:'12px 28px',fontSize:15}}>
            {guardando ? 'Guardando...' : '💾 Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
