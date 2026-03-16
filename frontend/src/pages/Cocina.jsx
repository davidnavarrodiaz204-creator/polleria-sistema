import { useEffect, useState, useRef } from 'react'
import api from '../utils/api'
import { imprimirTicketCocina } from '../utils/print'
import './Cocina.css'

const MINUTOS = (iso) => Math.floor((Date.now() - new Date(iso)) / 60000)

export default function Cocina() {
  const [pedidos, setPedidos] = useState([])
  const audioRef = useRef(null)

  const cargar = async () => {
    const { data } = await api.get('/pedidos/cocina')
    setPedidos(data)
  }

  useEffect(() => {
    cargar()
    const t = setInterval(cargar, 10000)
    return () => clearInterval(t)
  }, [])

  const marcarListo = async (id) => {
    await api.put(`/pedidos/${id}`, { estado: 'listo' })
    cargar()
  }

  const marcarEntregado = async (id) => {
    await api.put(`/pedidos/${id}`, { estado: 'entregado' })
    cargar()
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Cocina 👨‍🍳</div>
          <div className="page-sub">{pedidos.length} pedido(s) pendiente(s) — actualiza cada 10s</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={cargar}>🔄 Actualizar</button>
      </div>

      {!pedidos.length ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 48 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>¡Todo listo!</div>
          <div style={{ color: 'var(--gray-500)', marginTop: 4 }}>No hay pedidos pendientes</div>
        </div>
      ) : (
        <div className="cocina-grid">
          {pedidos.map(p => {
            const min = MINUTOS(p.creadoEn)
            const urgente = min >= 15
            const advertencia = min >= 8 && min < 15
            return (
              <div key={p._id} className={`cocina-card ${urgente ? 'urgente' : advertencia ? 'advertencia' : ''}`}>
                <div className={`cocina-card-header ${urgente ? 'urgente' : advertencia ? 'advertencia' : 'normal'}`}>
                  <div>
                    <div className="cocina-mesa">
                      {p.tipo === 'mesa' ? `Mesa ${p.mesaNumero}` : p.tipo === 'delivery' ? '🛵 Delivery' : '🥡 Para llevar'}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>#{p.numero} · {p.mozo}</div>
                  </div>
                  <div className={`cocina-timer ${urgente ? 'late' : advertencia ? 'warn' : 'ok'}`}>
                    ⏱ {min}m
                  </div>
                </div>
                <div className="cocina-items">
                  {p.items.map((item, i) => (
                    <div key={i} className="cocina-item">
                      <span className="cocina-qty">{item.cantidad}x</span>
                      <span className="cocina-nombre">{item.emoji} {item.nombre}</span>
                    </div>
                  ))}
                  {p.nota && <div className="cocina-nota">📝 {p.nota}</div>}
                </div>
                <div className="cocina-actions">
                  <button className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={() => marcarListo(p._id)}>✅ Listo</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => imprimirTicketCocina(p)}>🖨️</button>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => marcarEntregado(p._id)}>🍽️ Entregado</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
