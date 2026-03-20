import { useEffect, useState, useCallback } from 'react'
import api from '../utils/api'
import { imprimirCierreCaja, imprimirBoleta } from '../utils/print'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'

const CATS_EGRESO  = ['Ingredientes','Limpieza','Gas','Luz/Agua','Personal','Transporte','Mantenimiento','Otros']
const COMPROBANTES = [
  { value:'ticket',  label:'Ticket'  },
  { value:'boleta',  label:'Boleta'  },
  { value:'factura', label:'Factura' },
  // Nota de Crédito se emite desde la sección Nota de Crédito, no desde el cobro
]
const METODOS = [
  { value:'efectivo',     label:'Efectivo' },
  { value:'yape',         label:'Yape' },
  { value:'plin',         label:'Plin' },
  { value:'tarjeta',      label:'Tarjeta' },
  { value:'transferencia',label:'Transf.' },
]

export default function Caja() {
  const { config } = useApp()
  const { usuario } = useAuth()
  const esAdmin = usuario?.rol === 'admin'
  const [caja, setCaja]         = useState(null)
  const [egresos, setEgresos]   = useState([])
  const [pedidos, setPedidos]   = useState([])
  const [tab, setTab]           = useState('cobrar')

  const [modalApertura, setModalApertura] = useState(false)
  const [modalCierre, setModalCierre]     = useState(false)
  const [modalEgreso, setModalEgreso]     = useState(false)
  const [modalCobro, setModalCobro]       = useState(null)

  const [apertura, setApertura] = useState(0)
  const [cierre, setCierre]     = useState({ montoCierre:0, observaciones:'' })
  const [egreso, setEgreso]     = useState({ categoria:'Ingredientes', descripcion:'', monto:'', comprobante:'' })

  // Estado del cobro
  const [cobro, setCobro] = useState({
    metodoPago:'efectivo', tipoComprobante:'ticket',
    numDoc:'', nombre:'', razonSocial:'', direccion:'',
    celular:'', aceptaPromo:true, clienteId:null,
    efectivoRecibido:0,
  })
  const [consultando, setConsultando] = useState(false)
  const [msgDoc, setMsgDoc]           = useState('')
  const [emitiendo, setEmitiendo]     = useState(false)
  const [comprobanteEmitido, setComprobanteEmitido] = useState(null)

  const cargar = useCallback(() => {
    api.get('/caja/hoy').then(r => setCaja(r.data)).catch(() => {})
    api.get('/egresos').then(r => setEgresos(r.data)).catch(() => {})
    api.get('/pedidos').then(r => setPedidos(
      r.data.filter(p => !p.pagado && !['cancelado'].includes(p.estado))
    )).catch(() => {})
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const vuelto = cobro.metodoPago === 'efectivo'
    ? Math.max(0, Number(cobro.efectivoRecibido) - (modalCobro?.total || 0))
    : 0

  // Consultar RUC/DNI automáticamente
  const consultarDoc = async (num) => {
    const limpio = num.replace(/\D/g, '')
    setCobro(prev => ({ ...prev, numDoc: limpio, nombre:'', razonSocial:'', direccion:'', clienteId:null }))
    setMsgDoc('')
    if (limpio.length !== 8 && limpio.length !== 11) return
    setConsultando(true)
    try {
      const { data } = await api.get('/clientes/consultar/' + limpio)
      setCobro(prev => ({
        ...prev,
        clienteId:    data._id    || null,
        nombre:       data.nombre || 'Clientes Varios',
        razonSocial:  data.razonSocial || '',
        direccion:    data.direccion   || '',
        celular:      data.celular     || '',
        aceptaPromo:  data.aceptaPromo ?? true,
        tipoComprobante: (limpio.length === 11) ? 'factura' : prev.tipoComprobante,
      }))
      setMsgDoc(data.fuenteLocal
        ? 'Cliente frecuente encontrado.'
        : data.apiError
          ? 'No se encontró. Completa manualmente.'
          : 'Datos cargados de SUNAT/RENIEC.')
    } catch {
      setMsgDoc('Error al consultar. Completa manualmente.')
    } finally {
      setConsultando(false)
    }
  }

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
      // Guardar o actualizar cliente si tiene documento
      let clienteId = cobro.clienteId
      if (cobro.numDoc && cobro.nombre) {
        const { data: cl } = await api.post('/clientes', {
          tipoDoc:    cobro.numDoc.length === 8 ? 'dni' : 'ruc',
          numDoc:     cobro.numDoc,
          nombre:     cobro.nombre,
          razonSocial:cobro.razonSocial,
          direccion:  cobro.direccion,
          celular:    cobro.celular,
          aceptaPromo:cobro.aceptaPromo,
        })
        clienteId = cl._id
      }

      // Marcar pedido como pagado
      await api.put('/pedidos/' + modalCobro._id, {
        pagado: true,
        metodoPago: cobro.metodoPago,
        tipoComprobante: cobro.tipoComprobante,
        estado: 'entregado',
        clienteId,
        clienteNombre: cobro.nombre,
        clienteDoc:    cobro.numDoc,
      })

      // Liberar mesa
      if (modalCobro.mesaId) {
        await api.put('/mesas/' + modalCobro.mesaId, { estado:'libre', mozo:null, pedidoActual:null })
      }

      // Imprimir comprobante
      imprimirBoleta({
        ...modalCobro,
        tipoComprobante: cobro.tipoComprobante,
        ruc:         cobro.numDoc.length === 11 ? cobro.numDoc : '',
        razonSocial: cobro.razonSocial,
        metodoPago:  cobro.metodoPago,
        vuelto,
      }, config)

      // Emitir comprobante electrónico si es boleta o factura
      if (['boleta','factura'].includes(cobro.tipoComprobante)) {
        setEmitiendo(true)
        try {
          const { data: fe } = await api.post('/facturacion/emitir', {
            pedidoId: modalCobro._id,
            tipo: cobro.tipoComprobante,
          })
          if (fe.success && !fe.yaEmitido) {
            setComprobanteEmitido(fe)
          }
        } catch (feErr) {
          // No bloquear el cobro si Nubefact falla — el ticket ya se imprimió
          console.log('Nubefact no disponible:', feErr.message)
        } finally {
          setEmitiendo(false)
        }
      }

      setModalCobro(null)
      cargar()
    } catch (err) { alert(err.response?.data?.error || 'Error al cobrar') }
  }

  const eliminarEgreso = async (id) => {
    if (!confirm('¿Eliminar egreso?')) return
    await api.delete('/egresos/' + id); cargar()
  }

  const abrirModalCobro = (p) => {
    setModalCobro(p)
    setMsgDoc('')
    setCobro({
      metodoPago:'efectivo', tipoComprobante:'ticket',
      numDoc:'', nombre:'', razonSocial:'', direccion:'',
      celular:'', aceptaPromo:true, clienteId:null,
      efectivoRecibido: p.total,
    })
  }

  const totalEgresos = egresos.reduce((s, e) => s + e.monto, 0)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Caja</div>
          <div className="page-sub">
            {caja ? (caja.estado==='abierta' ? 'Caja abierta hoy' : 'Caja cerrada') : 'Sin caja hoy'}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {!caja && esAdmin && (
            <button className="btn btn-primary" onClick={()=>setModalApertura(true)}>Abrir Caja</button>
          )}
          {!caja && !esAdmin && (
            <div style={{fontSize:13,color:'var(--gray-500)',padding:'8px 12px',background:'var(--gray-100)',borderRadius:'var(--radius-sm)'}}>
              ⏳ Esperando que el administrador abra la caja
            </div>
          )}
          {caja?.estado==='abierta' && <>
            <button className="btn btn-ghost" onClick={()=>setModalEgreso(true)}>Registrar Egreso</button>
            {esAdmin && <button className="btn btn-accent" onClick={()=>setModalCierre(true)}>Cerrar Caja</button>}
          </>}
          {caja?.estado==='cerrada' && (
            <button className="btn btn-ghost" onClick={()=>imprimirCierreCaja(caja, egresos)}>Imprimir Cierre</button>
          )}
          {caja?.estado==='cerrada' && esAdmin && (
            <button className="btn btn-primary" onClick={()=>setModalApertura(true)}>Abrir Nuevo Turno</button>
          )}
        </div>
      </div>

      {/* TABS */}
      <div style={{ display:'flex', gap:4, background:'var(--gray-100)', borderRadius:'var(--radius)', padding:4, marginBottom:20, width:'fit-content', flexWrap:'wrap' }}>
        {[{k:'cobrar',l:'Cobrar'},{k:'caja',l:'Estado Caja'},{k:'egresos',l:'Egresos'}].map(t => (
          <button key={t.k} onClick={()=>setTab(t.k)} style={{
            padding:'8px 18px', borderRadius:8, border:'none', cursor:'pointer',
            fontWeight:600, fontSize:14,
            background: tab===t.k ? 'white' : 'transparent',
            boxShadow:  tab===t.k ? 'var(--shadow-sm)' : 'none',
          }}>{t.l}</button>
        ))}
      </div>

      {/* ── TAB COBRAR ── */}
      {tab==='cobrar' && (
        <>
          {!caja ? (
            <div className="card" style={{ textAlign:'center', padding:40 }}>
              <div style={{ fontSize:42 }}>💵</div>
              <div style={{ fontSize:17, fontWeight:700, marginTop:12 }}>Abre la caja primero</div>
              <button className="btn btn-primary" style={{ marginTop:16 }} onClick={()=>setModalApertura(true)}>Abrir Caja</button>
            </div>
          ) : pedidos.length === 0 ? (
            <div className="card" style={{ textAlign:'center', padding:40 }}>
              <div style={{ fontSize:42 }}>✅</div>
              <div style={{ fontSize:17, fontWeight:700, marginTop:12 }}>Sin pedidos pendientes de cobro</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {pedidos.map(p => (
                <div key={p._id} className="card" style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:4 }}>
                      <span style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800 }}>
                        {p.tipo==='mesa' ? 'Mesa '+p.mesaNumero : p.tipo==='delivery' ? 'Delivery' : 'Para llevar'}
                      </span>
                      <span className="badge badge-warning">Pedido #{p.numero}</span>
                      {p.mozo && <span style={{ fontSize:12, color:'var(--gray-500)' }}>Mozo: {p.mozo}</span>}
                    </div>
                    <div style={{ fontSize:13, color:'var(--gray-600)' }}>
                      {p.items?.map(i => i.cantidad+'x '+i.nombre).join(' · ')}
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:800, color:'var(--accent)' }}>
                      S/ {p.total?.toFixed(2)}
                    </div>
                    <button className="btn btn-primary btn-sm" style={{ marginTop:6 }} onClick={()=>abrirModalCobro(p)}>
                      Cobrar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── TAB ESTADO CAJA ── */}
      {tab==='caja' && (
        !caja ? (
          <div className="card" style={{ textAlign:'center', padding:60 }}>
            <div style={{ fontSize:48 }}>💵</div>
            <div style={{ fontSize:18, fontWeight:700, marginTop:12 }}>No hay caja abierta hoy</div>
            <button className="btn btn-primary" style={{ marginTop:16 }} onClick={()=>setModalApertura(true)}>Abrir Caja</button>
          </div>
        ) : (
          <div className="grid-2">
            <div className="card">
              <div className="card-title">Estado de Caja — Hoy</div>
              {[
                { label:'Apertura con',    val:caja.montoApertura,  color:'var(--gray-700)' },
                { label:'Ventas efectivo', val:caja.totalEfectivo,  color:'var(--success)' },
                { label:'Ventas Yape',     val:caja.totalYape,      color:'var(--info)' },
                { label:'Ventas Plin',     val:caja.totalPlin,      color:'var(--info)' },
                { label:'Ventas Tarjeta',  val:caja.totalTarjeta,   color:'var(--info)' },
                { label:'Total ventas',    val:caja.totalVentas,    color:'var(--success)', bold:true },
                { label:'Total egresos',   val:caja.totalEgresos||totalEgresos, color:'var(--danger)' },
                { label:'Saldo en caja',   val:(caja.montoApertura||0)+(caja.totalEfectivo||0)-(caja.totalEgresos||totalEgresos), color:'var(--accent)', bold:true },
              ].map((row,i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--gray-100)' }}>
                  <span style={{ fontSize:14, fontWeight:row.bold?700:400 }}>{row.label}</span>
                  <span style={{ fontWeight:row.bold?800:600, color:row.color, fontSize:row.bold?16:14 }}>
                    S/ {(row.val||0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-title">Últimos egresos</div>
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
                    <button className="btn btn-danger btn-sm" onClick={()=>eliminarEgreso(eg._id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* ── TAB EGRESOS ── */}
      {tab==='egresos' && (
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div className="card-title" style={{ margin:0 }}>Egresos de hoy</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, color:'var(--danger)' }}>
              Total: S/ {totalEgresos.toFixed(2)}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginBottom:12 }} onClick={()=>setModalEgreso(true)}>
            + Registrar Egreso
          </button>
          {!egresos.length ? (
            <div style={{ textAlign:'center', padding:40, color:'var(--gray-400)' }}>Sin egresos hoy</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Descripción</th><th>Categoría</th><th>Comprobante</th><th>Registrado por</th><th>Monto</th><th></th></tr></thead>
                <tbody>
                  {egresos.map(eg => (
                    <tr key={eg._id}>
                      <td><strong>{eg.descripcion}</strong></td>
                      <td><span className="badge badge-warning">{eg.categoria}</span></td>
                      <td style={{ fontSize:12, color:'var(--gray-500)' }}>{eg.comprobante||'—'}</td>
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

      {/* ══ MODAL COBRAR ══ */}
      {modalCobro && (
        <div className="modal-overlay" onClick={()=>setModalCobro(null)}>
          <div className="modal" style={{ maxWidth:500 }} onClick={e=>e.stopPropagation()}>
            <div className="modal-title">
              Cobrar — {modalCobro.tipo==='mesa' ? 'Mesa '+modalCobro.mesaNumero : 'Pedido #'+modalCobro.numero}
            </div>

            {/* Resumen pedido */}
            <div style={{ background:'var(--gray-50)', borderRadius:'var(--radius-sm)', padding:'10px 14px', marginBottom:16 }}>
              {modalCobro.items?.map((it,i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                  <span>{it.cantidad}x {it.nombre}</span>
                  <span>S/ {(it.precio*it.cantidad).toFixed(2)}</span>
                </div>
              ))}
              <div style={{ borderTop:'1px dashed var(--gray-300)', marginTop:8, paddingTop:8, display:'flex', justifyContent:'space-between', fontWeight:800, fontSize:18, fontFamily:'var(--font-display)' }}>
                <span>TOTAL</span>
                <span style={{ color:'var(--accent)' }}>S/ {modalCobro.total?.toFixed(2)}</span>
              </div>
            </div>

            {/* Buscar cliente por DNI/RUC */}
            <div className="form-group">
              <label className="form-label">
                DNI / RUC del cliente (opcional)
                {consultando && <span style={{ color:'var(--info)', fontSize:11, marginLeft:8 }}>consultando...</span>}
              </label>
              <input className="form-input"
                placeholder="Escribe el DNI (8 dígitos) o RUC (11 dígitos)"
                value={cobro.numDoc}
                onChange={e => consultarDoc(e.target.value)}
                maxLength={11} />
              {msgDoc && (
                <div style={{ fontSize:12, marginTop:4, fontWeight:600,
                  color: msgDoc.includes('frecuente') ? 'var(--success)' : msgDoc.includes('Error') || msgDoc.includes('No se') ? 'var(--warning)' : 'var(--info)'
                }}>{msgDoc}</div>
              )}
            </div>

            {/* Datos del cliente (si hay) */}
            {cobro.nombre ? (
              <div style={{ background:'#E8F5E9', borderRadius:'var(--radius-sm)', padding:'8px 12px', marginBottom:14 }}>
                <div style={{ fontWeight:700, fontSize:14 }}>{cobro.nombre}</div>
                {cobro.razonSocial && cobro.razonSocial !== cobro.nombre && (
                  <div style={{ fontSize:12, color:'var(--gray-600)' }}>{cobro.razonSocial}</div>
                )}
                {cobro.direccion && <div style={{ fontSize:12, color:'var(--gray-600)' }}>{cobro.direccion}</div>}
                {cobro.celular && <div style={{ fontSize:12, color:'var(--gray-600)' }}>📱 {cobro.celular}</div>}
              </div>
            ) : cobro.numDoc.length >= 8 && !consultando && (
              <div className="form-group">
                <label className="form-label">Nombre (completa manualmente)</label>
                <input className="form-input" value={cobro.nombre}
                  onChange={e => setCobro(prev => ({ ...prev, nombre:e.target.value }))} />
              </div>
            )}

            {/* Celular si no tiene */}
            {cobro.numDoc && !cobro.celular && (
              <div className="form-group">
                <label className="form-label">Celular para WhatsApp (opcional)</label>
                <div style={{ display:'flex', gap:8 }}>
                  <input className="form-input" placeholder="987654321"
                    onChange={e => setCobro(prev => ({ ...prev, celular:e.target.value }))} />
                  <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, whiteSpace:'nowrap' }}>
                    <input type="checkbox" checked={cobro.aceptaPromo}
                      onChange={e => setCobro(prev => ({ ...prev, aceptaPromo:e.target.checked }))} />
                    Acepta promos
                  </label>
                </div>
              </div>
            )}

            {/* Tipo comprobante */}
            <div className="form-group">
              <label className="form-label">Comprobante</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
                {COMPROBANTES.map(c => (
                  <button key={c.value} type="button"
                    onClick={()=>setCobro(prev=>({...prev, tipoComprobante:c.value}))}
                    style={{ padding:'8px 4px', borderRadius:'var(--radius-sm)', fontSize:12, fontWeight:600,
                      cursor:'pointer', border:'2px solid',
                      borderColor: cobro.tipoComprobante===c.value ? 'var(--primary)' : 'var(--gray-300)',
                      background:  cobro.tipoComprobante===c.value ? 'var(--primary-light)' : 'white',
                    }}>{c.label}</button>
                ))}
              </div>
            </div>

            {/* Método de pago */}
            <div className="form-group">
              <label className="form-label">Método de pago</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6 }}>
                {METODOS.map(m => (
                  <button key={m.value} type="button"
                    onClick={()=>setCobro(prev=>({...prev, metodoPago:m.value, efectivoRecibido:m.value==='efectivo'?modalCobro.total:0}))}
                    style={{ padding:'8px 4px', borderRadius:'var(--radius-sm)', fontSize:12, fontWeight:600,
                      cursor:'pointer', border:'2px solid',
                      borderColor: cobro.metodoPago===m.value ? 'var(--primary)' : 'var(--gray-300)',
                      background:  cobro.metodoPago===m.value ? 'var(--primary)' : 'white',
                    }}>{m.label}</button>
                ))}
              </div>
            </div>

            {/* Efectivo y vuelto */}
            {cobro.metodoPago==='efectivo' && (
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Efectivo recibido S/</label>
                  <input className="form-input" type="number" step="0.50"
                    value={cobro.efectivoRecibido}
                    onChange={e=>setCobro(prev=>({...prev,efectivoRecibido:Number(e.target.value)}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Vuelto S/</label>
                  <div style={{ padding:'10px 12px', background:vuelto>0?'#E8F5E9':'var(--gray-100)',
                    borderRadius:'var(--radius-sm)', fontFamily:'var(--font-display)',
                    fontSize:20, fontWeight:800, color:vuelto>0?'var(--success)':'var(--gray-500)' }}>
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

      {/* ══ MODAL APERTURA ══ */}
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

      {/* ══ MODAL CIERRE ══ */}
      {modalCierre && (
        <div className="modal-overlay" onClick={()=>setModalCierre(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">Cerrar Caja</div>
            <div className="form-group">
              <label className="form-label">Monto físico contado en caja S/</label>
              <input className="form-input" type="number" step="0.50" value={cierre.montoCierre}
                onChange={e=>setCierre({...cierre,montoCierre:Number(e.target.value)})} />
            </div>
            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea className="form-input" rows={3} value={cierre.observaciones}
                onChange={e=>setCierre({...cierre,observaciones:e.target.value})} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={()=>setModalCierre(false)}>Cancelar</button>
              <button className="btn btn-accent" onClick={cerrarCaja}>Cerrar e Imprimir</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL EGRESO ══ */}
      {modalEgreso && (
        <div className="modal-overlay" onClick={()=>setModalEgreso(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">Registrar Egreso</div>
            <form onSubmit={registrarEgreso}>
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select className="form-select" value={egreso.categoria}
                  onChange={e=>setEgreso({...egreso,categoria:e.target.value})}>
                  {CATS_EGRESO.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Descripción *</label>
                <input className="form-input" placeholder="¿En qué se gastó?" value={egreso.descripcion}
                  onChange={e=>setEgreso({...egreso,descripcion:e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Monto S/ *</label>
                <input className="form-input" type="number" step="0.50" min="0" value={egreso.monto}
                  onChange={e=>setEgreso({...egreso,monto:e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">N° Comprobante / Boleta</label>
                <input className="form-input" placeholder="Opcional" value={egreso.comprobante}
                  onChange={e=>setEgreso({...egreso,comprobante:e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={()=>setModalEgreso(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal comprobante electrónico emitido */}
      {comprobanteEmitido && (
        <div className="modal-overlay" onClick={()=>setComprobanteEmitido(null)}>
          <div className="modal" style={{maxWidth:400,textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:40,marginBottom:8}}>✅</div>
            <div className="modal-title" style={{color:'var(--success)'}}>Comprobante Electrónico Emitido</div>
            <div style={{background:'var(--gray-50)',borderRadius:'var(--radius-sm)',padding:'12px 16px',margin:'12px 0',fontSize:13}}>
              <div><strong>Serie:</strong> {comprobanteEmitido.serie}-{String(comprobanteEmitido.numero).padStart(8,'0')}</div>
              <div><strong>Estado SUNAT:</strong> <span style={{color:'var(--success)',fontWeight:700}}>{comprobanteEmitido.estado?.toUpperCase()}</span></div>
              {comprobanteEmitido.modo==='demo' && (
                <div style={{color:'var(--warning)',fontSize:11,marginTop:6}}>⚠️ Modo DEMO — sin valor legal</div>
              )}
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
              {comprobanteEmitido.pdfUrl && (
                <a href={comprobanteEmitido.pdfUrl} target="_blank" rel="noreferrer"
                  className="btn btn-primary btn-sm">📄 Ver PDF SUNAT</a>
              )}
              <button className="btn btn-ghost btn-sm" onClick={()=>setComprobanteEmitido(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
