import { useEffect, useState } from 'react'
import api from '../utils/api'
import { imprimirTicketCocina } from '../utils/print'

const esMobil = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768

export default function Pedidos() {
  const [mesas, setMesas]           = useState([])
  const [menu, setMenu]             = useState([])
  const [mesaId, setMesaId]         = useState('')
  const [carrito, setCarrito]       = useState([])
  const [catActiva, setCatActiva]   = useState('')
  const [nota, setNota]             = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [enviando, setEnviando]     = useState(false)
  const [tipo, setTipo]             = useState('mesa')
  const [ok, setOk]                 = useState(false)

  useEffect(() => {
    api.get('/mesas').then(r => { setMesas(r.data); if (r.data[0]) setMesaId(r.data[0]._id) })
    api.get('/menu').then(r => { setMenu(r.data); if (r.data[0]) setCatActiva(r.data[0].categoria) })
  }, [])

  const categorias = [...new Set(menu.map(p => p.categoria))]
  const productosFiltrados = menu.filter(p => p.categoria === catActiva)

  const agregar = (prod) => {
    setCarrito(c => {
      const ex = c.find(x => x._id === prod._id)
      if (ex) return c.map(x => x._id === prod._id ? { ...x, cantidad: x.cantidad + 1 } : x)
      return [...c, { ...prod, cantidad: 1 }]
    })
  }

  const cambiarQty = (id, delta) => {
    setCarrito(c => c.map(x => x._id === id ? { ...x, cantidad: x.cantidad + delta } : x).filter(x => x.cantidad > 0))
  }

  const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const mesaActual = mesas.find(m => m._id === mesaId)

  const enviarCocina = async () => {
    if (!carrito.length) return alert('Agrega al menos un producto')
    if (tipo === 'mesa' && !mesaId) return alert('Selecciona una mesa')
    setEnviando(true)
    try {
      const body = {
        tipo,
        mesaId: tipo === 'mesa' ? mesaId : null,
        mesaNumero: tipo === 'mesa' ? mesaActual?.numero : null,
        items: carrito.map(i => ({
          productoId: i._id, nombre: i.nombre,
          emoji: i.emoji || 'plato', cantidad: i.cantidad, precio: i.precio,
        })),
        nota, metodoPago,
      }
      const { data } = await api.post('/pedidos', body)

      // Solo imprimir en computadora, no en celular
      if (!esMobil()) {
        try { imprimirTicketCocina(data) } catch (_) {}
      }

      setCarrito([])
      setNota('')
      setOk(true)
      setTimeout(() => setOk(false), 3000)
    } catch (e) {
      alert(e.response?.data?.error || 'Error al enviar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Nuevo Pedido</div>
          <div className="page-sub">Selecciona mesa y agrega productos</div>
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
          <select className="form-select" style={{ width:130 }} value={tipo} onChange={e => { setTipo(e.target.value); setMesaId('') }}>
            <option value="mesa">Mesa</option>
            <option value="para_llevar">Para llevar</option>
          </select>
          {tipo === 'mesa' && (
            <select className="form-select" style={{ width:140 }} value={mesaId} onChange={e => setMesaId(e.target.value)}>
              <option value="">Seleccionar mesa</option>
              {mesas.map(m => (
                <option key={m._id} value={m._id}>Mesa {m.numero} {m.estado==='ocupada'?'(ocupada)':''}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {ok && (
        <div style={{ background:'#E8F5E9', color:'var(--success)', border:'1px solid #C8E6C9', borderRadius:'var(--radius-sm)', padding:'12px 16px', marginBottom:14, fontWeight:700, fontSize:15 }}>
          Pedido enviado a cocina correctamente
        </div>
      )}

      <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>

        {/* MENU */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
            {categorias.map(cat => (
              <button key={cat} onClick={() => setCatActiva(cat)} style={{
                padding:'7px 14px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer',
                border:'2px solid', transition:'all 0.15s',
                borderColor: cat===catActiva ? 'var(--primary)' : 'var(--gray-300)',
                background:  cat===catActiva ? 'var(--primary)' : 'white',
              }}>{cat}</button>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:10 }}>
            {productosFiltrados.map(p => (
              <div key={p._id} onClick={() => agregar(p)} style={{
                background:'white', borderRadius:'var(--radius)',
                border:'2px solid var(--gray-200)', padding:'14px 10px',
                textAlign:'center', cursor:'pointer', transition:'all 0.15s',
              }}
              onMouseOver={e=>e.currentTarget.style.borderColor='var(--primary)'}
              onMouseOut={e=>e.currentTarget.style.borderColor='var(--gray-200)'}>
                <div style={{ fontSize:30 }}>{p.emoji}</div>
                <div style={{ fontSize:13, fontWeight:700, marginTop:4, lineHeight:1.3 }}>{p.nombre}</div>
                <div style={{ fontSize:15, fontWeight:800, color:'var(--accent)', marginTop:4 }}>S/ {p.precio.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CARRITO */}
        <div style={{ width:290, flexShrink:0 }}>
          <div style={{ background:'white', borderRadius:'var(--radius-lg)', border:'1px solid var(--gray-200)', overflow:'hidden', boxShadow:'var(--shadow-md)', position:'sticky', top:80 }}>
            <div style={{ background:'var(--primary)', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:16 }}>Pedido</span>
              <span style={{ fontSize:13, fontWeight:700, background:'rgba(0,0,0,0.1)', padding:'2px 10px', borderRadius:20 }}>
                {tipo==='mesa' ? `Mesa ${mesaActual?.numero||'-'}` : 'Para llevar'}
              </span>
            </div>
            <div style={{ padding:12, maxHeight:300, overflowY:'auto' }}>
              {!carrito.length ? (
                <div style={{ textAlign:'center', padding:'24px 10px', color:'var(--gray-400)' }}>
                  <div style={{ fontSize:32 }}>carrito</div>
                  <div style={{ fontSize:13, marginTop:6 }}>Agrega productos</div>
                </div>
              ) : carrito.map(item => (
                <div key={item._id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:'1px solid var(--gray-100)' }}>
                  <span style={{ fontSize:18 }}>{item.emoji}</span>
                  <div style={{ flex:1, fontSize:12, fontWeight:600, lineHeight:1.3 }}>{item.nombre}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <button onClick={()=>cambiarQty(item._id,-1)} style={{ width:24,height:24,borderRadius:6,border:'none',background:'var(--gray-200)',cursor:'pointer',fontWeight:700 }}>-</button>
                    <span style={{ fontSize:13, fontWeight:700, minWidth:20, textAlign:'center' }}>{item.cantidad}</span>
                    <button onClick={()=>cambiarQty(item._id,1)} style={{ width:24,height:24,borderRadius:6,border:'none',background:'var(--primary)',cursor:'pointer',fontWeight:700 }}>+</button>
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:'var(--accent)', minWidth:48, textAlign:'right' }}>S/ {(item.precio*item.cantidad).toFixed(2)}</span>
                </div>
              ))}
            </div>
            {carrito.length > 0 && (
              <div style={{ padding:12, borderTop:'2px solid var(--gray-100)' }}>
                <input className="form-input" placeholder="Nota para cocina (opcional)" value={nota}
                  onChange={e=>setNota(e.target.value)} style={{ marginBottom:8, fontSize:12, padding:'7px 10px' }} />
                <select className="form-select" value={metodoPago} onChange={e=>setMetodoPago(e.target.value)} style={{ marginBottom:10, fontSize:13 }}>
                  <option value="efectivo">Efectivo</option>
                  <option value="yape">Yape</option>
                  <option value="plin">Plin</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                </select>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <span style={{ fontSize:14, color:'var(--gray-600)', fontWeight:600 }}>Total:</span>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:800 }}>S/ {total.toFixed(2)}</span>
                </div>
                <button className="btn btn-accent btn-block" style={{ fontSize:15 }} onClick={enviarCocina} disabled={enviando}>
                  {enviando ? 'Enviando...' : 'Enviar a Cocina'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
