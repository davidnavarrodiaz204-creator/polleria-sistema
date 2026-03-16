import { useEffect, useState } from 'react'
import api from '../utils/api'

export default function Dashboard() {
  const [resumen, setResumen] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    api.get('/reportes/resumen').then(r => setResumen(r.data)).catch(() => {}).finally(() => setCargando(false))
  }, [])

  if (cargando) return <div className="page"><p>Cargando...</p></div>

  const hoy = new Date().toLocaleDateString('es-PE', { weekday:'long', day:'numeric', month:'long' })

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Buenos días 👋</div>
          <div className="page-sub" style={{textTransform:'capitalize'}}>{hoy}</div>
        </div>
      </div>

      <div className="grid-4" style={{marginBottom:20}}>
        <div className="stat-card">
          <div className="stat-icon yellow">💰</div>
          <div><div className="stat-value">S/ {(resumen?.ventasHoy||0).toFixed(2)}</div><div className="stat-label">Ventas hoy</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">🍗</div>
          <div><div className="stat-value">{resumen?.pedidosHoy||0}</div><div className="stat-label">Pedidos hoy</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">🪑</div>
          <div><div className="stat-value">{resumen?.mesasActivas||0}/{resumen?.mesasTotal||0}</div><div className="stat-label">Mesas activas</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">📈</div>
          <div><div className="stat-value">S/ {(resumen?.utilidadHoy||0).toFixed(2)}</div><div className="stat-label">Utilidad hoy</div></div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">🏆 Más vendidos hoy</div>
          {resumen?.topProductos?.length ? resumen.topProductos.map((p,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
              <div style={{width:24,height:24,borderRadius:6,background:'var(--primary-light)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#5D4037'}}>{i+1}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600}}>{p.nombre}</div>
                <div style={{height:6,background:'var(--gray-200)',borderRadius:3,marginTop:3,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${Math.min(100,(p.cantidad/(resumen.topProductos[0]?.cantidad||1))*100)}%`,background:'var(--primary)',borderRadius:3}}/>
                </div>
              </div>
              <span style={{fontSize:13,fontWeight:700,color:'var(--accent)'}}>{p.cantidad} uds</span>
            </div>
          )) : <p style={{color:'var(--gray-400)',fontSize:13}}>Sin datos aún</p>}
        </div>

        <div className="card">
          <div className="card-title">💵 Resumen financiero</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {[
              {label:'Total ventas', val:`S/ ${(resumen?.ventasHoy||0).toFixed(2)}`, color:'var(--success)'},
              {label:'Total egresos', val:`S/ ${(resumen?.egresosHoy||0).toFixed(2)}`, color:'var(--danger)'},
              {label:'Utilidad neta', val:`S/ ${(resumen?.utilidadHoy||0).toFixed(2)}`, color:'var(--info)'},
              {label:'Delivery activos', val:resumen?.deliveryActivo||0, color:'var(--warning)'},
            ].map((r,i) => (
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--gray-100)'}}>
                <span style={{fontSize:14,color:'var(--gray-600)'}}>{r.label}</span>
                <span style={{fontSize:16,fontWeight:800,color:r.color}}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
