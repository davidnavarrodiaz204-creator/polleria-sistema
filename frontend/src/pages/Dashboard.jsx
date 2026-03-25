/**
 * Dashboard.jsx — Panel principal en tiempo real
 * Se actualiza automáticamente cuando hay nuevos pedidos, cobros o cambios de mesa
 * usando Socket.io — sin necesidad de recargar la página.
 * Autor: David Navarro Diaz
 */
import { useEffect, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import api from '../utils/api'

export default function Dashboard() {
  const [resumen, setResumen]   = useState(null)
  const [cargando, setCargando] = useState(true)
  const [ultimaAct, setUltimaAct] = useState(null)
  const [pulso, setPulso]       = useState(false) // animación al actualizar

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/reportes/resumen')
      setResumen(data)
      setUltimaAct(new Date())
      // Pulso visual para indicar que se actualizó
      setPulso(true)
      setTimeout(() => setPulso(false), 600)
    } catch(e) {}
    finally { setCargando(false) }
  }, [])

  // Carga inicial
  useEffect(() => { cargar() }, [cargar])

  // Socket.io — escuchar eventos en tiempo real
  useEffect(() => {
    const BASE   = import.meta.env.VITE_API_URL || ''
    const token  = localStorage.getItem('token')
    const socket = io(BASE, { auth: { token } })

    // Eventos que disparan actualización del dashboard
    socket.on('nuevo_pedido',        () => cargar())
    socket.on('pedido_listo',        () => cargar())
    socket.on('mesa_actualizada',    () => cargar())
    socket.on('caja_actualizada',    () => cargar())
    socket.on('delivery_actualizado',() => cargar())

    // Actualización automática cada 60 segundos como respaldo
    const intervalo = setInterval(cargar, 60000)

    return () => {
      socket.disconnect()
      clearInterval(intervalo)
    }
  }, [cargar])

  const hoy = new Date().toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días 👋' : hora < 19 ? 'Buenas tardes 👋' : 'Buenas noches 🌙'

  const horaActualizacion = ultimaAct
    ? ultimaAct.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—'

  if (cargando) return (
    <div className="page" style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:48}}>🍗</div>
        <div style={{marginTop:12,color:'var(--gray-500)'}}>Cargando dashboard...</div>
      </div>
    </div>
  )

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">{saludo}</div>
          <div className="page-sub" style={{textTransform:'capitalize'}}>{hoy}</div>
        </div>
        {/* Indicador de tiempo real */}
        <div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--gray-500)'}}>
          <div style={{
            width:8, height:8, borderRadius:'50%',
            background: pulso ? 'var(--success)' : '#22c55e',
            boxShadow: pulso ? '0 0 8px #22c55e' : 'none',
            transition: 'all .3s',
            animation: 'pulse 2s infinite'
          }}/>
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
          <span>En vivo · {horaActualizacion}</span>
          <button onClick={cargar} style={{background:'none',border:'1px solid var(--gray-200)',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:11,color:'var(--gray-600)'}}>
            ↻ Actualizar
          </button>
        </div>
      </div>

      {/* Stats principales */}
      <div className="grid-4" style={{marginBottom:20}}>
        {[
          { icon:'💰', val:`S/ ${(resumen?.ventasHoy||0).toFixed(2)}`, label:'Ventas hoy',     color:'yellow' },
          { icon:'🍗', val:resumen?.pedidosHoy||0,                      label:'Pedidos hoy',    color:'orange' },
          { icon:'🪑', val:`${resumen?.mesasActivas||0}/${resumen?.mesasTotal||0}`, label:'Mesas activas', color:'green' },
          { icon:'📈', val:`S/ ${(resumen?.utilidadHoy||0).toFixed(2)}`,label:'Utilidad hoy',  color:'blue'   },
        ].map((s,i) => (
          <div key={i} className="stat-card" style={{
            transition:'transform .2s',
            transform: pulso ? 'scale(1.02)' : 'scale(1)',
          }}>
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div>
              <div className="stat-value">{s.val}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* Más vendidos */}
        <div className="card">
          <div className="card-title">🏆 Más vendidos hoy</div>
          {resumen?.topProductos?.length ? resumen.topProductos.map((p,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
              <div style={{width:24,height:24,borderRadius:6,background:'var(--primary-light)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#5D4037'}}>{i+1}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600}}>{p.nombre}</div>
                <div style={{height:6,background:'var(--gray-200)',borderRadius:3,marginTop:3,overflow:'hidden'}}>
                  <div style={{
                    height:'100%',
                    width:`${Math.min(100,(p.cantidad/(resumen.topProductos[0]?.cantidad||1))*100)}%`,
                    background:'var(--primary)',borderRadius:3,
                    transition:'width .5s ease'
                  }}/>
                </div>
              </div>
              <span style={{fontSize:13,fontWeight:700,color:'var(--accent)'}}>{p.cantidad} uds</span>
            </div>
          )) : (
            <div style={{textAlign:'center',padding:24,color:'var(--gray-400)'}}>
              <div style={{fontSize:32}}>📊</div>
              <div style={{fontSize:13,marginTop:8}}>Sin ventas aún hoy</div>
            </div>
          )}
        </div>

        {/* Resumen financiero */}
        <div className="card">
          <div className="card-title">💵 Resumen financiero</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {[
              { label:'Total ventas',    val:`S/ ${(resumen?.ventasHoy||0).toFixed(2)}`,  color:'var(--success)' },
              { label:'Total egresos',   val:`S/ ${(resumen?.egresosHoy||0).toFixed(2)}`, color:'var(--danger)'  },
              { label:'Utilidad neta',   val:`S/ ${(resumen?.utilidadHoy||0).toFixed(2)}`,color:'var(--info)'    },
              { label:'Delivery activos',val:resumen?.deliveryActivo||0,                   color:'var(--warning)' },
            ].map((r,i) => (
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--gray-100)'}}>
                <span style={{fontSize:14,color:'var(--gray-600)'}}>{r.label}</span>
                <span style={{fontSize:16,fontWeight:800,color:r.color,transition:'color .3s'}}>{r.val}</span>
              </div>
            ))}
          </div>

          {/* Pedidos pendientes de cobro */}
          {resumen?.pedidosPendientesCobro > 0 && (
            <div style={{marginTop:16,background:'#FFF8E1',border:'1px solid #FFE082',borderRadius:'var(--radius-sm)',padding:'10px 14px',fontSize:13}}>
              ⚠️ <strong>{resumen.pedidosPendientesCobro}</strong> pedido(s) pendiente(s) de cobro
            </div>
          )}
        </div>
      </div>

      {/* Pedidos activos en tiempo real */}
      {resumen?.pedidosActivos?.length > 0 && (
        <div className="card" style={{marginTop:16}}>
          <div className="card-title">🔥 Pedidos activos ahora</div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            {resumen.pedidosActivos.map((p,i) => (
              <div key={i} style={{
                background: p.estado==='listo' ? '#E8F5E9' : p.estado==='preparando' ? '#FFF8E1' : 'var(--gray-50)',
                border: `1px solid ${p.estado==='listo'?'#C8E6C9':p.estado==='preparando'?'#FFE082':'var(--gray-200)'}`,
                borderRadius:'var(--radius-sm)', padding:'8px 14px', fontSize:13,
              }}>
                <div style={{fontWeight:700}}>
                  {p.tipo==='mesa' ? `Mesa ${p.mesaNumero}` : p.tipo==='delivery' ? '🛵 Delivery' : '📦 Para llevar'}
                </div>
                <div style={{fontSize:11,color:'var(--gray-500)',marginTop:2}}>
                  {p.estado==='listo'?'✅ Listo':p.estado==='preparando'?'👨‍🍳 Preparando':'🔥 En cocina'}
                </div>
                <div style={{fontWeight:800,color:'var(--accent)',marginTop:2}}>S/ {p.total?.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
