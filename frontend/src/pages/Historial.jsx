/**
 * Historial.jsx — Todos los pedidos con filtros y exportación
 * Diferencia con Comprobantes: muestra tickets + todos los tipos, no solo legales
 * Autor: David Navarro Diaz
 */
import { useState } from 'react'
import api from '../utils/api'
import { imprimirBoleta } from '../utils/print'
import { useApp } from '../context/AppContext'

export default function Historial() {
  const { config }   = useApp()
  const hoy          = new Date().toISOString().split('T')[0]
  const [pedidos, setPedidos]   = useState([])
  const [cargando, setCargando] = useState(false)
  const [buscado, setBuscado]   = useState(false)
  const [detalle, setDetalle]   = useState(null)
  const [filtros, setFiltros]   = useState({ desde: hoy, hasta: hoy, tipo: '', estado: '', q: '' })

  const buscar = async () => {
    setCargando(true)
    try {
      const p = new URLSearchParams({ desde: filtros.desde, hasta: filtros.hasta, limit: '300' })
      if (filtros.tipo)   p.set('tipo',   filtros.tipo)
      if (filtros.estado) p.set('estado', filtros.estado)
      if (filtros.q)      p.set('q',      filtros.q)
      const { data } = await api.get('/pedidos/historial?' + p.toString())
      setPedidos(data)
      setBuscado(true)
    } catch { alert('Error al cargar historial') }
    finally { setCargando(false) }
  }

  const reimprimir = (p) => {
    if (p.tipoComprobante === 'ticket' || !p.tipoComprobante) {
      return alert('Los tickets no se reimprimen como comprobante legal. Ve a Comprobantes para boletas/facturas.')
    }
    imprimirBoleta({ ...p, ruc: p.clienteDoc?.length===11?p.clienteDoc:'', razonSocial: p.clienteNombre||'', vuelto:0 }, config)
  }

  const exportar = () => {
    if (!pedidos.length) return alert('Primero busca pedidos')
    const filas = [
      ['#','Tipo','Mesa','Productos','Total','Pago','Comprobante','Cliente','Doc','Mozo','Estado','Fecha'],
      ...pedidos.map(p=>[
        p.numero, p.tipo, p.mesaNumero||'',
        p.items?.map(i=>i.cantidad+'x '+i.nombre).join('; ')||'',
        p.total?.toFixed(2), p.metodoPago||'',
        p.tipoComprobante||'ticket',
        p.clienteNombre||'', p.clienteDoc||'', p.mozo||'', p.estado,
        p.creadoEn?new Date(p.creadoEn).toLocaleString('es-PE',{timeZone:'America/Lima'}):''
      ])
    ]
    const csv  = filas.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href=url; a.download=`historial-${filtros.desde}-${filtros.hasta}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const setF = (k,v) => setFiltros(f=>({...f,[k]:v}))
  const totalVentas = pedidos.filter(p=>p.pagado).reduce((s,p)=>s+p.total,0)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Historial de Pedidos</div>
          <div className="page-sub">
            {buscado ? `${pedidos.length} pedidos · ${pedidos.filter(p=>p.pagado).length} cobrados · S/ ${totalVentas.toFixed(2)}` : 'Todos los pedidos incluyendo tickets'}
          </div>
        </div>
        <button className="btn btn-ghost" onClick={exportar} disabled={!buscado}>📊 Exportar CSV</button>
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
            <select className="form-select" value={filtros.tipo} onChange={e=>setF('tipo',e.target.value)} style={{width:130}}>
              <option value="">Todos</option>
              <option value="mesa">Mesa</option>
              <option value="delivery">Delivery</option>
              <option value="para_llevar">Para llevar</option>
            </select>
          </div>
          <div className="form-group" style={{margin:0}}>
            <label className="form-label">Estado</label>
            <select className="form-select" value={filtros.estado} onChange={e=>setF('estado',e.target.value)} style={{width:140}}>
              <option value="">Todos</option>
              <option value="entregado">Entregado</option>
              <option value="cancelado">Cancelado</option>
              <option value="en_cocina">En cocina</option>
            </select>
          </div>
          <div className="form-group" style={{margin:0}}>
            <label className="form-label">Buscar</label>
            <input className="form-input" placeholder="Cliente, mozo, #..." value={filtros.q}
              onChange={e=>setF('q',e.target.value)} onKeyDown={e=>e.key==='Enter'&&buscar()}
              style={{width:170}}/>
          </div>
          <button className="btn btn-primary" onClick={buscar} disabled={cargando}>
            {cargando?'Buscando...':'🔍 Buscar'}
          </button>
        </div>
      </div>

      {/* Tabla */}
      {buscado ? (
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Tipo</th><th>Productos</th><th>Total</th>
                  <th>Pago</th><th>Comprobante</th><th>Cliente</th><th>Estado</th><th>Fecha</th><th></th></tr>
              </thead>
              <tbody>
                {!pedidos.length ? (
                  <tr><td colSpan={10} style={{textAlign:'center',padding:32,color:'var(--gray-400)'}}>
                    Sin pedidos en el rango seleccionado
                  </td></tr>
                ) : pedidos.map(p=>(
                  <tr key={p._id} style={{cursor:'pointer'}} onClick={()=>setDetalle(p)}>
                    <td><strong>#{p.numero}</strong></td>
                    <td>
                      <span className={`badge ${p.tipo==='mesa'?'badge-info':p.tipo==='delivery'?'badge-warning':'badge-primary'}`}>
                        {p.tipo==='mesa'?'Mesa '+(p.mesaNumero||''):p.tipo==='delivery'?'Delivery':'Llevar'}
                      </span>
                    </td>
                    <td style={{fontSize:12,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {p.items?.map(i=>i.cantidad+'x '+i.nombre).join(', ')}
                    </td>
                    <td><strong style={{color:'var(--accent)'}}>S/ {p.total?.toFixed(2)}</strong></td>
                    <td style={{fontSize:12}}>{p.metodoPago||'—'}</td>
                    <td>
                      <span className={`badge ${p.tipoComprobante==='factura'?'badge-primary':p.tipoComprobante==='boleta'?'badge-info':p.tipoComprobante==='nota_credito'?'badge-danger':'badge-warning'}`}>
                        {p.tipoComprobante||'ticket'}
                      </span>
                    </td>
                    <td style={{fontSize:12}}>{p.clienteNombre||'—'}</td>
                    <td>
                      <span className={`badge ${p.estado==='entregado'?'badge-success':p.estado==='cancelado'?'badge-danger':'badge-warning'}`}>
                        {p.estado}
                      </span>
                    </td>
                    <td style={{fontSize:11,color:'var(--gray-500)'}}>
                      {p.creadoEn?new Date(p.creadoEn).toLocaleString('es-PE',{timeZone:'America/Lima',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'—'}
                    </td>
                    <td onClick={e=>e.stopPropagation()}>
                      {(p.tipoComprobante==='boleta'||p.tipoComprobante==='factura'||p.tipoComprobante==='nota_credito') && (
                        <button className="btn btn-ghost btn-sm" onClick={()=>reimprimir(p)} title="Reimprimir">🖨️</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card" style={{textAlign:'center',padding:48,color:'var(--gray-400)'}}>
          <div style={{fontSize:40}}>🧾</div>
          <div style={{marginTop:10,fontSize:15,fontWeight:600}}>Selecciona fechas y haz clic en Buscar</div>
          <div style={{fontSize:13,marginTop:6}}>Aquí aparecen todos los pedidos incluyendo tickets</div>
        </div>
      )}

      {/* Modal detalle */}
      {detalle && (
        <div className="modal-overlay" onClick={()=>setDetalle(null)}>
          <div className="modal" style={{maxWidth:440}} onClick={e=>e.stopPropagation()}>
            <div className="modal-title">Pedido #{detalle.numero}</div>
            <div style={{marginBottom:12}}>
              {detalle.items?.map((item,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--gray-100)',fontSize:14}}>
                  <span>{item.cantidad}x {item.nombre}</span>
                  <span>S/ {(item.precio*item.cantidad).toFixed(2)}</span>
                </div>
              ))}
              <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0 0',fontWeight:800,fontSize:16}}>
                <span>TOTAL</span>
                <span style={{color:'var(--accent)'}}>S/ {detalle.total?.toFixed(2)}</span>
              </div>
            </div>
            <div style={{fontSize:13,color:'var(--gray-600)',lineHeight:2}}>
              <div>🧾 Comprobante: <strong>{detalle.tipoComprobante||'ticket'}</strong></div>
              <div>💳 Pago: <strong>{detalle.metodoPago}</strong></div>
              {detalle.clienteNombre&&<div>👤 Cliente: <strong>{detalle.clienteNombre}</strong> {detalle.clienteDoc&&`(${detalle.clienteDoc})`}</div>}
              {detalle.mozo&&<div>👨‍💼 Mozo: <strong>{detalle.mozo}</strong></div>}
              {detalle.nota&&<div>📝 Nota: <strong>{detalle.nota}</strong></div>}
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
              {(detalle.tipoComprobante==='boleta'||detalle.tipoComprobante==='factura') && (
                <button className="btn btn-ghost" onClick={()=>reimprimir(detalle)}>🖨️ Reimprimir</button>
              )}
              <button className="btn btn-primary" onClick={()=>setDetalle(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
