import { useEffect, useState } from 'react'
import api from '../utils/api'
import { imprimirCierreCaja } from '../utils/print'

const CATS_EGRESO = ['Ingredientes','Limpieza','Gas','Luz/Agua','Personal','Transporte','Mantenimiento','Otros']

export default function Caja() {
  const [caja, setCaja]       = useState(null)
  const [egresos, setEgresos] = useState([])
  const [tab, setTab]         = useState('caja')
  const [modalApertura, setModalApertura] = useState(false)
  const [modalCierre, setModalCierre]     = useState(false)
  const [modalEgreso, setModalEgreso]     = useState(false)
  const [apertura, setApertura]   = useState(0)
  const [cierre, setCierre]       = useState({ montoCierre:0, observaciones:'' })
  const [egreso, setEgreso]       = useState({ categoria:'Ingredientes', descripcion:'', monto:'', comprobante:'' })

  const cargar = () => {
    api.get('/caja/hoy').then(r => setCaja(r.data)).catch(()=>{})
    api.get('/egresos').then(r => setEgresos(r.data)).catch(()=>{})
  }

  useEffect(() => { cargar() }, [])

  const abrirCaja = async () => {
    try {
      await api.post('/caja/abrir', { montoApertura: Number(apertura) })
      setModalApertura(false)
      cargar()
    } catch (err) { alert(err.response?.data?.error || 'Error') }
  }

  const cerrarCaja = async () => {
    try {
      const c = await api.post('/caja/cerrar', cierre)
      setModalCierre(false)
      cargar()
      imprimirCierreCaja(c.data, egresos)
    } catch (err) { alert(err.response?.data?.error || 'Error') }
  }

  const registrarEgreso = async (e) => {
    e.preventDefault()
    try {
      await api.post('/egresos', egreso)
      setModalEgreso(false)
      setEgreso({ categoria:'Ingredientes', descripcion:'', monto:'', comprobante:'' })
      cargar()
    } catch (err) { alert(err.response?.data?.error || 'Error') }
  }

  const eliminarEgreso = async (id) => {
    if (!confirm('¿Eliminar este egreso?')) return
    await api.delete(`/egresos/${id}`)
    cargar()
  }

  const totalEgresos = egresos.reduce((s,e) => s + e.monto, 0)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Caja 💵</div>
          <div className="page-sub">
            {caja ? (caja.estado === 'abierta' ? '🟢 Caja abierta' : '🔴 Caja cerrada') : '⚪ Sin caja hoy'}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {!caja && <button className="btn btn-primary" onClick={() => setModalApertura(true)}>🔓 Abrir Caja</button>}
          {caja?.estado === 'abierta' && <>
            <button className="btn btn-ghost" onClick={() => setModalEgreso(true)}>➖ Registrar Egreso</button>
            <button className="btn btn-accent" onClick={() => setModalCierre(true)}>🔒 Cerrar Caja</button>
          </>}
          {caja?.estado === 'cerrada' && <button className="btn btn-ghost" onClick={() => imprimirCierreCaja(caja, egresos)}>🖨️ Imprimir Cierre</button>}
        </div>
      </div>

      {/* TABS */}
      <div style={{ display:'flex', gap:4, background:'var(--gray-100)', borderRadius:'var(--radius)', padding:4, marginBottom:20, width:'fit-content' }}>
        {['caja','egresos'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding:'8px 20px', borderRadius:8, border:'none', cursor:'pointer', fontWeight:600, fontSize:14, background: tab===t ? 'white' : 'transparent', boxShadow: tab===t ? 'var(--shadow-sm)' : 'none' }}>
            {t === 'caja' ? '💵 Caja' : '📤 Egresos'}
          </button>
        ))}
      </div>

      {tab === 'caja' && (
        <>
          {!caja ? (
            <div className="card" style={{ textAlign:'center', padding:60 }}>
              <div style={{ fontSize:48 }}>💵</div>
              <div style={{ fontSize:18, fontWeight:700, marginTop:12 }}>No hay caja abierta hoy</div>
              <div style={{ color:'var(--gray-500)', marginTop:4, marginBottom:20 }}>Abre la caja para registrar ventas y egresos</div>
              <button className="btn btn-primary" onClick={() => setModalApertura(true)}>🔓 Abrir Caja Ahora</button>
            </div>
          ) : (
            <div className="grid-2">
              <div className="card">
                <div className="card-title">Estado de Caja — Hoy</div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    { label:'Apertura con',    val: caja.montoApertura,   color:'var(--gray-700)' },
                    { label:'Ventas efectivo', val: caja.totalEfectivo,   color:'var(--success)' },
                    { label:'Ventas Yape',     val: caja.totalYape,       color:'var(--info)' },
                    { label:'Ventas Plin',     val: caja.totalPlin,       color:'var(--info)' },
                    { label:'Ventas tarjeta',  val: caja.totalTarjeta,    color:'var(--info)' },
                    { label:'Total ventas',    val: caja.totalVentas,     color:'var(--success)', bold:true },
                    { label:'Total egresos',   val: caja.totalEgresos || totalEgresos, color:'var(--danger)' },
                    { label:'Saldo en caja',   val: (caja.montoApertura||0) + (caja.totalEfectivo||0) - (caja.totalEgresos||totalEgresos), color:'var(--accent)', bold:true },
                  ].map((row,i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--gray-100)' }}>
                      <span style={{ fontSize:14, fontWeight: row.bold ? 700 : 400 }}>{row.label}</span>
                      <span style={{ fontWeight: row.bold ? 800 : 600, color: row.color, fontFamily: row.bold ? 'var(--font-display)' : 'inherit', fontSize: row.bold ? 16 : 14 }}>
                        S/ {(row.val||0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <div className="card-title">Últimos egresos</div>
                {!egresos.length ? (
                  <div style={{ color:'var(--gray-400)', fontSize:14, textAlign:'center', padding:20 }}>Sin egresos hoy</div>
                ) : egresos.slice(0,8).map(eg => (
                  <div key={eg._id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--gray-100)' }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600 }}>{eg.descripcion}</div>
                      <div style={{ fontSize:11, color:'var(--gray-500)' }}>{eg.categoria}</div>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <span style={{ fontWeight:700, color:'var(--danger)' }}>S/ {eg.monto.toFixed(2)}</span>
                      <button className="btn btn-danger btn-sm" onClick={() => eliminarEgreso(eg._id)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'egresos' && (
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div className="card-title" style={{ margin:0 }}>Egresos de hoy</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, color:'var(--danger)' }}>Total: S/ {totalEgresos.toFixed(2)}</div>
          </div>
          {!egresos.length ? (
            <div style={{ textAlign:'center', padding:40, color:'var(--gray-400)' }}>Sin egresos registrados hoy</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Descripción</th><th>Categoría</th><th>Comprobante</th><th>Registrado por</th><th>Monto</th><th></th></tr></thead>
                <tbody>
                  {egresos.map(eg => (
                    <tr key={eg._id}>
                      <td><strong>{eg.descripcion}</strong></td>
                      <td><span className="badge badge-warning">{eg.categoria}</span></td>
                      <td style={{ fontSize:12, color:'var(--gray-500)' }}>{eg.comprobante || '—'}</td>
                      <td style={{ fontSize:13 }}>{eg.registradoPor}</td>
                      <td><strong style={{ color:'var(--danger)' }}>S/ {eg.monto.toFixed(2)}</strong></td>
                      <td><button className="btn btn-danger btn-sm" onClick={() => eliminarEgreso(eg._id)}>Eliminar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL APERTURA */}
      {modalApertura && (
        <div className="modal-overlay" onClick={() => setModalApertura(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">🔓 Abrir Caja</div>
            <div className="form-group">
              <label className="form-label">Monto de apertura (efectivo en caja) S/</label>
              <input className="form-input" type="number" step="0.50" value={apertura} onChange={e => setApertura(e.target.value)} autoFocus />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModalApertura(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={abrirCaja}>Abrir Caja</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CIERRE */}
      {modalCierre && (
        <div className="modal-overlay" onClick={() => setModalCierre(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">🔒 Cerrar Caja</div>
            <div className="form-group">
              <label className="form-label">Monto físico contado en caja S/</label>
              <input className="form-input" type="number" step="0.50" value={cierre.montoCierre} onChange={e => setCierre({...cierre, montoCierre:Number(e.target.value)})} />
            </div>
            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea className="form-input" rows={3} value={cierre.observaciones} onChange={e => setCierre({...cierre, observaciones:e.target.value})} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModalCierre(false)}>Cancelar</button>
              <button className="btn btn-accent" onClick={cerrarCaja}>🔒 Cerrar e Imprimir</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EGRESO */}
      {modalEgreso && (
        <div className="modal-overlay" onClick={() => setModalEgreso(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">➖ Registrar Egreso</div>
            <form onSubmit={registrarEgreso}>
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select className="form-select" value={egreso.categoria} onChange={e => setEgreso({...egreso, categoria:e.target.value})}>
                  {CATS_EGRESO.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Descripción *</label>
                <input className="form-input" placeholder="¿En qué se gastó?" value={egreso.descripcion} onChange={e => setEgreso({...egreso, descripcion:e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Monto S/ *</label>
                <input className="form-input" type="number" step="0.50" min="0" value={egreso.monto} onChange={e => setEgreso({...egreso, monto:e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">N° Comprobante / Boleta</label>
                <input className="form-input" placeholder="Opcional" value={egreso.comprobante} onChange={e => setEgreso({...egreso, comprobante:e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setModalEgreso(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
