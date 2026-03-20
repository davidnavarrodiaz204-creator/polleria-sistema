/**
 * Comprobantes.jsx — Registro de boletas y facturas emitidas
 * Base para futura facturación electrónica SUNAT
 * Autor: David Navarro Diaz
 */
import { useEffect, useState } from 'react'
import api from '../utils/api'

export default function Comprobantes() {
  const [pedidos, setPedidos]   = useState([])
  const [cargando, setCargando] = useState(false)
  const hoy = new Date().toISOString().split('T')[0]
  const [filtros, setFiltros]   = useState({ desde: hoy, hasta: hoy, tipo: '' })

  const buscar = async () => {
    setCargando(true)
    try {
      const params = new URLSearchParams()
      if (filtros.desde) params.set('desde', filtros.desde)
      if (filtros.hasta) params.set('hasta', filtros.hasta)
      const { data } = await api.get('/pedidos/comprobantes?' + params.toString())
      const filtrado = filtros.tipo ? data.filter(p => p.tipoComprobante === filtros.tipo) : data
      setPedidos(filtrado)
    } catch { alert('Error al cargar comprobantes') }
    finally { setCargando(false) }
  }

  useEffect(() => { buscar() }, [])

  const totalBoletas  = pedidos.filter(p => p.tipoComprobante === 'boleta').reduce((s, p) => s + p.total, 0)
  const totalFacturas = pedidos.filter(p => p.tipoComprobante === 'factura').reduce((s, p) => s + p.total, 0)
  const setF = (k, v) => setFiltros(f => ({ ...f, [k]: v }))

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Comprobantes Emitidos</div>
          <div className="page-sub">Boletas y facturas del período</div>
        </div>
      </div>

      {/* Resumen rápido */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Boletas', val: pedidos.filter(p=>p.tipoComprobante==='boleta').length, monto: totalBoletas, color: 'var(--info)' },
          { label: 'Facturas', val: pedidos.filter(p=>p.tipoComprobante==='factura').length, monto: totalFacturas, color: 'var(--primary)' },
          { label: 'Notas Crédito', val: pedidos.filter(p=>p.tipoComprobante==='nota_credito').length, monto: 0, color: 'var(--danger)' },
          { label: 'Total período', val: pedidos.length, monto: totalBoletas + totalFacturas, color: 'var(--success)' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ textAlign: 'center', padding: '12px 16px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 4 }}>{s.label}</div>
            {s.monto > 0 && <div style={{ fontSize: 13, fontWeight: 700 }}>S/ {s.monto.toFixed(2)}</div>}
          </div>
        ))}
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
            <select className="form-select" value={filtros.tipo} onChange={e => setF('tipo', e.target.value)} style={{ width: 150 }}>
              <option value="">Todos</option>
              <option value="boleta">Boleta</option>
              <option value="factura">Factura</option>
              <option value="nota_credito">Nota Crédito</option>
            </select>
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
              <tr><th>#</th><th>Tipo</th><th>Cliente</th><th>Doc.</th><th>Subtotal</th><th>IGV 18%</th><th>Total</th><th>Pago</th><th>Fecha</th></tr>
            </thead>
            <tbody>
              {!pedidos.length ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--gray-400)' }}>
                  Sin comprobantes en el período
                </td></tr>
              ) : pedidos.map(p => {
                const sub = p.subTotal || Math.round((p.total / 1.18) * 100) / 100
                const igv = p.totalIGV  || Math.round((p.total - sub) * 100) / 100
                return (
                  <tr key={p._id}>
                    <td><strong>#{p.numero}</strong></td>
                    <td>
                      <span className={`badge ${p.tipoComprobante === 'factura' ? 'badge-primary' : p.tipoComprobante === 'nota_credito' ? 'badge-danger' : 'badge-info'}`}>
                        {p.tipoComprobante}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>{p.clienteNombre || p.razonSocialCliente || '—'}</td>
                    <td style={{ fontSize: 12 }}>{p.clienteDoc || p.rucCliente || '—'}</td>
                    <td style={{ fontSize: 13 }}>S/ {sub.toFixed(2)}</td>
                    <td style={{ fontSize: 13 }}>S/ {igv.toFixed(2)}</td>
                    <td><strong style={{ color: 'var(--accent)' }}>S/ {p.total?.toFixed(2)}</strong></td>
                    <td style={{ fontSize: 12 }}>{p.metodoPago}</td>
                    <td style={{ fontSize: 11, color: 'var(--gray-500)' }}>
                      {p.creadoEn ? new Date(p.creadoEn).toLocaleString('es-PE', { timeZone: 'America/Lima', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nota facturación electrónica */}
      <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--gray-600)', borderLeft: '3px solid var(--info)' }}>
        <strong>📋 Facturación electrónica SUNAT:</strong> Los campos de serie, correlativo y hash SUNAT ya están preparados en la base de datos. Cuando actives Nubefact, cada boleta y factura emitida aquí generará el comprobante electrónico automáticamente.
      </div>
    </div>
  )
}
