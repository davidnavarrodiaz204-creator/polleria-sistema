import { useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'
import api from '../utils/api'
import { imprimirTicketCocina } from '../utils/print'
import { useApp } from '../context/AppContext'

// Sonido de notificación (generado con Web Audio API - no requiere archivo externo)
const reproducirSonido = (volumen = 80) => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.setValueAtTime(880, audioContext.currentTime) // La4
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime((volumen / 100) * 0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)

    // Segundo beep
    setTimeout(() => {
      const osc2 = audioContext.createOscillator()
      const gain2 = audioContext.createGain()
      osc2.connect(gain2)
      gain2.connect(audioContext.destination)
      osc2.frequency.setValueAtTime(1047, audioContext.currentTime) // Do5
      osc2.type = 'sine'
      gain2.gain.setValueAtTime((volumen / 100) * 0.3, audioContext.currentTime)
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      osc2.start(audioContext.currentTime)
      osc2.stop(audioContext.currentTime + 0.3)
    }, 150)
  } catch (e) {
    console.log('Audio no disponible')
  }
}

export default function Cocina() {
  const [pedidos, setPedidos] = useState([])
  const { config } = useApp()
  const pedidosAnteriores = useRef([])
  const sonidoActivo = config?.sonido?.activo ?? true
  const volumen = config?.sonido?.volumen ?? 80

  const cargar = () => api.get('/pedidos/cocina').then(r => setPedidos(r.data))

  useEffect(() => {
    cargar()
    const BASE = import.meta.env.VITE_API_URL || ''
    const socket = io(BASE)
    socket.on('nuevo_pedido', (pedido) => {
      cargar()
      // Reproducir sonido si está activo
      if (sonidoActivo) {
        reproducirSonido(volumen)
      }
    })
    socket.on('pedido_listo', () => cargar())
    return () => socket.disconnect()
  }, [sonidoActivo, volumen])

  const minutos = (fecha) => Math.floor((Date.now() - new Date(fecha)) / 60000)

  const marcarListo = async (id) => {
    await api.put(`/pedidos/${id}`, { estado: 'listo' })
    cargar()
  }

  const cancelar = async (id) => {
    if (!confirm('¿Cancelar este pedido?')) return
    await api.put(`/pedidos/${id}`, { estado: 'cancelado' })
    cargar()
  }

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">Pantalla Cocina 👨‍🍳</div>
        <div className="page-sub">{pedidos.length} pedido(s) pendiente(s)</div></div>
        <button className="btn btn-ghost" onClick={cargar}>🔄 Actualizar</button>
      </div>

      {!pedidos.length ? (
        <div style={{textAlign:'center',padding:'60px 20px',color:'var(--gray-400)'}}>
          <div style={{fontSize:64}}>✅</div>
          <div style={{fontSize:18,fontWeight:700,marginTop:12}}>Todo al día</div>
          <div style={{fontSize:14,marginTop:4}}>No hay pedidos pendientes</div>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:16}}>
          {pedidos.map(p => {
            const mins = minutos(p.creadoEn)
            const colorTimer = mins >= 20 ? 'var(--danger)' : mins >= 10 ? 'var(--warning)' : 'var(--success)'
            const urgente = mins >= 15
            const advertencia = mins >= 8 && mins < 15
            return (
              <div key={p._id} style={{background:'white',borderRadius:'var(--radius-lg)',border:`2px solid ${urgente?'var(--danger)':advertencia?'var(--warning)':'var(--gray-200)'}`,overflow:'hidden',boxShadow:'var(--shadow-sm)'}}>
                <div style={{padding:'10px 14px',background:urgente?'#FFEBEE':advertencia?'#FFF8E1':'var(--primary-light)',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div>
                    <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:800}}>
                      {p.tipo==='delivery' ? '🛵 Delivery' : p.mesaNumero ? `Mesa ${p.mesaNumero}` : 'Para llevar'}
                    </div>
                    <div style={{fontSize:11,color:'var(--gray-600)'}}>#{p.numero} · {p.mozo}</div>
                  </div>
                  <div style={{fontWeight:700,fontSize:13,color:urgente?'var(--danger)':advertencia?'var(--warning)':'var(--success)'}}>
                    ⏱ {mins}m
                  </div>
                </div>
                <div style={{padding:'10px 14px'}}>
                  {p.items.map((it,i) => (
                    <div key={i} style={{display:'flex',gap:8,padding:'4px 0',borderBottom:'1px dashed var(--gray-200)',fontSize:14}}>
                      <span style={{fontWeight:800,color:'var(--accent)',minWidth:24}}>{it.cantidad}x</span>
                      <span>{it.nombre}</span>
                      {it.nota && <span style={{fontSize:11,color:'var(--warning)',marginLeft:'auto'}}>⚠ {it.nota}</span>}
                    </div>
                  ))}
                  {p.nota && <div style={{marginTop:6,fontSize:12,color:'var(--gray-600)',background:'var(--gray-100)',padding:'4px 8px',borderRadius:6}}>📝 {p.nota}</div>}
                </div>
                <div style={{padding:'8px 14px',display:'flex',gap:8,borderTop:'1px solid var(--gray-100)'}}>
                  {p.estado === 'en_cocina' && (
                    <button className="btn btn-warning" style={{flex:1,fontSize:13,padding:'8px'}}
                      onClick={async()=>{ await api.put(`/pedidos/${p._id}`,{estado:'preparando'}); cargar() }}>
                      👨‍🍳 Preparando
                    </button>
                  )}
                  <button className="btn btn-success" style={{flex:1,fontSize:13,padding:'8px'}} onClick={()=>marcarListo(p._id)}>✅ Listo</button>
                  <button className="btn btn-ghost btn-sm" onClick={()=>imprimirTicketCocina(p)}>🖨️</button>
                  <button className="btn btn-danger btn-sm" onClick={()=>cancelar(p._id)}>✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
