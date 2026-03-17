import { useEffect, useState } from 'react'
import api from '../utils/api'
import { imprimirCierreCaja, imprimirBoleta } from '../utils/print'
import { useApp } from '../context/AppContext'

const CATS_EGRESO = ['Ingredientes','Limpieza','Gas','Luz/Agua','Personal','Transporte','Mantenimiento','Otros']

const COMPROBANTES = [
  { value:'ticket',       label:'Ticket de venta' },
  { value:'boleta',       label:'Boleta de venta' },
  { value:'factura',      label:'Factura' },
  { value:'nota_credito', label:'Nota de credito' },
]

const METODOS = [
  { value:'efectivo',      label:'Efectivo',      icon:'billete' },
  { value:'yape',          label:'Yape',           icon:'movil' },
  { value:'plin',          label:'Plin',           icon:'movil' },
  { value:'tarjeta',       label:'Tarjeta',        icon:'tarjeta' },
  { value:'transferencia', label:'Transferencia',  icon:'banco' },
]

export default function Caja() {
  const { config } = useApp()
  const [caja, setCaja]           = useState(null)
  const [egresos, setEgresos]     = useState([])
  const [pedidos, setPedidos]     = useState([])
  const [tab, setTab]             = useState('cobrar')

  // Modales
  const [modalApertura, setModalApertura] = useState(false)
  const [modalCierre, setModalCierre]     = useState(false)
  const [modalEgreso, setModalEgreso]     = useState(false)
  const [modalCobro, setModalCobro]       = useState(null) // pedido seleccionado

  const [apertura, setApertura] = useState(0)
  const [cierre, setCierre]     = useState({ montoCierre:0, observaciones:'' })
  const [egreso, setEgreso]     = useState({ categoria:'Ingredientes', descripcion:'', monto:'', comprobante:'' })

  // Form de cobro
  const [cobro, setCobro] = useState({ metodoPago:'efectivo', tipoComprobante:'ticket', ruc:'', razonSocial:'', efectivoRecibido:0 })

  const cargar = () => {
    api.get('/caja/hoy').then(r => setCaja(r.data)).catch(()=>{})
    api.get('/egresos').then(r => setEgresos(r.data)).catch(()=>{})
    api.get('/pedidos').then(r => setPedidos(r.data.filter(p => !p.pagado && p.estado !== 'cancelado'))).catch(()=>{})
  }

  useEffect(() => { cargar() }, [])

  // Recalcular vuelto
  const vuelto = cobro.metodoPago === 'efectivo'
    ? Math.max(0, Number(cobro.efectivoRecibido) - (modalCobro?.total || 0))
    : 0

  const abrirCaja = async () => {
    try {
      await api.post('/caja/abrir', { montoApertura: Number(apertura) })
      setModalApertura(false); cargar()
    } catch (err) { alert(err.response?.data?.error || 'Error') }
  }

  const cerrarCaja = async () => {
    try {
      const { data } = await api.post('/caja/cerrar', cierre)
      setModalCierre(false); cargar()
      imprimirCierreCaja(data, egresos)
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

  const cobrarPedido = async () => {
    if (!modalCobro) return
    try {
      // Marcar pedido como pagado
      await api.put('/pedidos/' + modalCobro._id, {
        pagado: true,
        metodoPago: cobro.metodoPago,
        estado: 'entregado',
      })
      // Liberar mesa si aplica
      if (modalCobro.mesaId) {
        await api.put('/mesas/' + modalCobro.mesaId, { estado:'libre', mozo:null, pedidoActual:null })
      }
      // Imprimir comprobante
      imprimirBoleta({
        ...modalCobro,
        tipoComprobante: cobro.tipoComprobante,
        ruc: cobro.ruc,
        razonSocial: cobro.razonSocial,
        metodoPago: cobro.metodoPago,
        vuelto,
      }, config)

      setModalCobro(null)
      cargar()
    } catch (err) { alert(err.response?.data?.error || 'Error al cobrar') }
  }

  const eliminarEgreso = async (id) => {
    if (!confirm('Eliminar egreso?')) return
    await api.delete('/egresos/' + id); cargar()
  }

  const totalEgresos = egresos.reduce((s, e) => s + e.monto, 0)

  const TABS = [
    { key:'cobrar',  label:'Cobrar mesa' },
    { key:'caja',    label:'Estado caja' },
    { key:'egresos', label:'Egresos' },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Caja</div>
          <div className="page-sub">
            {caja ? (caja.estado==='abierta' ? 'Caja abierta' : 'Caja cerrada') : 'Sin caja hoy'}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {!caja && <button className="btn btn-primary" onClick={()=>setModalApertura(true)}>Abrir Caja</button>}
          {caja?.estado==='abierta' && <>
            <button className="btn btn-ghost" onClick={()=>setModalEgreso(true)}>Registrar Egreso</button>
            <button className="btn btn-accent" onClick={()=>setModalCierre(true)}>Cerrar Caja</button>
          </>}
          {caja?.estado==='cerrada' && (
            <button className="btn btn-ghost" onClick={()=>imprimirCierreCaja(caja, egresos)}>Imprimir Cierre</button>
          )}
        </div>
      </div>

      {/* TABS */}
      <div style={{ display:'flex', gap:4, background:'var(--gray-100)', borderRadius:'var(--radius)', padding:4, marginBottom:20, width:'fit-content', flexWrap:'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={()=>setTab(t.key)} style={{
            padding:'8px 18px', borderRadius:8, border:'none', cursor:'pointer',
            fontWeight:600, fontSize:14,
            background: tab===t.key ? 'white' : 'transparent',
            boxShadow:  tab===t.key ? 'var(--shadow-sm)' : 'none',
          }}>{t.label}</button>
        ))}
      </div>

      {/* TAB: COBRAR */}
      {tab==='cobrar' && (
        <div>
          {!caja ? (
            <div className="card" style={{ textAlign:'center', padding:40 }}>
              <div style={{ fontSize:42 }}>caja</div>
              <div style={{ fontSize:17, fontWeight:700, marginTop:12 }}>Abre la caja primero</div>
              <button className="btn btn-primary" style={{ marginTop:16 }} onClick={()=>setModalApertura(true)}>Abrir Caja</button>
            </div>
          ) : pedidos.length === 0 ? (
            <div className="card" style={{ textAlign:'center', padding:40 }}>
              <div style={{ fontSize:42 }}>ok</div>
              <div style={{ fontSize:17, fontWeight:700, marginTop:12 }}>Sin pedidos pendientes de cobro</div>
              <div style={{ color:'var(--gray-500)', marginTop:6 }}>Todos los pedidos estan pagados</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {pedidos.map(p => (
                <div key={p._id} className="card" style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4, flexWrap:'wrap' }}>
                      <span style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800 }}>
                        {p.tipo==='mesa' ? 'Mesa ' + p.mesaNumero : p.tipo==='delivery' ? 'Delivery' : 'Para llevar'}
                      </span>
                      <span className="badge badge-warning">Pedido #{p.numero}</span>
                      {p.mozo && <span style={{ fontSize:12, color:'var(--gray-500)' }}>Mozo: {p.mozo}</span>}
                    </div>
                    <div style={{ fontSize:13, color:'var(--gray-600)' }}>
                      {p.items?.map(i => i.cantidad + 'x ' + i.nombre).join(' · ')}
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:800, color:'var(--accent)' }}>
                      S/ {p.total?.toFixed(2)}
                    </div>
                    <button className="btn btn-primary btn-sm" style={{ marginTop:6 }}
                      onClick={()=>{ setModalCobro(p); setCobro({ metodoPago:'efectivo', tipoComprobante:'ticket', ruc:'', razonSocial:'', efectivoRecibido: p.total }) }}>
                      Cobrar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: ESTADO CAJA */}
      {tab==='caja' && (
        <>
          {!caja ? (
            <div className="card" style={{ textAlign:'center', padding:60 }}>
              <div style={{ fontSize:48 }}>caja</div>
              <div style={{ fontSize:18, fontWeight:700, marginTop:12 }}>No hay caja abierta hoy</div>
              <button className="btn btn-primary" style={{ marginTop:16 }} onClick={()=>setModalApertura(true)}>Abrir Caja</button>
            </div>
          ) : (
            <div className="grid-2">
              <div className="card">
                <div className="card-title">Estado de Caja - Hoy</div>
                {[
                  { label:'Apertura con',     val: caja.montoApertura,  color:'var(--gray-700)' },
                  { label:'Ventas efectivo',  val: caja.totalEfectivo,  color:'var(--success)' },
                  { label:'Ventas Yape',      val: caja.totalYape,      color:'var(--info)' },
                  { label:'Ventas Plin',      val: caja.totalPlin,      color:'var(--info)' },
                  { label:'Ventas tarjeta',   val: caja.totalTarjeta,   color:'var(--info)' },
                  { label:'Total ventas',     val: caja.totalVentas,    color:'var(--success)', bold:true },
                  { label:'Total egresos',    val: caja.totalEgresos||totalEgresos, color:'var(--danger)' },
                  { label:'Saldo en caja',    val: (caja.montoApertura||0)+(caja.totalEfectivo||0)-(caja.totalEgresos||totalEgresos), color:'var(--accent)', bold:true },
                ].map((row,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--gray-100)' }}>
                    <span style={{ fontSize:14, fontWeight: row.bold?700:400 }}>{row.label}</span>
                    <span style={{ fontWeight: row.bold?800:600, color:row.color, fontSize: row.bold?16:14 }}>
                      S/ {(row.val||0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="card-title">Ultimos egresos</div>
                {!egresos.length ? (
                  <div style={{ color:'var(--gray-400)', textAlign:'center', padding:20 }}>Sin egresos hoy</div>
                ) : egresos.slice(0,8).map(eg => (
                  <div key={eg._id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--gray-100)' }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600 }}>{eg.descripcion}</div>
                      <div style={{ fontSize:11, color:'var(--gray-500)' }}>{eg.categoria}</div>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <span style={{ fontWeight:700, color:'var(--danger)' }}>S/ {eg.monto.toFixed(2)}</span>
                      <button className="btn btn-danger btn-sm" onClick={()=>eliminarEgreso(eg._id)}>x</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB: EGRESOS */}
      {tab==='egresos' && (
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div className="card-title" style={{ margin:0 }}>Egresos de hoy</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, color:'var(--danger)' }}>
              Total: S/ {totalEgresos.toFixed(2)}
            </div>
          </div>
          {!egresos.length ? (
            <div style={{ textAlign:'center', padding:40, color:'var(--gray-400)' }}>Sin egresos registrados hoy</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Descripcion</th><th>Categoria</th><th>Comprobante</th><th>Por</th><th>Monto</th><th></th></tr>
                </thead>
                <tbody>
                  {egresos.map(eg => (
                    <tr key={eg._id}>
                      <td><strong>{eg.descripcion}</strong></td>
                      <td><span className="badge badge-warning">{eg.categoria}</span></td>
                      <td style={{ fontSize:12, color:'var(--gray-500)' }}>{eg.comprobante||'-'}</td>
                      <td style={{ fontSize:13 }}>{eg.registradoPor}</td>
                      <td><strong style={{ color:'var(--danger)' }}>S/ {eg.monto.toFixed(2)}</strong></td>
                      <td><button className="btn btn-danger btn-sm" onClick={()=>eliminarEgreso(eg._id)}>Eliminar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL COBRAR ── */}
      {modalCobro && (
        <div className="modal-overlay" onClick={()=>setModalCobro(null)}>
          <div className="modal" style={{ maxWidth:480 }} onClick={e=>e.stopPropagation()}>
            <div className="modal-title">Cobrar pedido</div>

            {/* Resumen */}
            <div style={{ background:'var(--gray-50)', borderRadius:'var(--radius-sm)', padding:'12px 14px', marginBottom:16 }}>
              <div style={{ fontWeight:700, marginBottom:6 }}>
                {modalCobro.tipo==='mesa' ? 'Mesa '+modalCobro.mesaNumero : 'Para llevar'} — Pedido #{modalCobro.numero}
              </div>
              {modalCobro.items?.map((it,i) => (
                <div key={i} style={{ fontSize:13, color:'var(--gray-600)', display:'flex', justifyContent:'space-between' }}>
                  <span>{it.cantidad}x {it.nombre}</span>
                  <span>S/ {(it.precio*it.cantidad).toFixed(2)}</span>
                </div>
              ))}
              <div style={{ borderTop:'1px dashed var(--gray-300)', marginTop:8, paddingTop:8, display:'flex', justifyContent:'space-between', fontWeight:800, fontSize:18, fontFamily:'var(--font-display)' }}>
                <span>TOTAL</span>
                <span style={{ color:'var(--accent)' }}>S/ {modalCobro.total?.toFixed(2)}</span>
              </div>
            </div>

            {/* Tipo comprobante */}
            <div className="form-group">
              <label className="form-label">Tipo de comprobante</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {COMPROBANTES.map(c => (
                  <button key={c.value} type="button"
                    onClick={()=>setCobro(prev=>({...prev, tipoComprobante:c.value}))}
                    style={{
                      padding:'10px 8px', borderRadius:'var(--radius-sm)', fontSize:13, fontWeight:600,
                      cursor:'pointer', border:'2px solid',
                      borderColor: cobro.tipoComprobante===c.value ? 'var(--primary)' : 'var(--gray-300)',
                      background:  cobro.tipoComprobante===c.value ? 'var(--primary-light)' : 'white',
                    }}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* RUC si es factura */}
            {cobro.tipoComprobante==='factura' && (
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">RUC</label>
                  <input className="form-input" placeholder="20123456789" value={cobro.ruc}
                    onChange={e=>setCobro(prev=>({...prev, ruc:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Razon social</label>
                  <input className="form-input" placeholder="Empresa SAC" value={cobro.razonSocial}
                    onChange={e=>setCobro(prev=>({...prev, razonSocial:e.target.value}))} />
                </div>
              </div>
            )}

            {/* Metodo de pago */}
            <div className="form-group">
              <label className="form-label">Metodo de pago</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {METODOS.map(m => (
                  <button key={m.value} type="button"
                    onClick={()=>setCobro(prev=>({...prev, metodoPago:m.value, efectivoRecibido: m.value==='efectivo'?modalCobro.total:0}))}
                    style={{
                      padding:'10px 6px', borderRadius:'var(--radius-sm)', fontSize:13, fontWeight:600,
                      cursor:'pointer', border:'2px solid',
                      borderColor: cobro.metodoPago===m.value ? 'var(--primary)' : 'var(--gray-300)',
                      background:  cobro.metodoPago===m.value ? 'var(--primary)' : 'white',
                    }}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Efectivo recibido y vuelto */}
            {cobro.metodoPago==='efectivo' && (
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Efectivo recibido S/</label>
                  <input className="form-input" type="number" step="0.50" value={cobro.efectivoRecibido}
                    onChange={e=>setCobro(prev=>({...prev, efectivoRecibido:Number(e.target.value)}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Vuelto S/</label>
                  <div style={{ padding:'10px 12px', background: vuelto>0?'#E8F5E9':'var(--gray-100)', borderRadius:'var(--radius-sm)', fontFamily:'var(--font-display)', fontSize:20, fontWeight:800, color: vuelto>0?'var(--success)':'var(--gray-500)' }}>
                    S/ {vuelto.toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={()=>setModalCobro(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ fontSize:15 }} onClick={cobrarPedido}>
                Cobrar e Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL APERTURA ── */}
      {modalApertura && (
        <div className="modal-overlay" onClick={()=>setModalApertura(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">Abrir Caja</div>
            <div className="form-group">
              <label className="form-label">Monto de apertura (efectivo en caja) S/</label>
              <input className="form-input" type="number" step="0.50" value={apertura}
                onChange={e=>setApertura(e.target.value)} autoFocus />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={()=>setModalApertura(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={abrirCaja}>Abrir Caja</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CIERRE ── */}
      {modalCierre && (
        <div className="modal-overlay" onClick={()=>setModalCierre(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">Cerrar Caja</div>
            <div className="form-group">
              <label className="form-label">Monto fisico contado en caja S/</label>
              <input className="form-input" type="number" step="0.50" value={cierre.montoCierre}
                onChange={e=>setCierre({...cierre, montoCierre:Number(e.target.value)})} />
            </div>
            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea className="form-input" rows={3} value={cierre.observaciones}
                onChange={e=>setCierre({...cierre, observaciones:e.target.value})} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={()=>setModalCierre(false)}>Cancelar</button>
              <button className="btn btn-accent" onClick={cerrarCaja}>Cerrar e Imprimir</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EGRESO ── */}
      {modalEgreso && (
        <div className="modal-overlay" onClick={()=>setModalEgreso(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">Registrar Egreso</div>
            <form onSubmit={registrarEgreso}>
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select className="form-select" value={egreso.categoria} onChange={e=>setEgreso({...egreso, categoria:e.target.value})}>
                  {CATS_EGRESO.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Descripcion *</label>
                <input className="form-input" placeholder="En que se gasto?" value={egreso.descripcion}
                  onChange={e=>setEgreso({...egreso, descripcion:e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Monto S/ *</label>
                <input className="form-input" type="number" step="0.50" min="0" value={egreso.monto}
                  onChange={e=>setEgreso({...egreso, monto:e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">N comprobante / Boleta</label>
                <input className="form-input" placeholder="Opcional" value={egreso.comprobante}
                  onChange={e=>setEgreso({...egreso, comprobante:e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={()=>setModalEgreso(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
