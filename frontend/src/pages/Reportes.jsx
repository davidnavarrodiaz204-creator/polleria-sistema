import { useEffect, useState } from 'react'
import api from '../utils/api'

const PERIODOS = [
  { value:'semana', label:'Esta semana' },
  { value:'mes',    label:'Este mes' },
  { value:'año',    label:'Este año' },
]

export default function Reportes() {
  const [resumen, setResumen]   = useState(null)
  const [ventas, setVentas]     = useState(null)
  const [periodo, setPeriodo]   = useState('semana')
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    api.get('/reportes/resumen').then(r => setResumen(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    setCargando(true)
    api.get('/reportes/ventas?periodo=' + periodo)
      .then(r => setVentas(r.data))
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [periodo])

  const maxVenta = ventas?.porDia?.length
    ? Math.max(...ventas.porDia.map(d => d.ventas), 1)
    : 1

  const fmtFecha = (str) => {
    const d = new Date(str + 'T12:00:00')
    return d.toLocaleDateString('es-PE', { weekday:'short', day:'numeric', month:'short' })
  }

  const metodos = resumen?.porMetodo || {}

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Reportes</div>
          <div className="page-sub">Análisis de ventas y rendimiento</div>
        </div>
      </div>

      {/* STATS HOY */}
      <div className="grid-4" style={{ marginBottom:20 }}>
        {[
          { icon:'💰', label:'Ventas hoy',    val:`S/ ${(resumen?.ventasHoy||0).toFixed(2)}`,  color:'yellow' },
          { icon:'📋', label:'Pedidos hoy',   val: resumen?.pedidosHoy||0,                     color:'orange' },
          { icon:'📤', label:'Egresos hoy',   val:`S/ ${(resumen?.egresosHoy||0).toFixed(2)}`, color:'red' },
          { icon:'📊', label:'Utilidad hoy',  val:`S/ ${(resumen?.utilidadHoy||0).toFixed(2)}`,color:'green' },
        ].map((s,i) => (
          <div key={i} className="stat-card">
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div>
              <div className="stat-value" style={{ fontSize: typeof s.val==='string' && s.val.length>8 ? 18:26 }}>{s.val}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom:20 }}>

        {/* TOP PRODUCTOS */}
        <div className="card">
          <div className="card-title">Más vendidos hoy</div>
          {resumen?.topProductos?.length ? resumen.topProductos.map((p,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ width:24, height:24, borderRadius:'50%', background:'var(--primary-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, flexShrink:0 }}>{i+1}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{p.nombre}</div>
                <div style={{ height:6, background:'var(--gray-200)', borderRadius:3, marginTop:3 }}>
                  <div style={{ height:'100%', background:'var(--primary)', borderRadius:3, width:`${Math.min(100,(p.cantidad/(resumen.topProductos[0]?.cantidad||1))*100)}%`, transition:'width 0.5s' }} />
                </div>
              </div>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--accent)', minWidth:48, textAlign:'right' }}>{p.cantidad} uds</div>
            </div>
          )) : <div style={{ color:'var(--gray-400)', textAlign:'center', padding:20 }}>Sin ventas aún hoy</div>}
        </div>

        {/* MÉTODOS DE PAGO */}
        <div className="card">
          <div className="card-title">Pagos de hoy por método</div>
          {Object.keys(metodos).length ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {Object.entries(metodos).sort((a,b)=>b[1]-a[1]).map(([met, monto], i) => {
                const total = Object.values(metodos).reduce((s,v)=>s+v,0)
                const pct   = total ? Math.round((monto/total)*100) : 0
                const icons = { efectivo:'💵', yape:'📱', plin:'📱', tarjeta:'💳', transferencia:'🏦' }
                return (
                  <div key={i}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, fontWeight:600, marginBottom:4 }}>
                      <span>{icons[met]||'💰'} {met.charAt(0).toUpperCase()+met.slice(1)}</span>
                      <span style={{ color:'var(--success)' }}>S/ {monto.toFixed(2)} ({pct}%)</span>
                    </div>
                    <div style={{ height:8, background:'var(--gray-200)', borderRadius:4 }}>
                      <div style={{ height:'100%', background:'var(--primary)', borderRadius:4, width:`${pct}%`, transition:'width 0.5s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : <div style={{ color:'var(--gray-400)', textAlign:'center', padding:20 }}>Sin cobros registrados hoy</div>}

          {resumen?.totalClientes !== undefined && (
            <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid var(--gray-100)', display:'flex', justifyContent:'space-between', fontSize:14 }}>
              <span style={{ color:'var(--gray-600)' }}>Clientes registrados</span>
              <span style={{ fontWeight:700 }}>{resumen.totalClientes}</span>
            </div>
          )}
        </div>
      </div>

      {/* GRÁFICO POR PERIODO */}
      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
          <div className="card-title" style={{ margin:0 }}>Ventas por período</div>
          <div style={{ display:'flex', gap:6 }}>
            {PERIODOS.map(p => (
              <button key={p.value} onClick={() => setPeriodo(p.value)}
                style={{ padding:'6px 14px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer',
                  border:'2px solid',
                  borderColor: periodo===p.value ? 'var(--primary)' : 'var(--gray-300)',
                  background:  periodo===p.value ? 'var(--primary)' : 'white',
                }}>{p.label}</button>
            ))}
          </div>
        </div>

        {/* Totales del período */}
        {ventas && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
            {[
              { label:'Total ventas',  val:`S/ ${ventas.totalVentas.toFixed(2)}`,   color:'var(--success)' },
              { label:'Total egresos', val:`S/ ${ventas.totalEgresos.toFixed(2)}`,  color:'var(--danger)' },
              { label:'Utilidad',      val:`S/ ${ventas.utilidad.toFixed(2)}`,      color:'var(--accent)' },
              { label:'Pedidos',       val: ventas.totalPedidos,                    color:'var(--info)' },
            ].map((item,i) => (
              <div key={i} style={{ background:'var(--gray-50)', borderRadius:'var(--radius-sm)', padding:'10px 14px', textAlign:'center' }}>
                <div style={{ fontSize:11, color:'var(--gray-500)', marginBottom:4 }}>{item.label}</div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, color:item.color }}>{item.val}</div>
              </div>
            ))}
          </div>
        )}

        {/* Gráfico de barras */}
        {cargando ? (
          <div style={{ textAlign:'center', padding:40, color:'var(--gray-400)' }}>Cargando datos...</div>
        ) : ventas?.porDia?.length ? (
          <div style={{ overflowX:'auto' }}>
            <div style={{ display:'flex', alignItems:'flex-end', gap:8, minWidth: Math.max(ventas.porDia.length*60, 300), height:180, paddingBottom:30, position:'relative' }}>
              {/* Líneas de referencia */}
              {[0,25,50,75,100].map(pct => (
                <div key={pct} style={{ position:'absolute', left:0, right:0, bottom: 30 + (pct/100)*150, height:'1px', background:'var(--gray-200)', zIndex:0 }}>
                  <span style={{ position:'absolute', left:0, top:-8, fontSize:10, color:'var(--gray-400)' }}>
                    S/{((maxVenta*pct/100)).toFixed(0)}
                  </span>
                </div>
              ))}

              {ventas.porDia.map((dia, i) => {
                const hPct = Math.max((dia.ventas / maxVenta) * 100, 2)
                return (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4, zIndex:1, minWidth:50 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--accent)' }}>
                      {dia.ventas > 0 ? `S/${dia.ventas.toFixed(0)}` : ''}
                    </div>
                    <div style={{ width:'100%', maxWidth:40, background:'var(--primary)', borderRadius:'4px 4px 0 0', height: `${hPct}%`, minHeight:4, transition:'height 0.4s', position:'relative' }}
                      title={`Ventas: S/${dia.ventas.toFixed(2)}\nPedidos: ${dia.pedidos}\nEgresos: S/${dia.egresos.toFixed(2)}`}
                    />
                    <div style={{ fontSize:9, color:'var(--gray-500)', textAlign:'center', lineHeight:1.2 }}>
                      {fmtFecha(dia.fecha)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div style={{ textAlign:'center', padding:40, color:'var(--gray-400)' }}>Sin datos para este período</div>
        )}
      </div>
    </div>
  )
}
