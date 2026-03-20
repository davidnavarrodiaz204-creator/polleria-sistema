/**
 * Comprobantes.jsx — Boletas y facturas emitidas
 * Búsqueda por fecha ✓  Reimprimir ✓  Exportar CSV/Excel ✓  Nota de Crédito → /nota-credito
 * Autor: David Navarro Diaz
 */
import { useState } from 'react'
import api from '../utils/api'
import { imprimirBoleta } from '../utils/print'
import { useApp } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'

export default function Comprobantes() {
  const { config }   = useApp()
  const navigate     = useNavigate()
  const hoy          = new Date().toISOString().split('T')[0]
  const [pedidos, setPedidos]   = useState([])
  const [cargando, setCargando] = useState(false)
  const [buscado, setBuscado]   = useState(false)
  const [filtros, setFiltros]   = useState({ desde: hoy, hasta: hoy, tipo: '' })

  const buscar = async () => {
    setCargando(true)
    try {
      const p = new URLSearchParams({
        desde: filtros.desde,
        hasta: filtros.hasta,
      })
      const { data } = await api.get('/pedidos/comprobantes?' + p.toString())
      const filtrado = filtros.tipo ? data.filter(d => d.tipoComprobante === filtros.tipo) : data
      setPedidos(filtrado)
      setBuscado(true)
    } catch { alert('Error al buscar') }
    finally { setCargando(false) }
  }

  const reimprimir = (p) => {
    imprimirBoleta({
      ...p,
      ruc:         p.clienteDoc?.length === 11 ? p.clienteDoc : '',
      razonSocial: p.clienteNombre || '',
      vuelto:      0,
    }, config)
  }

  const exportar = () => {
    if (!pedidos.length) return alert('Primero busca comprobantes')
    const filas = [
      ['#','Tipo','Cliente','Doc','Subtotal','IGV','Total','Pago','Fecha'],
      ...pedidos.map(p => {
        const sub = p.subTotal || +(p.total/1.18).toFixed(2)
        const igv = p.totalIGV  || +(p.total - sub).toFixed(2)
        return [
          p.numero, p.tipoComprobante,
          p.clienteNombre||'', p.clienteDoc||'',
          sub.toFixed(2), igv.toFixed(2), p.total.toFixed(2),
          p.metodoPago,
          p.creadoEn ? new Date(p.creadoEn).toLocaleString('es-PE',{timeZone:'America/Lima'}) : ''
        ]
      })
    ]
    const csv  = filas.map(r => r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href=url; a.download=`comprobantes-${filtros.desde}-${filtros.hasta}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const setF = (k,v) => setFiltros(f=>({...f,[k]:v}))
  const totalBoletas  = pedidos.filter(p=>p.tipoComprobante==='boleta').reduce((s,p)=>s+p.total,0)
  const totalFacturas = pedidos.filter(p=>p.tipoComprobante==='factura').reduce((s,p)=>s+p.total,0)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Comprobantes Emitidos</div>
          <div className="page-sub">Boletas y facturas con IGV desglosado</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-ghost" onClick={exportar} disabled={!buscado}>📊 Exportar CSV</button>
          <button className="btn btn-primary" onClick={()=>navigate('/nota-credito')}>↩️ Nota de Crédito</button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'flex-end'}}>
          <div className="form-group" style={{margin:0}}>
            <label className="form-label">Desde</label>
            <input type="date" className="form-input" value={filtros.desde}
              onChange={e=>setF('desde',e.target.value)} style={{width:150}}/>
          </div>
          <div className="form-group" style={{margin:0}}>
            <label className="form-label">Hasta</label>
            <input type="date" className="form-input" value={filtros.hasta}
              onChange={e=>setF('hasta',e.target.value)} style={{width:150}}/>
          </div>
          <div className="form-group" style={{margin:0}}>
            <label className="form-label">Tipo</label>
            <select className="form-select" value={filtros.tipo} onChange={e=>setF('tipo',e.target.value)} style={{width:160}}>
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

      {/* Resumen — solo si ya buscó */}
      {buscado && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:16}}>
          {[
            {l:'Boletas',   n:pedidos.filter(p=>p.tipoComprobante==='boleta').length,   m:totalBoletas,  c:'var(--info)'},
            {l:'Facturas',  n:pedidos.filter(p=>p.tipoComprobante==='factura').length,  m:totalFacturas, c:'var(--primary)'},
            {l:'N. Crédito',n:pedidos.filter(p=>p.tipoComprobante==='nota_credito').length, m:0, c:'var(--danger)'},
            {l:'Total',     n:pedidos.length, m:totalBoletas+totalFacturas, c:'var(--success)'},
          ].map((s,i)=>(
            <div key={i} className="card" style={{textAlign:'center',padding:'10px 14px'}}>
              <div style={{fontSize:22,fontWeight:800,color:s.c}}>{s.n}</div>
              <div style={{fontSize:12,color:'var(--gray-500)'}}>{s.l}</div>
              {s.m>0&&<div style={{fontSize:13,fontWeight:700,marginTop:2}}>S/ {s.m.toFixed(2)}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Tabla */}
      {buscado && (
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Tipo</th><th>Cliente</th><th>Doc</th>
                  <th>Subtotal</th><th>IGV</th><th>Total</th><th>Pago</th><th>Fecha</th><th></th></tr>
              </thead>
              <tbody>
                {!pedidos.length ? (
                  <tr><td colSpan={10} style={{textAlign:'center',padding:32,color:'var(--gray-400)'}}>
                    Sin comprobantes en el período
                  </td></tr>
                ) : pedidos.map(p => {
                  const sub = p.subTotal || +(p.total/1.18).toFixed(2)
                  const igv = p.totalIGV  || +(p.total-sub).toFixed(2)
                  return (
                    <tr key={p._id}>
                      <td><strong>#{p.numero}</strong></td>
                      <td>
                        <span className={`badge ${p.tipoComprobante==='factura'?'badge-primary':p.tipoComprobante==='nota_credito'?'badge-danger':'badge-info'}`}>
                          {p.tipoComprobante}
                        </span>
                      </td>
                      <td style={{fontSize:13}}>{p.clienteNombre||'—'}</td>
                      <td style={{fontSize:12}}>{p.clienteDoc||'—'}</td>
                      <td>S/ {sub.toFixed(2)}</td>
                      <td>S/ {igv.toFixed(2)}</td>
                      <td><strong style={{color:'var(--accent)'}}>S/ {p.total?.toFixed(2)}</strong></td>
                      <td style={{fontSize:12}}>{p.metodoPago}</td>
                      <td style={{fontSize:11,color:'var(--gray-500)'}}>
                        {p.creadoEn?new Date(p.creadoEn).toLocaleString('es-PE',{timeZone:'America/Lima',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'—'}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={()=>reimprimir(p)} title="Reimprimir">🖨️</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!buscado && (
        <div className="card" style={{textAlign:'center',padding:48,color:'var(--gray-400)'}}>
          <div style={{fontSize:40}}>📄</div>
          <div style={{marginTop:10,fontSize:15,fontWeight:600}}>Selecciona un rango de fechas y haz clic en Buscar</div>
        </div>
      )}
    </div>
  )
}
