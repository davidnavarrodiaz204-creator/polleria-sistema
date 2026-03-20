/**
 * Reportes.jsx — Panel de reportes con gráficos y exportación PDF
 * Autor: David Navarro Diaz
 */
import { useEffect, useState, useRef } from 'react'
import api from '../utils/api'

const PERIODOS = [
  { value:'semana', label:'Esta semana' },
  { value:'mes',    label:'Este mes'    },
  { value:'año',    label:'Este año'    },
]

const METODO_ICONS = { efectivo:'💵', yape:'📱', plin:'📲', tarjeta:'💳', transferencia:'🏦' }
const METODO_COLORS = { efectivo:'#22c55e', yape:'#8b5cf6', plin:'#3b82f6', tarjeta:'#f59e0b', transferencia:'#06b6d4' }

export default function Reportes() {
  const [resumen, setResumen]   = useState(null)
  const [ventas,  setVentas]    = useState(null)
  const [periodo, setPeriodo]   = useState('semana')
  const [cargando, setCargando] = useState(false)
  const [exportando, setExportando] = useState(false)
  const reporteRef = useRef(null)

  useEffect(() => {
    api.get('/reportes/resumen').then(r => setResumen(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    setCargando(true)
    api.get('/reportes/ventas?periodo=' + periodo)
      .then(r => setVentas(r.data)).catch(() => {}).finally(() => setCargando(false))
  }, [periodo])

  // Exportar a PDF usando la API de impresión del navegador
  const exportarPDF = () => {
    setExportando(true)
    setTimeout(() => {
      window.print()
      setExportando(false)
    }, 300)
  }

  // Exportar a CSV
  const exportarCSV = () => {
    if (!ventas?.porDia?.length) return alert('Sin datos para exportar')
    const filas = [
      ['Fecha','Ventas S/','Pedidos','Egresos S/','Utilidad S/'],
      ...ventas.porDia.map(d => [d.fecha, d.ventas.toFixed(2), d.pedidos, d.egresos.toFixed(2), d.utilidad.toFixed(2)]),
      ['TOTAL', ventas.totalVentas.toFixed(2), ventas.totalPedidos, ventas.totalEgresos.toFixed(2), ventas.utilidad.toFixed(2)]
    ]
    const csv  = filas.map(r => r.join(',')).join('\n')
    const blob = new Blob(['\ufeff'+csv], { type:'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `reporte-${periodo}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const maxVenta    = ventas?.porDia?.length ? Math.max(...ventas.porDia.map(d => d.ventas), 1) : 1
  const metodos     = resumen?.porMetodo || {}
  const totalMetodo = Object.values(metodos).reduce((s,v) => s+v, 0)

  const fmtFecha = (str) => {
    const d = new Date(str + 'T12:00:00')
    return d.toLocaleDateString('es-PE', { weekday:'short', day:'numeric', month:'short' })
  }

  // Gráfico de dona SVG para métodos de pago
  const DonaMetodos = () => {
    if (!Object.keys(metodos).length) return (
      <div style={{textAlign:'center',padding:32,color:'var(--gray-400)',fontSize:13}}>Sin cobros hoy</div>
    )
    const entries = Object.entries(metodos).sort((a,b) => b[1]-a[1])
    const radio = 60, cx = 80, cy = 80, grosor = 22
    let acum = 0
    const arcos = entries.map(([met, monto]) => {
      const pct   = monto / totalMetodo
      const inicio = acum
      acum += pct
      return { met, monto, pct, inicio }
    })

    const arcPath = (inicio, fin, r, cx, cy) => {
      const a1 = (inicio * 2 * Math.PI) - Math.PI/2
      const a2 = (fin    * 2 * Math.PI) - Math.PI/2
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1)
      const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2)
      const large = (fin - inicio) > 0.5 ? 1 : 0
      return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
    }

    return (
      <div style={{display:'flex',gap:20,alignItems:'center',flexWrap:'wrap'}}>
        <svg width={160} height={160} viewBox="0 0 160 160">
          {arcos.map(({met,pct,inicio},i) => (
            <path key={i}
              d={arcPath(inicio, inicio+pct, radio, cx, cy)}
              stroke={METODO_COLORS[met]||'#94a3b8'}
              strokeWidth={grosor} fill="none" strokeLinecap="butt"
              opacity={pct > 0 ? 1 : 0}
            />
          ))}
          <text x={cx} y={cy-6}  textAnchor="middle" fontSize={11} fill="var(--gray-500)">Total</text>
          <text x={cx} y={cy+10} textAnchor="middle" fontSize={14} fontWeight="800" fill="var(--texto)">
            S/{totalMetodo.toFixed(0)}
          </text>
        </svg>
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:8}}>
          {arcos.map(({met,monto,pct},i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:13}}>
              <div style={{width:12,height:12,borderRadius:3,background:METODO_COLORS[met]||'#94a3b8',flexShrink:0}}/>
              <span style={{flex:1,fontWeight:600,textTransform:'capitalize'}}>
                {METODO_ICONS[met]||'💰'} {met}
              </span>
              <span style={{color:'var(--success)',fontWeight:700}}>S/ {monto.toFixed(2)}</span>
              <span style={{color:'var(--gray-400)',fontSize:11}}>{Math.round(pct*100)}%</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Estilos de impresión */}
      <style>{`
        @media print {
          nav, .topbar, .sidebar, .no-print, button { display:none!important; }
          .page { padding:0!important; }
          .card { break-inside:avoid; border:1px solid #ddd!important; box-shadow:none!important; }
          body { font-size:12px; }
        }
      `}</style>

      <div className="page" ref={reporteRef}>
        <div className="page-header no-print">
          <div>
            <div className="page-title">Reportes</div>
            <div className="page-sub">Análisis de ventas y rendimiento</div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn btn-ghost" onClick={exportarCSV}>📊 Excel</button>
            <button className="btn btn-primary" onClick={exportarPDF} disabled={exportando}>
              {exportando ? 'Preparando...' : '🖨️ Imprimir / PDF'}
            </button>
          </div>
        </div>

        {/* Header solo para impresión */}
        <div style={{display:'none'}} className="print-header">
          <div style={{textAlign:'center',marginBottom:20,paddingBottom:16,borderBottom:'2px solid #000'}}>
            <div style={{fontSize:22,fontWeight:900}}>REPORTE DE VENTAS</div>
            <div style={{fontSize:14,color:'#555',marginTop:4}}>
              Período: {periodo.toUpperCase()} · Generado: {new Date().toLocaleString('es-PE',{timeZone:'America/Lima'})}
            </div>
          </div>
        </div>
        <style>{`@media print { .print-header { display:block!important; } }`}</style>

        {/* STATS HOY */}
        <div className="grid-4" style={{marginBottom:20}}>
          {[
            { icon:'💰', label:'Ventas hoy',   val:`S/ ${(resumen?.ventasHoy||0).toFixed(2)}`,  color:'yellow' },
            { icon:'📋', label:'Pedidos hoy',  val: resumen?.pedidosHoy||0,                     color:'orange' },
            { icon:'📤', label:'Egresos hoy',  val:`S/ ${(resumen?.egresosHoy||0).toFixed(2)}`, color:'red'    },
            { icon:'📊', label:'Utilidad hoy', val:`S/ ${(resumen?.utilidadHoy||0).toFixed(2)}`,color:'green'  },
          ].map((s,i) => (
            <div key={i} className="stat-card">
              <div className={`stat-icon ${s.color}`}>{s.icon}</div>
              <div>
                <div className="stat-value" style={{fontSize:typeof s.val==='string'&&s.val.length>8?18:26}}>{s.val}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid-2" style={{marginBottom:20}}>

          {/* TOP PRODUCTOS */}
          <div className="card">
            <div className="card-title">🏆 Más vendidos hoy</div>
            {resumen?.topProductos?.length ? resumen.topProductos.map((p,i) => (
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                <div style={{width:26,height:26,borderRadius:'50%',background:i===0?'#FFD700':i===1?'#C0C0C0':i===2?'#CD7F32':'var(--gray-200)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,flexShrink:0}}>
                  {i+1}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600}}>{p.nombre}</div>
                  <div style={{height:8,background:'var(--gray-200)',borderRadius:4,marginTop:4,overflow:'hidden'}}>
                    <div style={{height:'100%',background:'var(--primary)',borderRadius:4,width:`${Math.min(100,(p.cantidad/(resumen.topProductos[0]?.cantidad||1))*100)}%`,transition:'width .5s'}}/>
                  </div>
                </div>
                <div style={{fontSize:14,fontWeight:800,color:'var(--accent)',minWidth:52,textAlign:'right'}}>{p.cantidad} uds</div>
              </div>
            )) : <div style={{color:'var(--gray-400)',textAlign:'center',padding:24,fontSize:13}}>Sin ventas aún hoy</div>}
          </div>

          {/* MÉTODOS DE PAGO — gráfico dona */}
          <div className="card">
            <div className="card-title">💳 Métodos de pago — hoy</div>
            <DonaMetodos/>
            {resumen?.totalClientes !== undefined && (
              <div style={{marginTop:16,paddingTop:12,borderTop:'1px solid var(--gray-100)',display:'flex',justifyContent:'space-between',fontSize:14}}>
                <span style={{color:'var(--gray-600)'}}>Clientes registrados</span>
                <span style={{fontWeight:700}}>{resumen.totalClientes}</span>
              </div>
            )}
          </div>
        </div>

        {/* GRÁFICO POR PERÍODO */}
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:10}}>
            <div className="card-title" style={{margin:0}}>📈 Ventas por período</div>
            <div style={{display:'flex',gap:6}} className="no-print">
              {PERIODOS.map(p => (
                <button key={p.value} onClick={() => setPeriodo(p.value)}
                  style={{padding:'6px 14px',borderRadius:20,fontSize:13,fontWeight:600,cursor:'pointer',border:'2px solid',
                    borderColor: periodo===p.value ? 'var(--primary)' : 'var(--gray-300)',
                    background:  periodo===p.value ? 'var(--primary)' : 'white',
                  }}>{p.label}</button>
              ))}
            </div>
          </div>

          {/* Totales del período */}
          {ventas && (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:12,marginBottom:24}}>
              {[
                { label:'Total ventas',  val:`S/ ${ventas.totalVentas.toFixed(2)}`,  color:'var(--success)', bg:'#f0fdf4' },
                { label:'Total egresos', val:`S/ ${ventas.totalEgresos.toFixed(2)}`, color:'var(--danger)',  bg:'#fef2f2' },
                { label:'Utilidad',      val:`S/ ${ventas.utilidad.toFixed(2)}`,     color:'var(--accent)',  bg:'#fffbeb' },
                { label:'Pedidos',       val: ventas.totalPedidos,                   color:'var(--info)',    bg:'#eff6ff' },
              ].map((item,i) => (
                <div key={i} style={{background:item.bg,borderRadius:'var(--radius-sm)',padding:'12px 16px',textAlign:'center'}}>
                  <div style={{fontSize:11,color:'var(--gray-500)',marginBottom:4,fontWeight:600}}>{item.label}</div>
                  <div style={{fontSize:20,fontWeight:800,color:item.color}}>{item.val}</div>
                </div>
              ))}
            </div>
          )}

          {/* Gráfico de barras con línea de egresos */}
          {cargando ? (
            <div style={{textAlign:'center',padding:48,color:'var(--gray-400)'}}>Cargando datos...</div>
          ) : ventas?.porDia?.length ? (
            <div style={{overflowX:'auto'}}>
              <div style={{display:'flex',alignItems:'flex-end',gap:6,minWidth:Math.max(ventas.porDia.length*64,300),height:200,paddingBottom:32,position:'relative'}}>
                {/* Líneas de referencia */}
                {[0,25,50,75,100].map(pct => (
                  <div key={pct} style={{position:'absolute',left:40,right:0,bottom:32+(pct/100)*160,height:'1px',background:'var(--gray-200)',zIndex:0}}>
                    <span style={{position:'absolute',left:-40,top:-8,fontSize:10,color:'var(--gray-400)',width:36,textAlign:'right'}}>
                      S/{(maxVenta*pct/100).toFixed(0)}
                    </span>
                  </div>
                ))}

                {ventas.porDia.map((dia,i) => {
                  const hPct    = Math.max((dia.ventas/maxVenta)*100, 2)
                  const egresPct= Math.min((dia.egresos/maxVenta)*100, 100)
                  return (
                    <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,zIndex:1,minWidth:52}}>
                      {dia.ventas > 0 && (
                        <div style={{fontSize:9,fontWeight:700,color:'var(--success)',textAlign:'center'}}>
                          S/{dia.ventas.toFixed(0)}
                        </div>
                      )}
                      <div style={{width:'100%',maxWidth:36,position:'relative',display:'flex',flexDirection:'column',justifyContent:'flex-end',height:`${hPct}%`,minHeight:4}}>
                        {/* Barra ventas */}
                        <div style={{width:'100%',height:'100%',background:'var(--primary)',borderRadius:'4px 4px 0 0',transition:'height .4s'}}
                          title={`Ventas: S/${dia.ventas.toFixed(2)}\nPedidos: ${dia.pedidos}\nEgresos: S/${dia.egresos.toFixed(2)}`}/>
                        {/* Barra egresos encima */}
                        {dia.egresos > 0 && (
                          <div style={{position:'absolute',bottom:0,left:0,right:0,height:`${(dia.egresos/dia.ventas)*100}%`,background:'var(--danger)',opacity:.7,borderRadius:'4px 4px 0 0'}}/>
                        )}
                      </div>
                      <div style={{fontSize:9,color:'var(--gray-500)',textAlign:'center',lineHeight:1.2,marginTop:2}}>
                        {fmtFecha(dia.fecha)}
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Leyenda */}
              <div style={{display:'flex',gap:16,justifyContent:'center',marginTop:8,fontSize:12}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <div style={{width:14,height:14,borderRadius:3,background:'var(--primary)'}}/>
                  <span>Ventas</span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <div style={{width:14,height:14,borderRadius:3,background:'var(--danger)',opacity:.7}}/>
                  <span>Egresos</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{textAlign:'center',padding:48,color:'var(--gray-400)'}}>Sin datos para este período</div>
          )}
        </div>

        {/* RANKING MOZOS */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginTop:16,marginBottom:0}}>

          {/* Ranking hoy */}
          <div className="card">
            <div className="card-title">👨‍💼 Ranking de mozos — hoy</div>
            {resumen?.topMozos?.length ? (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {resumen.topMozos.map((m,i) => (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{
                      width:30,height:30,borderRadius:'50%',flexShrink:0,
                      background:i===0?'#FFD700':i===1?'#C0C0C0':i===2?'#CD7F32':'var(--gray-200)',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:14,fontWeight:900,
                    }}>
                      {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:14}}>{m.nombre}</div>
                      <div style={{height:6,background:'var(--gray-200)',borderRadius:3,marginTop:3,overflow:'hidden'}}>
                        <div style={{
                          height:'100%',borderRadius:3,
                          background:i===0?'#F5C518':i===1?'#94a3b8':'var(--primary)',
                          width:`${Math.min(100,(m.monto/(resumen.topMozos[0]?.monto||1))*100)}%`,
                          transition:'width .5s'
                        }}/>
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontWeight:800,color:'var(--success)',fontSize:14}}>S/ {m.monto.toFixed(2)}</div>
                      <div style={{fontSize:11,color:'var(--gray-400)'}}>{m.pedidos} pedidos</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{textAlign:'center',padding:24,color:'var(--gray-400)',fontSize:13}}>
                Sin ventas registradas hoy
              </div>
            )}
          </div>

          {/* Ranking del período */}
          <div className="card">
            <div className="card-title">🏆 Ranking mozos — {periodo === 'semana' ? 'esta semana' : periodo === 'mes' ? 'este mes' : 'este año'}</div>
            {ventas?.topMozos?.length ? (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {ventas.topMozos.map((m,i) => (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{
                      width:30,height:30,borderRadius:'50%',flexShrink:0,
                      background:i===0?'#FFD700':i===1?'#C0C0C0':i===2?'#CD7F32':'var(--gray-200)',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:14,fontWeight:900,
                    }}>
                      {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:14}}>{m.nombre}</div>
                      <div style={{height:6,background:'var(--gray-200)',borderRadius:3,marginTop:3,overflow:'hidden'}}>
                        <div style={{
                          height:'100%',borderRadius:3,
                          background:i===0?'#F5C518':i===1?'#94a3b8':'var(--primary)',
                          width:`${Math.min(100,(m.monto/(ventas.topMozos[0]?.monto||1))*100)}%`,
                          transition:'width .5s'
                        }}/>
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontWeight:800,color:'var(--success)',fontSize:14}}>S/ {m.monto.toFixed(2)}</div>
                      <div style={{fontSize:11,color:'var(--gray-400)'}}>{m.pedidos} pedidos</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{textAlign:'center',padding:24,color:'var(--gray-400)',fontSize:13}}>
                Sin datos para este período
              </div>
            )}
          </div>
        </div>

        {/* TABLA DETALLE para PDF */}
        {ventas?.porDia?.length > 0 && (
          <div className="card" style={{marginTop:16}}>
            <div className="card-title">📋 Detalle por día</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th><th>Pedidos</th>
                    <th style={{textAlign:'right'}}>Ventas</th>
                    <th style={{textAlign:'right'}}>Egresos</th>
                    <th style={{textAlign:'right'}}>Utilidad</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.porDia.map((d,i) => (
                    <tr key={i}>
                      <td style={{fontSize:13}}>{fmtFecha(d.fecha)}</td>
                      <td style={{fontSize:13}}>{d.pedidos}</td>
                      <td style={{textAlign:'right',color:'var(--success)',fontWeight:600}}>S/ {d.ventas.toFixed(2)}</td>
                      <td style={{textAlign:'right',color:'var(--danger)',fontSize:13}}>S/ {d.egresos.toFixed(2)}</td>
                      <td style={{textAlign:'right',fontWeight:700,color:d.utilidad>=0?'var(--accent)':'var(--danger)'}}>
                        S/ {d.utilidad.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {/* Fila total */}
                  <tr style={{borderTop:'2px solid var(--gray-300)',background:'var(--gray-50)'}}>
                    <td style={{fontWeight:800}}>TOTAL</td>
                    <td style={{fontWeight:800}}>{ventas.totalPedidos}</td>
                    <td style={{textAlign:'right',fontWeight:800,color:'var(--success)'}}>S/ {ventas.totalVentas.toFixed(2)}</td>
                    <td style={{textAlign:'right',fontWeight:800,color:'var(--danger)'}}>S/ {ventas.totalEgresos.toFixed(2)}</td>
                    <td style={{textAlign:'right',fontWeight:800,color:'var(--accent)'}}>S/ {ventas.utilidad.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
