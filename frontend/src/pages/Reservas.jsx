/**
 * Reservas.jsx — Gestión de reservas de mesa
 * Autor: David Navarro Diaz
 */
import { useEffect, useState } from 'react'
import api from '../utils/api'

const ESTADOS = ['pendiente','confirmada','cancelada','completada']
const HORAS   = ['11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00']

export default function Reservas() {
  const [reservas, setReservas] = useState([])
  const [modal, setModal]       = useState(false)
  const hoy = new Date().toISOString().split('T')[0]
  const [fecha, setFecha]       = useState(hoy)
  const [form, setForm]         = useState({ fecha:hoy, hora:'13:00', nombre:'', celular:'', personas:2, mesaNumero:'', nota:'', estado:'pendiente' })

  const cargar = (f = fecha) => {
    api.get('/reservas?fecha=' + f).then(r => setReservas(r.data)).catch(() => {})
  }

  useEffect(() => { cargar() }, [fecha])

  const guardar = async (e) => {
    e.preventDefault()
    try {
      await api.post('/reservas', form)
      setModal(false)
      setForm({ fecha, hora:'13:00', nombre:'', celular:'', personas:2, mesaNumero:'', nota:'', estado:'pendiente' })
      cargar()
    } catch (err) { alert(err.response?.data?.error || 'Error') }
  }

  const cambiarEstado = async (id, estado) => {
    await api.put('/reservas/' + id, { estado })
    cargar()
  }

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar reserva?')) return
    await api.delete('/reservas/' + id)
    cargar()
  }

  const colorEstado = { pendiente:'badge-warning', confirmada:'badge-success', cancelada:'badge-danger', completada:'badge-info' }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Reservas</div>
          <div className="page-sub">{reservas.length} reservas para {fecha === hoy ? 'hoy' : fecha}</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(f=>({...f, fecha})); setModal(true) }}>
          + Nueva Reserva
        </button>
      </div>

      {/* Selector de fecha */}
      <div className="card" style={{ marginBottom:16, display:'flex', alignItems:'center', gap:12 }}>
        <label className="form-label" style={{ margin:0 }}>Ver fecha:</label>
        <input type="date" className="form-input" value={fecha}
          onChange={e => setFecha(e.target.value)} style={{ width:160 }} />
        <button className="btn btn-ghost btn-sm" onClick={() => setFecha(hoy)}>Hoy</button>
        <button className="btn btn-ghost btn-sm" onClick={() => {
          const d = new Date(fecha); d.setDate(d.getDate()+1)
          setFecha(d.toISOString().split('T')[0])
        }}>Mañana →</button>
      </div>

      {/* Lista de reservas */}
      {!reservas.length ? (
        <div className="card" style={{ textAlign:'center', padding:40 }}>
          <div style={{ fontSize:36 }}>📅</div>
          <div style={{ fontSize:16, fontWeight:700, marginTop:12 }}>Sin reservas para este día</div>
          <button className="btn btn-primary" style={{ marginTop:16 }} onClick={() => setModal(true)}>
            + Agregar reserva
          </button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {reservas.sort((a,b) => a.hora.localeCompare(b.hora)).map(r => (
            <div key={r._id} className="card" style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
              <div style={{ fontSize:24, fontWeight:800, color:'var(--accent)', minWidth:56, textAlign:'center' }}>
                {r.hora}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:16 }}>{r.nombre}</div>
                <div style={{ fontSize:13, color:'var(--gray-600)' }}>
                  👥 {r.personas} personas
                  {r.celular && ` · 📱 ${r.celular}`}
                  {r.mesaNumero && ` · 🪑 Mesa ${r.mesaNumero}`}
                  {r.nota && ` · 📝 ${r.nota}`}
                </div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                <span className={`badge ${colorEstado[r.estado]}`}>{r.estado}</span>
                {r.estado === 'pendiente' && (
                  <button className="btn btn-primary btn-sm" onClick={() => cambiarEstado(r._id, 'confirmada')}>
                    Confirmar
                  </button>
                )}
                {r.estado === 'confirmada' && (
                  <button className="btn btn-ghost btn-sm" onClick={() => cambiarEstado(r._id, 'completada')}>
                    Completada
                  </button>
                )}
                <button className="btn btn-danger btn-sm" onClick={() => eliminar(r._id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal nueva reserva */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" style={{ maxWidth:460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">Nueva Reserva</div>
            <form onSubmit={guardar}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Fecha *</label>
                  <input type="date" className="form-input" value={form.fecha}
                    onChange={e => setForm(f=>({...f, fecha:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Hora *</label>
                  <select className="form-select" value={form.hora}
                    onChange={e => setForm(f=>({...f, hora:e.target.value}))}>
                    {HORAS.map(h => <option key={h}>{h}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Nombre del cliente *</label>
                <input className="form-input" value={form.nombre}
                  onChange={e => setForm(f=>({...f, nombre:e.target.value}))} required
                  placeholder="Ej: Juan Pérez" />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Celular</label>
                  <input className="form-input" value={form.celular}
                    onChange={e => setForm(f=>({...f, celular:e.target.value}))}
                    placeholder="987654321" />
                </div>
                <div className="form-group">
                  <label className="form-label">Personas</label>
                  <input type="number" className="form-input" value={form.personas}
                    onChange={e => setForm(f=>({...f, personas:Number(e.target.value)}))}
                    min="1" max="30" />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Mesa (opcional)</label>
                  <input type="number" className="form-input" value={form.mesaNumero}
                    onChange={e => setForm(f=>({...f, mesaNumero:e.target.value}))}
                    placeholder="Nro de mesa" min="1" />
                </div>
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select className="form-select" value={form.estado}
                    onChange={e => setForm(f=>({...f, estado:e.target.value}))}>
                    {ESTADOS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Nota (opcional)</label>
                <input className="form-input" value={form.nota}
                  onChange={e => setForm(f=>({...f, nota:e.target.value}))}
                  placeholder="Cumpleaños, alergias, preferencias..." />
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Reserva</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
