/**
 * NotaCredito.jsx — Emisión de Notas de Crédito
 *
 * Flujo:
 *  1. Buscar boleta o factura original por número de pedido o DNI/RUC del cliente
 *  2. Ver el detalle del comprobante encontrado
 *  3. Seleccionar motivo
 *  4. Emitir NC → crea pedido tipo nota_credito vinculado al original + imprime
 *
 * Autor: David Navarro Diaz
 */
import { useState } from 'react'
import api from '../utils/api'
import { imprimirBoleta } from '../utils/print'
import { useApp } from '../context/AppContext'

const MOTIVOS = [
  'Anulación de operación',
  'Error en RUC del cliente',
  'Devolución de producto',
  'Descuento posterior',
  'Error en monto cobrado',
  'Otro',
]

export default function NotaCredito() {
  const { config } = useApp()

  // Paso 1 — búsqueda
  const [busqueda, setBusqueda]   = useState('')
  const [buscando, setBuscando]   = useState(false)
  const [resultados, setResultados] = useState([])
  const [msgBusqueda, setMsgBusqueda] = useState('')

  // Paso 2 — comprobante seleccionado
  const [seleccionado, setSeleccionado] = useState(null)

  // Paso 3 — datos de la NC
  const [motivo, setMotivo]   = useState('')
  const [motivoTexto, setMotivoTexto] = useState('')
  const [emitiendo, setEmitiendo] = useState(false)
  const [ncEmitida, setNcEmitida] = useState(null)

  // Buscar boletas/facturas por número de pedido o documento del cliente
  const buscar = async () => {
    const q = busqueda.trim()
    if (!q) return
    setBuscando(true)
    setResultados([])
    setMsgBusqueda('')
    setSeleccionado(null)
    setNcEmitida(null)
    try {
      const { data } = await api.get('/pedidos/historial?q=' + encodeURIComponent(q) + '&limit=20&pagado=true')
      // Solo boletas y facturas — no tickets ni NCs ya emitidas
      const validos = data.filter(p =>
        p.tipoComprobante === 'boleta' || p.tipoComprobante === 'factura'
      )
      if (!validos.length) {
        setMsgBusqueda('No se encontraron boletas ni facturas con ese criterio.')
      }
      setResultados(validos)
    } catch {
      setMsgBusqueda('Error al buscar. Intenta de nuevo.')
    } finally { setBuscando(false) }
  }

  const seleccionar = (p) => {
    setSeleccionado(p)
    setMotivo('')
    setMotivoTexto('')
    setNcEmitida(null)
    setResultados([])
    setBusqueda('')
  }

  const emitirNC = async () => {
    const motivoFinal = motivo === 'Otro' ? motivoTexto.trim() : motivo
    if (!motivoFinal) return alert('Selecciona o escribe el motivo')
    if (!confirm(`¿Emitir Nota de Crédito para el Pedido #${seleccionado.numero}?\nMotivo: ${motivoFinal}`)) return

    setEmitiendo(true)
    try {
      // Crear documento NC vinculado al original
      const { data: nc } = await api.post('/pedidos', {
        tipo:            seleccionado.tipo,
        mesaNumero:      seleccionado.mesaNumero,
        items:           seleccionado.items,
        total:           seleccionado.total,
        tipoComprobante: 'nota_credito',
        clienteId:       seleccionado.clienteId   || null,
        clienteNombre:   seleccionado.clienteNombre || '',
        clienteDoc:      seleccionado.clienteDoc   || '',
        nota:            `NC — Motivo: ${motivoFinal} | Ref: ${seleccionado.tipoComprobante} #${seleccionado.numero}`,
        pagado:          true,
        metodoPago:      seleccionado.metodoPago,
        estado:          'entregado',
      })

      // Imprimir NC automáticamente
      imprimirBoleta({
        ...nc,
        tipoComprobante: 'nota_credito',
        ruc:         seleccionado.clienteDoc?.length === 11 ? seleccionado.clienteDoc : '',
        razonSocial: seleccionado.clienteNombre || '',
        metodoPago:  seleccionado.metodoPago,
        vuelto:      0,
        nota:        `Motivo: ${motivoFinal} | Referencia: ${seleccionado.tipoComprobante.toUpperCase()} #${seleccionado.numero}`,
      }, config)

      setNcEmitida({ ...nc, motivoFinal })
      setSeleccionado(null)
    } catch (err) {
      alert(err.response?.data?.error || 'Error al emitir la nota de crédito')
    } finally { setEmitiendo(false) }
  }

  const reiniciar = () => {
    setBusqueda('')
    setResultados([])
    setMsgBusqueda('')
    setSeleccionado(null)
    setMotivo('')
    setMotivoTexto('')
    setNcEmitida(null)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Nota de Crédito</div>
          <div className="page-sub">Anular o corregir una boleta o factura emitida</div>
        </div>
      </div>

      {/* ── NC EMITIDA EXITOSAMENTE ── */}
      {ncEmitida && (
        <div className="card" style={{ textAlign: 'center', padding: 40, borderLeft: '4px solid var(--success)' }}>
          <div style={{ fontSize: 40 }}>✅</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 12, color: 'var(--success)' }}>
            Nota de Crédito Emitida
          </div>
          <div style={{ fontSize: 14, color: 'var(--gray-600)', marginTop: 8 }}>
            NC #{ncEmitida.numero} · Motivo: {ncEmitida.motivoFinal}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
            <button className="btn btn-ghost" onClick={() => imprimirBoleta({
              ...ncEmitida,
              tipoComprobante: 'nota_credito',
              metodoPago: ncEmitida.metodoPago,
              vuelto: 0,
            }, config)}>
              🖨️ Reimprimir NC
            </button>
            <button className="btn btn-primary" onClick={reiniciar}>
              Nueva Nota de Crédito
            </button>
          </div>
        </div>
      )}

      {!ncEmitida && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* ── PASO 1: BUSCAR ── */}
          <div className="card">
            <div className="card-title">
              <span style={{ background: 'var(--accent)', color: 'white', borderRadius: '50%', width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, marginRight: 8 }}>1</span>
              Buscar comprobante original
            </div>
            <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 14 }}>
              Ingresa el número de pedido, DNI o RUC del cliente
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                className="form-input"
                placeholder="Ej: 42, 76135178, 20604491844..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && buscar()}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" onClick={buscar} disabled={buscando || !busqueda.trim()}>
                {buscando ? '...' : '🔍'}
              </button>
            </div>

            {msgBusqueda && (
              <div style={{ fontSize: 13, color: 'var(--danger)', padding: '8px 12px', background: '#FFF3F3', borderRadius: 'var(--radius-sm)' }}>
                {msgBusqueda}
              </div>
            )}

            {resultados.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                {resultados.map(p => (
                  <div key={p._id}
                    onClick={() => seleccionar(p)}
                    style={{
                      padding: '10px 14px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                      border: '2px solid var(--gray-200)', background: 'white',
                      transition: 'all .15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--gray-200)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700 }}>Pedido #{p.numero}</span>
                      <span className={`badge ${p.tipoComprobante === 'factura' ? 'badge-primary' : 'badge-info'}`}>
                        {p.tipoComprobante}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-600)' }}>
                      {p.clienteNombre || 'Sin cliente'} {p.clienteDoc && `· ${p.clienteDoc}`}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginTop: 2 }}>
                      S/ {p.total?.toFixed(2)} · {p.metodoPago}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                      {p.creadoEn ? new Date(p.creadoEn).toLocaleString('es-PE', { timeZone: 'America/Lima' }) : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!resultados.length && !msgBusqueda && !buscando && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--gray-400)', fontSize: 13 }}>
                Busca por número de pedido, DNI o RUC
              </div>
            )}
          </div>

          {/* ── PASO 2: EMITIR NC ── */}
          <div className="card">
            <div className="card-title">
              <span style={{ background: seleccionado ? 'var(--accent)' : 'var(--gray-300)', color: 'white', borderRadius: '50%', width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, marginRight: 8 }}>2</span>
              Emitir Nota de Crédito
            </div>

            {!seleccionado ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray-400)' }}>
                <div style={{ fontSize: 36 }}>🧾</div>
                <div style={{ marginTop: 10, fontSize: 13 }}>Selecciona un comprobante de la izquierda</div>
              </div>
            ) : (
              <>
                {/* Detalle del comprobante original */}
                <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>
                    Comprobante original
                  </div>
                  <div style={{ fontWeight: 700 }}>
                    {seleccionado.tipoComprobante.toUpperCase()} #{seleccionado.numero}
                  </div>
                  {seleccionado.clienteNombre && (
                    <div style={{ fontSize: 13, marginTop: 4 }}>
                      👤 {seleccionado.clienteNombre} {seleccionado.clienteDoc && `(${seleccionado.clienteDoc})`}
                    </div>
                  )}
                  <div style={{ marginTop: 8 }}>
                    {seleccionado.items?.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
                        <span>{item.cantidad}x {item.nombre}</span>
                        <span>S/ {(item.precio * item.cantidad).toFixed(2)}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, borderTop: '1px solid var(--gray-200)', paddingTop: 8, marginTop: 6 }}>
                      <span>TOTAL NC</span>
                      <span style={{ color: 'var(--danger)' }}>- S/ {seleccionado.total?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Motivo */}
                <div className="form-group">
                  <label className="form-label">Motivo *</label>
                  <select className="form-select" value={motivo} onChange={e => setMotivo(e.target.value)}>
                    <option value="">— Selecciona —</option>
                    {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {motivo === 'Otro' && (
                  <div className="form-group">
                    <label className="form-label">Especifica</label>
                    <input className="form-input" value={motivoTexto}
                      onChange={e => setMotivoTexto(e.target.value)}
                      placeholder="Describe el motivo..." />
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setSeleccionado(null)}>
                    ← Volver
                  </button>
                  <button
                    className="btn btn-danger" style={{ flex: 2 }}
                    onClick={emitirNC}
                    disabled={emitiendo || !motivo || (motivo === 'Otro' && !motivoTexto.trim())}
                  >
                    {emitiendo ? 'Emitiendo...' : '📄 Emitir Nota de Crédito'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
