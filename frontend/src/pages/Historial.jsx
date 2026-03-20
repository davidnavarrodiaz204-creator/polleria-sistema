/**
 * Historial.jsx — Historial completo de pedidos con filtros
 * Autor: David Navarro Diaz
 */
import { useEffect, useState } from 'react'
import api from '../utils/api'

const ESTADOS = ['','en_cocina','preparando','listo','entregado','cancelado']
const TIPOS   = ['','mesa','delivery','para_llevar']

export default function Historial() {
  const [pedidos, setPedidos]   = useState([])
  const [cargando, setCargando] = useState(false)
  const [detalle, setDetalle]   = useState(null)
  const hoy = new Date().toISOString().split('T')[0]
  const [filtros, setFiltros]   = useState({ desde: hoy, hasta: hoy, tipo: '', estado: '', q: '' })

  const buscar = async () => {
    setCargando(true)
    try {
      const params = new URLSearchParams()
      if (filtros.desde)  params.set('desde',  filtros.desde)
      if (filtros.hasta)  params.set('hasta',  filtros.hasta)
      if (filtros.tipo)   params.set('tipo',   filtros.tipo)
      if (filtros.estado) params.set('estado', filtros.estado)
      if (filtros.q)      params.set('q',      filtros.q)
      params.set('limit', '200')
      const { data } = await api.get('/pedidos/historial?' + params.toString())
      setPedidos(data)
    } catch (err) {
      alert('Error al cargar historial')
    } finally { setCargando(false) }
  }

  useEffect(() => { buscar() }, [])

  const totalVentas   = pedidos.filter(p => p.pagado).reduce((s, p) => s + p.total, 0)
  const totalPedidos  = pedidos.length
  const pagados       = pedidos.filter(p => p.pagado).length

  const setF = (k, v) => setFiltros(f => ({ ...f, [k]: v }))

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Historial de Pedidos</div>
          <div className="page-sub">{totalPedidos} pedidos · {pagados} cobrados · S/ {totalVentas.toFixed(2)}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Desde</label>
            <input type="date" className="form-input" value={filtros.desde}
              onChange={e => setF('desde', e.target.value)} style={{ width: 150 }} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Hasta</label>
            <input type="date" className="form-input" value={filtros.hasta}
              onChange={e => setF('hasta', e.target.value)} style={{ width: 150 }} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Tipo</label>
            <select className="form-select" value={filtros.tipo} onChange={e => setF('tipo', e.target.value)} style={{ width: 130 }}>
              <option value="">Todos</option>
              <option value="mesa">Mesa</option>
              <option value="delivery">Delivery</option>
              <option value="para_llevar">Para llevar</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Estado</label>
            <select className="form-select" value={filtros.estado} onChange={e => setF('estado', e.target.value)} style={{ width: 140 }}>
              <option value="">Todos</option>
              <option value="entregado">Entregado</option>
              <option value="cancelado">Cancelado</option>
              <option value="en_cocina">En cocina</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Buscar</label>
            <input className="form-input" placeholder="Cliente, mozo, #pedido..." value={filtros.q}
              onChange={e => setF('q', e.target.value)} style={{ width: 180 }} />
          </div>
          <button className="btn btn-primary" onClick={buscar} disabled={cargando}>
            {cargando ? 'Buscando...' : '🔍 Buscar'}
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Tipo</th><th>Productos</th><th>Total</th>
                <th>Pago</th><th>Comprobante</th><th>Cliente</th>
                <th>Mozo</th><th>Estado</th><th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {!pedidos.length ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 32, color: 'var(--gray-400)' }}>
                  Sin pedidos en el rango seleccionado
                </td></tr>
              ) : pedidos.map(p => (
                <tr key={p._id} onClick={() => setDetalle(p)} style={{ cursor: 'pointer' }}>
                  <td><strong>#{p.numero}</strong></td>
                  <td>
                    <span className={`badge ${p.tipo === 'mesa' ? 'badge-info' : p.tipo === 'delivery' ? 'badge-warning' : 'badge-primary'}`}>
                      {p.tipo === 'mesa' ? 'Mesa ' + p.mesaNumero : p.tipo === 'delivery' ? 'Delivery' : 'Llevar'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.items?.map(i => i.cantidad + 'x ' + i.nombre).join(', ')}
                  </td>
                  <td><strong style={{ color: 'var(--accent)' }}>S/ {p.total?.toFixed(2)}</strong></td>
                  <td style={{ fontSize: 12 }}>{p.metodoPago || '—'}</td>
                  <td>
                    <span className={`badge ${p.tipoComprobante === 'factura' ? 'badge-primary' : p.tipoComprobante === 'boleta' ? 'badge-info' : 'badge-warning'}`}>
                      {p.tipoComprobante || 'ticket'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>{p.clienteNombre || '—'}</td>
                  <td style={{ fontSize: 12 }}>{p.mozo || '—'}</td>
                  <td>
                    <span className={`badge ${p.estado === 'entregado' ? 'badge-success' : p.estado === 'cancelado' ? 'badge-danger' : 'badge-warning'}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--gray-500)' }}>
                    {p.creadoEn ? new Date(p.creadoEn).toLocaleString('es-PE', { timeZone: 'America/Lima', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal detalle */}
      {detalle && (
        <div className="modal-overlay" onClick={() => setDetalle(null)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">Pedido #{detalle.numero}</div>
            <div style={{ marginBottom: 12 }}>
              {detalle.items?.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--gray-100)', fontSize: 14 }}>
                  <span>{item.cantidad}x {item.nombre}</span>
                  <span>S/ {(item.precio * item.cantidad).toFixed(2)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontWeight: 800, fontSize: 16 }}>
                <span>TOTAL</span>
                <span style={{ color: 'var(--accent)' }}>S/ {detalle.total?.toFixed(2)}</span>
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 2 }}>
              <div>🧾 Comprobante: <strong>{detalle.tipoComprobante}</strong></div>
              <div>💳 Pago: <strong>{detalle.metodoPago}</strong></div>
              {detalle.clienteNombre && <div>👤 Cliente: <strong>{detalle.clienteNombre}</strong> {detalle.clienteDoc && `(${detalle.clienteDoc})`}</div>}
              {detalle.mozo && <div>👨‍💼 Mozo: <strong>{detalle.mozo}</strong></div>}
              {detalle.nota && <div>📝 Nota: <strong>{detalle.nota}</strong></div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setDetalle(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
