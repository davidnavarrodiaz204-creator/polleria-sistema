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
    celular:'', email:'', aceptaPromo:true, clienteId:null,
    efectivoRecibido:0,
    // Pago mixto
    pagoMixto: false,
    pagos: [], // [{metodo, monto}]
    // Descuento
    descuento: 0,
    tipoDescuento: 'monto',
    // Puntos
    usarPuntos: false,
    puntosCanjeados: 0,
    puntosInfo: null,
  })
  const [consultando, setConsultando] = useState(false)
  const [msgDoc, setMsgDoc]           = useState('')
  const [pedidosPagados, setPedidosPagados] = useState([])

  const cargar = useCallback(() => {
    api.get('/caja/hoy').then(r => setCaja(r.data)).catch(() => {})
    api.get('/egresos').then(r => setEgresos(r.data)).catch(() => {})
    // Cargar todos los pedidos: pendientes para cobrar + pagados para estado caja
    api.get('/pedidos').then(r => {
      const todos = r.data
      setPedidos(todos.filter(p => !p.pagado && !['cancelado','entregado'].includes(p.estado)))
      setPedidosPagados(todos.filter(p => p.pagado))
    }).catch(() => {})
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const totalPagadoMixto = cobro.pagos.reduce((s, p) => s + (Number(p.monto)||0), 0)
  const efectivoEnMixto  = cobro.pagos.find(p => p.metodo === 'efectivo')

  // Calcular descuento
  const calcularDescuento = () => {
    const subtotal = modalCobro?.total || 0
    if (cobro.descuento <= 0) return 0
    if (cobro.tipoDescuento === 'porcentaje') {
      return Math.round(subtotal * cobro.descuento / 100 * 100) / 100
    }
    return Math.min(cobro.descuento, subtotal)
  }
  const montoDescuento = calcularDescuento()

  // Calcular valor de puntos
  const valorPuntos = cobro.usarPuntos && cobro.puntosCanjeados > 0
    ? Math.round(cobro.puntosCanjeados * 0.10 * 100) / 100
    : 0

  // Total final
  const totalConDescuento = Math.max(0, (modalCobro?.total || 0) - montoDescuento - valorPuntos)

  const vuelto = cobro.pagoMixto
    ? Math.max(0, (Number(efectivoEnMixto?.monto)||0) - Math.max(0, totalConDescuento - cobro.pagos.filter(p=>p.metodo!=='efectivo').reduce((s,p)=>s+(Number(p.monto)||0),0)))
    : cobro.metodoPago === 'efectivo'
      ? Math.max(0, Number(cobro.efectivoRecibido) - totalConDescuento)
      : 0

  // Consultar RUC/DNI automáticamente
  const consultarDoc = async (num) => {
    const limpio = num.replace(/\D/g, '')
    setCobro(prev => ({ ...prev, numDoc: limpio, nombre:'', razonSocial:'', direccion:'', clienteId:null, email:'', puntosInfo:null }))
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
        email:        data.email       || '',
        aceptaPromo:  data.aceptaPromo ?? true,
        tipoComprobante: (limpio.length === 11) ? 'factura' : prev.tipoComprobante,
      }))

      // Cargar puntos si existe cliente
      if (data._id) {
        try {
          const { data: puntosData } = await api.get('/caja/puntos/' + data._id)
          setCobro(prev => ({ ...prev, puntosInfo: puntosData.data }))
        } catch {}
      }

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
        const datosCliente = {
          tipoDoc:     cobro.numDoc.length === 8 ? 'dni' : 'ruc',
          numDoc:      cobro.numDoc,
          nombre:      cobro.nombre,
          razonSocial: cobro.razonSocial,
          direccion:   cobro.direccion,
          celular:     cobro.celular,
          email:       cobro.email,
          aceptaPromo: cobro.aceptaPromo,
        }
        if (cobro.clienteId) {
          await api.put('/clientes/' + cobro.clienteId, datosCliente).catch(() => {})
        } else {
          try {
            const { data: cl } = await api.post('/clientes', datosCliente)
            clienteId = cl._id
          } catch(e) {
            if (e.response?.status === 400) {
              const { data: lista } = await api.get('/clientes?q=' + cobro.numDoc).catch(() => ({ data:[] }))
              if (lista?.[0]) clienteId = lista[0]._id
            }
          }
        }
      }

      // Calcular método principal para reportes
      const metodoPrincipal = cobro.pagoMixto
        ? cobro.pagos.sort((a,b)=>(Number(b.monto)||0)-(Number(a.monto)||0))[0]?.metodo || 'efectivo'
        : cobro.metodoPago

      // Marcar pedido como pagado
      await api.put('/pedidos/' + modalCobro._id, {
        pagado: true,
        metodoPago:      metodoPrincipal,
        pagosMixtos:     cobro.pagoMixto ? cobro.pagos : null,
        tipoComprobante: cobro.tipoComprobante,
        estado:          'entregado',
        clienteId,
        clienteNombre:   cobro.nombre,
        clienteDoc:      cobro.numDoc,
        // Descuento
        descuento:       cobro.descuento,
        tipoDescuento:   cobro.tipoDescuento,
        montoDescuento:  montoDescuento,
        // Puntos
        puntosCanjeados: cobro.usarPuntos ? cobro.puntosCanjeados : 0,
        valorPuntos:     valorPuntos,
        total:           totalConDescuento,
      })

      // Enviar email si está configurado y hay email del cliente
      if (config?.email?.activo && cobro.email) {
        try {
          await api.post('/email/enviar/' + modalCobro._id, { email: cobro.email })
        } catch (e) {
          console.log('No se pudo enviar email:', e.message)
        }
      }

      // Liberar mesa
      if (modalCobro.mesaId) {
        await api.put('/mesas/' + modalCobro.mesaId, { estado:'libre', mozo:null, pedidoActual:null })
      }

      // Imprimir comprobante
      imprimirBoleta({
        ...modalCobro,
        total: totalConDescuento,
        tipoComprobante: cobro.tipoComprobante,
        ruc:         cobro.numDoc.length === 11 ? cobro.numDoc : '',
        razonSocial: cobro.razonSocial,
        metodoPago:  cobro.metodoPago,
        vuelto,
        descuento:   montoDescuento,
      }, config)

      setModalCobro(null)
      cargar()
    } catch (err) { alert(err.response?.data?.error || 'Error al cobrar') }
  }

  // Helpers pago mixto
  const agregarPago = () => {
    const yaAsignado = cobro.pagos.reduce((s,p) => s+(Number(p.monto)||0), 0)
    const resto = Math.max(0, totalConDescuento - yaAsignado)
    setCobro(prev => ({ ...prev, pagos: [...prev.pagos, { metodo:'efectivo', monto: resto }] }))
  }

  const actualizarPago = (i, campo, valor) => {
    const nuevos = cobro.pagos.map((p, idx) => idx === i ? { ...p, [campo]: valor } : p)
    setCobro(prev => ({ ...prev, pagos: nuevos }))
  }

  const quitarPago = (i) => {
    setCobro(prev => ({ ...prev, pagos: prev.pagos.filter((_, idx) => idx !== i) }))
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
      celular:'', email:'', aceptaPromo:true, clienteId:null,
      efectivoRecibido: p.total,
      pagoMixto: false,
      pagos: [],
      descuento: 0,
      tipoDescuento: 'monto',
      usarPuntos: false,
      puntosCanjeados: 0,
      puntosInfo: null,
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
                { label:'Ventas efectivo', val: caja.estado==='cerrada' ? caja.totalEfectivo  : pedidosPagados.filter(p=>p.metodoPago==='efectivo').reduce((s,p)=>s+p.total,0),  color:'var(--success)' },
                { label:'Ventas Yape',     val: caja.estado==='cerrada' ? caja.totalYape      : pedidosPagados.filter(p=>p.metodoPago==='yape').reduce((s,p)=>s+p.total,0),      color:'var(--info)' },
                { label:'Ventas Plin',     val: caja.estado==='cerrada' ? caja.totalPlin      : pedidosPagados.filter(p=>p.metodoPago==='plin').reduce((s,p)=>s+p.total,0),      color:'var(--info)' },
                { label:'Ventas Tarjeta',  val: caja.estado==='cerrada' ? caja.totalTarjeta   : pedidosPagados.filter(p=>p.metodoPago==='tarjeta').reduce((s,p)=>s+p.total,0),   color:'var(--info)' },
                { label:'Ventas Transf.',  val: caja.estado==='cerrada' ? (caja.totalTransferencia||0) : pedidosPagados.filter(p=>p.metodoPago==='transferencia').reduce((s,p)=>s+p.total,0), color:'var(--info)' },
                { label:'Total ventas',    val: caja.estado==='cerrada' ? caja.totalVentas    : pedidosPagados.reduce((s,p)=>s+p.total,0), color:'var(--success)', bold:true },
                { label:'Total egresos',   val: totalEgresos, color:'var(--danger)' },
                { label:'Saldo en caja',   val: (caja.montoApertura||0) + (caja.estado==='cerrada' ? caja.totalEfectivo : pedidosPagados.filter(p=>p.metodoPago==='efectivo').reduce((s,p)=>s+p.total,0)) - totalEgresos, color:'var(--accent)', bold:true },
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
              <div style={{ borderTop:'1px dashed var(--gray-300)', marginTop:8, paddingTop:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                  <span>Subtotal:</span>
                  <span>S/ {modalCobro.total?.toFixed(2)}</span>
                </div>
                {montoDescuento > 0 && (
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'var(--success)' }}>
                    <span>Descuento{cobro.tipoDescuento==='porcentaje'?` (${cobro.descuento}%)`:''}:</span>
                    <span>- S/ {montoDescuento.toFixed(2)}</span>
                  </div>
                )}
                {valorPuntos > 0 && (
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'var(--info)' }}>
                    <span>Puntos canjeados ({cobro.puntosCanjeados}):</span>
                    <span>- S/ {valorPuntos.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display:'flex', justifyContent:'space-between', fontWeight:800, fontSize:18, fontFamily:'var(--font-display)', marginTop:4 }}>
                  <span>TOTAL</span>
                  <span style={{ color:'var(--accent)' }}>S/ {totalConDescuento.toFixed(2)}</span>
                </div>
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

            {/* Toggle pago mixto */}
            <div style={{marginBottom:12}}>
              <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',
                background: cobro.pagoMixto ? '#EFF6FF' : 'var(--gray-50)',
                border: `2px solid ${cobro.pagoMixto ? 'var(--info)' : 'var(--gray-200)'}`,
                borderRadius:'var(--radius-sm)', padding:'10px 14px', transition:'all .2s'}}>
                <input type="checkbox" checked={cobro.pagoMixto}
                  onChange={e => {
                    const activo = e.target.checked
                    setCobro(prev => ({
                      ...prev,
                      pagoMixto: activo,
                      pagos: activo ? [
                        { metodo:'efectivo', monto: totalConDescuento }
                      ] : [],
                    }))
                  }}/>
                <div>
                  <div style={{fontWeight:700,fontSize:13}}>💳 Pago mixto</div>
                  <div style={{fontSize:11,color:'var(--gray-500)'}}>Divide el pago entre varios métodos (ej: efectivo + Yape)</div>
                </div>
              </label>
            </div>

            {/* Descuento */}
            <div style={{marginBottom:12,background:'#FFF8E1',border:'2px solid #FFE082',borderRadius:'var(--radius-sm)',padding:'10px 14px'}}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>🏷️ Descuento</div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <select style={{flex:1,padding:'8px',borderRadius:6,border:'1px solid var(--gray-300)'}}
                  value={cobro.tipoDescuento}
                  onChange={e=>setCobro(prev=>({...prev,tipoDescuento:e.target.value}))}>
                  <option value="monto">S/ monto fijo</option>
                  <option value="porcentaje">% porcentaje</option>
                </select>
                <input type="number" step="0.50" min="0"
                  style={{flex:1,padding:'8px',borderRadius:6,border:'1px solid var(--gray-300)'}}
                  placeholder={cobro.tipoDescuento==='porcentaje'?'%':'S/'}
                  value={cobro.descuento||''}
                  onChange={e=>setCobro(prev=>({...prev,descuento:Number(e.target.value)||0}))}/>
              </div>
              {montoDescuento > 0 && (
                <div style={{fontSize:12,color:'var(--success)',marginTop:6,fontWeight:600}}>
                  Descuento aplicado: -S/ {montoDescuento.toFixed(2)}
                </div>
              )}
            </div>

            {/* Puntos del cliente */}
            {cobro.puntosInfo && cobro.puntosInfo.puntosActuales > 0 && (
              <div style={{marginBottom:12,background:'#E8F5E9',border:'2px solid #A5D6A7',borderRadius:'var(--radius-sm)',padding:'10px 14px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <div style={{fontWeight:700,fontSize:13}}>🎁 Puntos disponibles: <span style={{color:'var(--success)'}}>{cobro.puntosInfo.puntosActuales}</span></div>
                  <div style={{fontSize:11,color:'var(--gray-500)'}}>= S/ {cobro.puntosInfo.valorDisponible?.toFixed(2)}</div>
                </div>
                <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                  <input type="checkbox" checked={cobro.usarPuntos}
                    onChange={e=>setCobro(prev=>({
                      ...prev,
                      usarPuntos: e.target.checked,
                      puntosCanjeados: e.target.checked ? Math.min(cobro.puntosInfo.puntosActuales, cobro.puntosInfo.minimoCanje) : 0
                    }))}/>
                  <span style={{fontSize:13}}>Usar puntos como descuento</span>
                </label>
                {cobro.usarPuntos && (
                  <div style={{marginTop:8,display:'flex',gap:8,alignItems:'center'}}>
                    <input type="number" min={cobro.puntosInfo.minimoCanje} max={cobro.puntosInfo.puntosActuales}
                      style={{flex:1,padding:'8px',borderRadius:6,border:'1px solid var(--gray-300)'}}
                      value={cobro.puntosCanjeados}
                      onChange={e=>setCobro(prev=>({...prev,puntosCanjeados:Number(e.target.value)||0}))}/>
                    <span style={{fontSize:12,color:'var(--gray-500)'}}>
                      = S/ {(cobro.puntosCanjeados * 0.10).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Email del cliente */}
            {cobro.numDoc && (
              <div className="form-group">
                <label className="form-label">Email para enviar comprobante</label>
                <input className="form-input" type="email" placeholder="cliente@email.com"
                  value={cobro.email}
                  onChange={e=>setCobro(prev=>({...prev,email:e.target.value}))}/>
              </div>
            )}

            {/* Pago simple */}
            {!cobro.pagoMixto && (
              <>
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
              </>
            )}

            {/* Pago mixto */}
            {cobro.pagoMixto && (
              <div className="form-group">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <label className="form-label" style={{margin:0}}>Pagos ({cobro.pagos.length})</label>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={agregarPago}
                    disabled={totalPagadoMixto >= totalConDescuento}>
                    + Agregar método
                  </button>
                </div>

                {cobro.pagos.map((pago, i) => (
                  <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 120px auto',gap:8,marginBottom:8,alignItems:'center'}}>
                    <select className="form-select" value={pago.metodo}
                      onChange={e=>actualizarPago(i,'metodo',e.target.value)}>
                      {METODOS.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <input className="form-input" type="number" step="0.50" placeholder="S/ 0.00"
                      value={pago.monto}
                      onChange={e=>actualizarPago(i,'monto',e.target.value)}/>
                    <button type="button" onClick={()=>quitarPago(i)}
                      style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',fontSize:18,padding:'0 4px'}}>
                      ✕
                    </button>
                  </div>
                ))}

                {/* Resumen mixto */}
                <div style={{background:'var(--gray-50)',borderRadius:'var(--radius-sm)',padding:'10px 14px',marginTop:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:4}}>
                    <span>Total a pagar:</span>
                    <strong>S/ {totalConDescuento.toFixed(2)}</strong>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:4}}>
                    <span>Total asignado:</span>
                    <strong style={{color:totalPagadoMixto>=totalConDescuento?'var(--success)':'var(--warning)'}}>
                      S/ {totalPagadoMixto.toFixed(2)}
                    </strong>
                  </div>
                  {totalPagadoMixto < totalConDescuento && (
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'var(--danger)',fontWeight:700}}>
                      <span>Falta:</span>
                      <span>S/ {(totalConDescuento - totalPagadoMixto).toFixed(2)}</span>
                    </div>
                  )}
                  {vuelto > 0 && (
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'var(--success)',fontWeight:700,marginTop:4,borderTop:'1px solid var(--gray-200)',paddingTop:4}}>
                      <span>Vuelto efectivo:</span>
                      <span>S/ {vuelto.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={()=>setModalCobro(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ fontSize:15 }} onClick={cobrarPedido}
                disabled={cobro.pagoMixto && totalPagadoMixto < totalConDescuento}>
                {cobro.pagoMixto && totalPagadoMixto < totalConDescuento
                  ? `Falta S/ ${(totalConDescuento-totalPagadoMixto).toFixed(2)}`
                  : 'Cobrar e Imprimir'}
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
    </div>
  )
}
