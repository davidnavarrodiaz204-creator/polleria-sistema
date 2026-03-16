import { useEffect, useState } from 'react'
import api from '../utils/api'
import { imprimirTicketCocina } from '../utils/print'
import './Pedidos.css'

export default function Pedidos() {
  const [menu, setMenu] = useState([])
  const [mesas, setMesas] = useState([])
  const [categoriaActiva, setCategoriaActiva] = useState('')
  const [carrito, setCarrito] = useState([])
  const [mesaId, setMesaId] = useState('')
  const [tipo, setTipo] = useState('mesa')
  const [nota, setNota] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    api.get('/menu').then(r => {
      setMenu(r.data)
      const cats = [...new Set(r.data.map(p => p.categoria))]
      if (cats.length) setCategoriaActiva(cats[0])
    })
    api.get('/mesas').then(r => setMesas(r.data.filter(m => m.estado !== 'lista')))
  }, [])

  const categorias = [...new Set(menu.map(p => p.categoria))]
  const productosFiltrados = menu.filter(p => p.categoria === categoriaActiva)

  const agregar = (prod) => {
    setCarrito(prev => {
      const existe = prev.find(i => i.productoId === prod._id)
      if (existe) return prev.map(i => i.productoId === prod._id ? { ...i, cantidad: i.cantidad + 1 } : i)
      return [...prev, { productoId: prod._id, nombre: prod.nombre, emoji: prod.emoji, precio: prod.precio, cantidad: 1, nota: '' }]
    })
  }

  const cambiarCantidad = (id, delta) => {
    setCarrito(prev => prev
      .map(i => i.productoId === id ? { ...i, cantidad: i.cantidad + delta } : i)
      .filter(i => i.cantidad > 0)
    )
  }

  const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const mesaSeleccionada = mesas.find(m => m._id === mesaId)

  const enviar = async () => {
    if (!carrito.length) return alert('Agrega al menos un producto')
    if (tipo === 'mesa' && !mesaId) return alert('Selecciona una mesa')
    setEnviando(true)
    try {
      const { data } = await api.post('/pedidos', {
        tipo, mesaId: tipo === 'mesa' ? mesaId : null,
        mesaNumero: tipo === 'mesa' ? mesaSeleccionada?.numero : null,
        items: carrito, nota, metodoPago, total,
      })
      imprimirTicketCocina(data)
      setCarrito([])
      setNota('')
      alert('✅ Pedido enviado a cocina')
    } catch (err) {
      alert(err.response?.data?.error || 'Error al enviar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Nuevo Pedido 📋</div>
          <div className="page-sub">Selecciona productos y envía a cocina</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select className="form-select" style={{ width: 130 }} value={tipo} onChange={e => { setTipo(e.target.value); setMesaId('') }}>
            <option value="mesa">Mesa</option>
            <option value="para_llevar">Para llevar</option>
          </select>
          {tipo === 'mesa' && (
            <select className="form-select" style={{ width: 130 }} value={mesaId} onChange={e => setMesaId(e.target.value)}>
              <option value="">Seleccionar mesa</option>
              {mesas.map(m => (
                <option key={m._id} value={m._id}>Mesa {m.numero} {m.estado === 'ocupada' ? '(ocupada)' : ''}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="pedidos-layout">
        {/* MENÚ */}
        <div className="pedidos-menu">
          <div className="cat-tabs">
            {categorias.map(cat => (
              <button key={cat} className={`cat-tab ${cat === categoriaActiva ? 'active' : ''}`} onClick={() => setCategoriaActiva(cat)}>
                {cat}
              </button>
            ))}
          </div>
          <div className="productos-grid">
            {productosFiltrados.map(prod => (
              <div key={prod._id} className="producto-card" onClick={() => agregar(prod)}>
                <div className="prod-emoji">{prod.emoji}</div>
                <div className="prod-nombre">{prod.nombre}</div>
                <div className="prod-precio">S/ {prod.precio.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CARRITO */}
        <div className="pedidos-carrito">
          <div className="carrito-header">
            🛒 Pedido {tipo === 'mesa' && mesaSeleccionada ? `— Mesa ${mesaSeleccionada.numero}` : tipo === 'para_llevar' ? '— Para llevar' : ''}
          </div>
          <div className="carrito-items">
            {!carrito.length ? (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--gray-400)' }}>
                <div style={{ fontSize: 36 }}>🛒</div>
                <div style={{ fontSize: 13, marginTop: 8 }}>Agrega productos</div>
              </div>
            ) : carrito.map(item => (
              <div key={item.productoId} className="carrito-item">
                <span style={{ fontSize: 18 }}>{item.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>S/ {item.precio.toFixed(2)} c/u</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button className="qty-btn minus" onClick={() => cambiarCantidad(item.productoId, -1)}>−</button>
                  <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{item.cantidad}</span>
                  <button className="qty-btn plus" onClick={() => cambiarCantidad(item.productoId, 1)}>+</button>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', minWidth: 54, textAlign: 'right' }}>S/ {(item.precio * item.cantidad).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="carrito-footer">
            <textarea className="form-input" rows={2} placeholder="Nota para cocina (opcional)" value={nota} onChange={e => setNota(e.target.value)} style={{ fontSize: 13, resize: 'none', marginBottom: 10 }} />
            <select className="form-select" value={metodoPago} onChange={e => setMetodoPago(e.target.value)} style={{ marginBottom: 12 }}>
              <option value="efectivo">💵 Efectivo</option>
              <option value="yape">📱 Yape</option>
              <option value="plin">📱 Plin</option>
              <option value="tarjeta">💳 Tarjeta</option>
            </select>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 600 }}>Total:</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800 }}>S/ {total.toFixed(2)}</span>
            </div>
            <button className="btn btn-accent btn-block" style={{ fontSize: 15 }} onClick={enviar} disabled={enviando}>
              {enviando ? '⏳ Enviando...' : '🔥 Enviar a Cocina'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
