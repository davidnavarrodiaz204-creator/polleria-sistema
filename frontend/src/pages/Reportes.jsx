import { useEffect, useState } from 'react'
import api from '../utils/api'

export default function Reportes() {
  const [resumen, setResumen] = useState(null)

  useEffect(() => {
    api.get('/reportes/resumen').then(r => setResumen(r.data)).catch(()=>{})
  }, [])

  const categorias = resumen?.porCategoria || {}

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">Reportes 📈</div><div className="page-sub">Resumen del día de hoy</div></div>
      </div>

      <div className="grid-4" style={{ marginBottom:20 }}>
        <div className="stat-card"><div className="stat-icon yellow">💰</div><div><div className="stat-value">S/ {(resumen?.ventasHoy||0).toFixed(2)}</div><div className="stat-label">Ventas hoy</div></div></div>
        <div className="stat-card"><div className="stat-icon orange">📋</div><div><div className="stat-value">{resumen?.pedidosHoy||0}</div><div className="stat-label">Pedidos hoy</div></div></div>
        <div className="stat-card"><div className="stat-icon red">📤</div><div><div className="stat-value">S/ {(resumen?.egresosHoy||0).toFixed(2)}</div><div className="stat-label">Egresos hoy</div></div></div>
        <div className="stat-card"><div className="stat-icon green">📊</div><div><div className="stat-value">S/ {(resumen?.utilidadHoy||0).toFixed(2)}</div><div className="stat-label">Utilidad hoy</div></div></div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">🏆 Top productos hoy</div>
          {resumen?.topProductos?.length ? resumen.topProductos.map((p,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ width:24, height:24, borderRadius:'50%', background:'var(--primary-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, flexShrink:0 }}>{i+1}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{p.nombre}</div>
                <div style={{ height:6, background:'var(--gray-200)', borderRadius:3, marginTop:3 }}>
                  <div style={{ height:'100%', background:'var(--primary)', borderRadius:3, width:`${Math.min(100,(p.cantidad/(resumen.topProductos[0]?.cantidad||1))*100)}%` }} />
                </div>
              </div>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--accent)', minWidth:48, textAlign:'right' }}>{p.cantidad} uds</div>
            </div>
          )) : <div style={{ color:'var(--gray-400)', textAlign:'center', padding:20 }}>Sin ventas aún</div>}
        </div>

        <div className="card">
          <div className="card-title">📊 Ventas por categoría</div>
          {Object.keys(categorias).length ? Object.entries(categorias).sort((a,b)=>b[1]-a[1]).map(([cat, monto], i) => (
            <div key={i} style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, fontWeight:600, marginBottom:4 }}>
                <span>{cat}</span><span style={{ color:'var(--accent)' }}>S/ {monto.toFixed(2)}</span>
              </div>
              <div style={{ height:8, background:'var(--gray-200)', borderRadius:4 }}>
                <div style={{ height:'100%', background:'var(--primary)', borderRadius:4, width:`${Math.min(100,(monto/(Math.max(...Object.values(categorias))))*100)}%` }} />
              </div>
            </div>
          )) : <div style={{ color:'var(--gray-400)', textAlign:'center', padding:20 }}>Sin datos</div>}
        </div>
      </div>
    </div>
  )
}
