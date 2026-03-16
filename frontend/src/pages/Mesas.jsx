import { useEffect, useState } from 'react'
import api from '../utils/api'
import { io } from 'socket.io-client'

const ESTADOS = { libre:{label:'Libre',cls:'mesa-libre'}, ocupada:{label:'Ocupada',cls:'mesa-ocupada'}, lista:{label:'Por pagar',cls:'mesa-lista'} }

export default function Mesas() {
  const [mesas, setMesas] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ numero:'', capacidad:'4' })

  const cargar = () => api.get('/mesas').then(r => setMesas(r.data))

  useEffect(() => {
    cargar()
    const BASE = import.meta.env.VITE_API_URL || ''
    const socket = io(BASE)
    socket.on('mesa_actualizada', () => cargar())
    return () => socket.disconnect()
  }, [])

  const cambiarEstado = async (mesa) => {
    const sig = { libre:'ocupada', ocupada:'lista', lista:'libre' }
    await api.put(`/mesas/${mesa._id}`, { estado: sig[mesa.estado] || 'libre' })
    cargar()
  }

  const agregarMesa = async (e) => {
    e.preventDefault()
    await api.post('/mesas', { numero: parseInt(form.numero), capacidad: parseInt(form.capacidad) })
    setModal(false); setForm({ numero:'', capacidad:'4' }); cargar()
  }

  const libres = mesas.filter(m => m.estado === 'libre').length
  const ocupadas = mesas.filter(m => m.estado === 'ocupada').length

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Mesas 🪑</div>
          <div className="page-sub">{libres} libres · {ocupadas} ocupadas · {mesas.length - libres - ocupadas} por pagar</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Nueva Mesa</button>
      </div>

      <div className="card">
        <div style={{display:'flex',gap:16,marginBottom:16,flexWrap:'wrap'}}>
          {Object.entries(ESTADOS).map(([k,v]) => (
            <div key={k} style={{display:'flex',alignItems:'center',gap:6,fontSize:13}}>
              <div style={{width:12,height:12,borderRadius:3,background:k==='libre'?'#A5D6A7':k==='ocupada'?'var(--primary)':'#F48FB1'}}/>
              {v.label}
            </div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:12}}>
          {mesas.map(m => (
            <div key={m._id} className={`mesa-card mesa-${m.estado}`} onClick={() => cambiarEstado(m)}>
              <div className="mesa-num">{m.numero}</div>
              <div className="mesa-est">{ESTADOS[m.estado]?.label || m.estado}</div>
              <div className="mesa-cap">👥 {m.capacidad}</div>
              {m.mozo && <div className="mesa-mozo">{m.mozo.split(' ')[0]}</div>}
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-title">➕ Nueva Mesa</div>
            <form onSubmit={agregarMesa}>
              <div className="form-group"><label className="form-label">Número</label><input className="form-input" type="number" value={form.numero} onChange={e=>setForm(f=>({...f,numero:e.target.value}))} required autoFocus /></div>
              <div className="form-group"><label className="form-label">Capacidad</label><input className="form-input" type="number" value={form.capacidad} onChange={e=>setForm(f=>({...f,capacidad:e.target.value}))} /></div>
              <div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button><button type="submit" className="btn btn-primary">Agregar</button></div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .mesa-card{border-radius:var(--radius);padding:14px 10px;text-align:center;cursor:pointer;border:2px solid transparent;transition:all 0.15s;}
        .mesa-card:hover{transform:translateY(-2px);box-shadow:var(--shadow-md);}
        .mesa-libre{background:#E8F5E9;border-color:#A5D6A7;}
        .mesa-ocupada{background:#FFF9C4;border-color:var(--primary);}
        .mesa-lista{background:#FCE4EC;border-color:#F48FB1;}
        .mesa-num{font-family:var(--font-display);font-size:24px;font-weight:800;}
        .mesa-libre .mesa-num{color:#2E7D32;}.mesa-ocupada .mesa-num{color:#E65100;}.mesa-lista .mesa-num{color:#880E4F;}
        .mesa-est{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;}
        .mesa-libre .mesa-est{color:#388E3C;}.mesa-ocupada .mesa-est{color:#F57C00;}.mesa-lista .mesa-est{color:#C2185B;}
        .mesa-cap{font-size:11px;color:var(--gray-500);margin-top:2px;}
        .mesa-mozo{font-size:11px;color:var(--gray-600);font-weight:600;margin-top:2px;}
      `}</style>
    </div>
  )
}
