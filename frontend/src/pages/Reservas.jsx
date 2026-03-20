/**
 * Reservas.jsx — Gestión de reservas con búsqueda de cliente por DNI/RUC
 * Autor: David Navarro Diaz
 */
import { useEffect, useState } from 'react'
import api from '../utils/api'

const HORAS = ['11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30',
               '18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00']
const ESTADOS = ['pendiente','confirmada','cancelada','completada']
const COLOR   = { pendiente:'badge-warning', confirmada:'badge-success', cancelada:'badge-danger', completada:'badge-info' }

const FORM_VACIO = { fecha:'', hora:'13:00', nombre:'', celular:'', personas:2, mesaNumero:'', nota:'', estado:'pendiente', numDoc:'' }

export default function Reservas() {
  const [reservas, setReservas] = useState([])
  const [modal, setModal]       = useState(false)
  const hoy = new Date().toISOString().split('T')[0]
  const [fecha, setFecha]       = useState(hoy)
  const [form, setForm]         = useState({ ...FORM_VACIO, fecha: hoy })
  const [consultando, setConsultando] = useState(false)
  const [msgDoc, setMsgDoc]     = useState('')

  const cargar = (f = fecha) =>
    api.get('/reservas?fecha=' + f).then(r => setReservas(r.data)).catch(()=>{})

  useEffect(() => { cargar() }, [fecha])

  // Buscar cliente por DNI o RUC al escribir el documento
  const consultarDoc = async (num) => {
    const limpio = num.replace(/\D/g, '')
    setForm(f => ({ ...f, numDoc: limpio }))
    setMsgDoc('')
    if (limpio.length !== 8 && limpio.length !== 11) return
    setConsultando(true)
    try {
      const { data } = await api.get('/clientes/consultar/' + limpio)
      setForm(f => ({
        ...f,
        nombre:  data.nombre  || f.nombre,
        celular: data.celular || f.celular,
      }))
      setMsgDoc(data.fuenteLocal
        ? '✅ Cliente frecuente encontrado'
        : '✅ Datos cargados de SUNAT/RENIEC')
    } catch {
      setMsgDoc('No encontrado — completa manualmente')
    } finally { setConsultando(false) }
  }

  const guardar = async (e) => {
    e.preventDefault()
    try {
      await api.post('/reservas', form)
      setModal(false)
      setForm({ ...FORM_VACIO, fecha })
      setMsgDoc('')
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

  const abrirModal = () => {
    setForm({ ...FORM_VACIO, fecha })
    setMsgDoc('')
    setModal(true)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Reservas</div>
          <div className="page-sub">{reservas.length} reservas para {fecha === hoy ? 'hoy' : fecha}</div>
        </div>
        <button className="btn btn-primary" onClick={abrirModal}>+ Nueva Reserva</button>
      </div>

      {/* Selector de fecha */}
      <div className="card" style={{marginBottom:16,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <label className="form-label" style={{margin:0}}>Ver fecha:</label>
        <input type="date" className="form-input" value={fecha}
          onChange={e=>setFecha(e.target.value)} style={{width:160}}/>
        <button className="btn btn-ghost btn-sm" onClick={()=>setFecha(hoy)}>Hoy</button>
        <button className="btn btn-ghost btn-sm" onClick={()=>{
          const d=new Date(fecha); d.setDate(d.getDate()+1)
          setFecha(d.toISOString().split('T')[0])
        }}>Siguiente →</button>
        <button className="btn btn-ghost btn-sm" onClick={()=>{
          const d=new Date(fecha); d.setDate(d.getDate()-1)
          setFecha(d.toISOString().split('T')[0])
        }}>← Anterior</button>
      </div>

      {/* Lista */}
      {!reservas.length ? (
        <div className="card" style={{textAlign:'center',padding:40}}>
          <div style={{fontSize:36}}>📅</div>
          <div style={{fontSize:16,fontWeight:700,marginTop:12}}>Sin reservas para este día</div>
          <button className="btn btn-primary" style={{marginTop:16}} onClick={abrirModal}>+ Agregar</button>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {reservas.sort((a,b)=>a.hora.localeCompare(b.hora)).map(r=>(
            <div key={r._id} className="card" style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
              <div style={{fontSize:22,fontWeight:800,color:'var(--accent)',minWidth:56,textAlign:'center'}}>{r.hora}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:16}}>{r.nombre}</div>
                <div style={{fontSize:13,color:'var(--gray-600)'}}>
                  👥 {r.personas} personas
                  {r.celular&&` · 📱 ${r.celular}`}
                  {r.mesaNumero&&` · 🪑 Mesa ${r.mesaNumero}`}
                  {r.nota&&` · 📝 ${r.nota}`}
                </div>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                <span className={`badge ${COLOR[r.estado]}`}>{r.estado}</span>
                {r.estado==='pendiente'&&(
                  <button className="btn btn-primary btn-sm" onClick={()=>cambiarEstado(r._id,'confirmada')}>Confirmar</button>
                )}
                {r.estado==='confirmada'&&(
                  <button className="btn btn-ghost btn-sm" onClick={()=>cambiarEstado(r._id,'completada')}>✓ Completada</button>
                )}
                <button className="btn btn-danger btn-sm" onClick={()=>eliminar(r._id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal nueva reserva */}
      {modal && (
        <div className="modal-overlay" onClick={()=>setModal(false)}>
          <div className="modal" style={{maxWidth:480}} onClick={e=>e.stopPropagation()}>
            <div className="modal-title">Nueva Reserva</div>
            <form onSubmit={guardar}>
              {/* DNI/RUC para autocompletar */}
              <div className="form-group">
                <label className="form-label">
                  DNI / RUC del cliente (opcional)
                  {consultando && <span style={{color:'var(--info)',fontSize:11,marginLeft:8}}>consultando...</span>}
                </label>
                <input className="form-input" value={form.numDoc}
                  onChange={e=>consultarDoc(e.target.value)}
                  placeholder="Ingresa DNI (8 dígitos) o RUC (11 dígitos)" maxLength={11}/>
                {msgDoc && (
                  <div style={{fontSize:12,marginTop:4,color:msgDoc.startsWith('✅')?'var(--success)':'var(--gray-500)',fontWeight:600}}>
                    {msgDoc}
                  </div>
                )}
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Fecha *</label>
                  <input type="date" className="form-input" value={form.fecha}
                    onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} required/>
                </div>
                <div className="form-group">
                  <label className="form-label">Hora *</label>
                  <select className="form-select" value={form.hora}
                    onChange={e=>setForm(f=>({...f,hora:e.target.value}))}>
                    {HORAS.map(h=><option key={h}>{h}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input className="form-input" value={form.nombre}
                  onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} required
                  placeholder="Nombre completo"/>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Celular</label>
                  <input className="form-input" value={form.celular}
                    onChange={e=>setForm(f=>({...f,celular:e.target.value}))} placeholder="987654321"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Personas</label>
                  <input type="number" className="form-input" value={form.personas}
                    onChange={e=>setForm(f=>({...f,personas:Number(e.target.value)}))} min="1" max="50"/>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Mesa (opcional)</label>
                  <input type="number" className="form-input" value={form.mesaNumero}
                    onChange={e=>setForm(f=>({...f,mesaNumero:e.target.value}))} placeholder="Nro mesa" min="1"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Estado inicial</label>
                  <select className="form-select" value={form.estado}
                    onChange={e=>setForm(f=>({...f,estado:e.target.value}))}>
                    {ESTADOS.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Nota</label>
                <input className="form-input" value={form.nota}
                  onChange={e=>setForm(f=>({...f,nota:e.target.value}))}
                  placeholder="Cumpleaños, alergias, zona preferida..."/>
              </div>
              <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
                <button type="button" className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Reserva</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
