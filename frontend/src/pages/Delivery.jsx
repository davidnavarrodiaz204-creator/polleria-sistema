import { useEffect, useState } from 'react'
import api from '../utils/api'
import { imprimirBoleta } from '../utils/print'
import { useApp } from '../context/AppContext'

const ESTADOS = ['pendiente','preparando','en_camino','entregado','cancelado']
const LABELS  = { pendiente:'Pendiente', preparando:'Preparando', en_camino:'En camino', entregado:'Entregado', cancelado:'Cancelado' }
const BCOLORS = { pendiente:'badge-warning', preparando:'badge-primary', en_camino:'badge-info', entregado:'badge-success', cancelado:'badge-danger' }

export default function Delivery() {
  const { config } = useApp()
  const [deliveries, setDeliveries] = useState([])
  const [filtro, setFiltro]         = useState('todos')
  const [modal, setModal]           = useState(false)
  const [menu, setMenu]             = useState([])
  const [form, setForm] = useState({
    cliente:'', telefono:'', direccion:'', referencia:'',
    nota:'', costoEnvio:0, metodoPago:'efectivo', items:[]
  })

  const cargar = () => api.get('/delivery').then(r => setDeliveries(r.data)).catch(()=>{})

  useEffect(() => {
    cargar()
    api.get('/menu').then(r => setMenu(r.data)).catch(()=>{})
    const t = setInterval(cargar, 15000)
    return () => clearInterval(t)
  }, [])

  const avanzar = async (del) => {
    const idx = ESTADOS.indexOf(del.estado)
    if (idx < 0 || idx >= 3) return
    await api.put('/delivery/' + del._id, { estado: ESTADOS[idx + 1] })
    cargar()
  }

  const enviar = async (e) => {
    e.preventDefault()
    try {
      await api.post('/delivery', { ...form, total: totalForm })
      setModal(false)
      setForm({ cliente:'', telefono:'', direccion:'', referencia:'', nota:'', costoEnvio:0, metodoPago:'efectivo', items:[] })
      cargar()
    } catch (err) {
      alert(err.response?.data?.error || 'Error al crear delivery')
    }
  }

  const agregarItem = () =>
    setForm(f => ({ ...f, items: [...f.items, { nombre:'', emoji:'🍽️', cantidad:1, precio:0 }] }))

  const editarItem = (i, campo, val) => {
    const items = [...form.items]
    items[i] = { ...items[i], [campo]: (campo === 'cantidad' || campo === 'precio') ? Number(val) : val }
    setForm(f => ({ ...f, items }))
  }

  const quitarItem = (i) =>
    setForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }))

  const totalForm = form.items.reduce((s, i) => s + i.precio * i.cantidad, 0) + Number(form.costoEnvio)

  const lista = filtro === 'todos' ? deliveries : deliveries.filter(d => d.estado === filtro)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Delivery 🛵</div>
          <div className="page-sub">
            {deliveries.filter(d => !['entregado','cancelado'].includes(d.estado)).length} activos
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Nuevo Delivery</button>
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
        {['todos','pendiente','preparando','en_camino','entregado'].map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            style={{
              padding:'6px 14px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer',
              border: '2px solid',
              borderColor: filtro === f ? 'var(--primary)' : 'var(--gray-300)',
              background:  filtro === f ? 'var(--primary)' : 'white'
            }}
          >
            {f === 'todos' ? 'Todos' : LABELS[f]}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {lista.length === 0 ? (
          <div className="card" style={{ textAlign:'center', padding:40 }}>
            <div style={{ fontSize:36 }}>🛵</div>
            <div style={{ fontSize:15, fontWeight:600, marginTop:8, color:'var(--gray-500)' }}>
              Sin deliveries en esta categoría
            </div>
          </div>
        ) : lista.map(d => (
          <div key={d._id} className="card" style={{ display:'flex', gap:14, alignItems:'flex-start', flexWrap:'wrap' }}>
            <div style={{
              width:10, height:10, borderRadius:'50%', marginTop:6, flexShrink:0,
              background:
                d.estado === 'entregado'  ? 'var(--success)' :
                d.estado === 'en_camino'  ? 'var(--info)'    :
                d.estado === 'preparando' ? 'var(--primary)' :
                d.estado === 'cancelado'  ? 'var(--danger)'  : 'var(--warning)'
            }} />
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <span style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800 }}>
                  #{d.numero}
                </span>
                <span className={'badge ' + BCOLORS[d.estado]}>{LABELS[d.estado]}</span>
              </div>
              <div style={{ fontWeight:600, marginTop:2 }}>{d.cliente}</div>
              <div style={{ fontSize:12, color:'var(--gray-500)' }}>📍 {d.direccion}</div>
              {d.referencia && (
                <div style={{ fontSize:12, color:'var(--gray-500)' }}>Ref: {d.referencia}</div>
              )}
              <div style={{ fontSize:13, color:'var(--gray-600)', marginTop:4 }}>
                {d.items?.map(i => i.cantidad + 'x ' + i.nombre).join(', ')}
              </div>
              {d.nota && (
                <div style={{ fontSize:12, background:'var(--gray-100)', padding:'3px 8px', borderRadius:6, marginTop:4, display:'inline-block' }}>
                  📝 {d.nota}
                </div>
              )}
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:800, color:'var(--accent)' }}>
                S/ {d.total?.toFixed(2)}
              </div>
              <div style={{ fontSize:11, color:'var(--gray-500)', marginBottom:8, textTransform:'capitalize' }}>
                {d.metodoPago}
              </div>
              <div style={{ display:'flex', gap:6, justifyContent:'flex-end', flexWrap:'wrap' }}>
                {!['entregado','cancelado'].includes(d.estado) && (
                  <button className="btn btn-primary btn-sm" onClick={() => avanzar(d)}>
                    {d.estado === 'pendiente'  ? '▶ Preparar'  :
                     d.estado === 'preparando' ? '🛵 Despachar' : '✅ Entregado'}
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => imprimirBoleta({ ...d, tipo:'delivery' }, config)}
                >
                  🖨️ Boleta
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL NUEVO DELIVERY */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" style={{ maxWidth:520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">🛵 Nuevo Delivery</div>
            <form onSubmit={enviar}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Cliente *</label>
                  <input className="form-input" value={form.cliente}
                    onChange={e => setForm({ ...form, cliente: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input className="form-input" value={form.telefono}
                    onChange={e => setForm({ ...form, telefono: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Dirección *</label>
                <input className="form-input" value={form.direccion}
                  onChange={e => setForm({ ...form, direccion: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Referencia</label>
                <input className="form-input" placeholder="Cerca al parque..." value={form.referencia}
                  onChange={e => setForm({ ...form, referencia: e.target.value })} />
              </div>

              {/* Productos */}
              <div style={{ marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <label className="form-label" style={{ margin:0 }}>Productos</label>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={agregarItem}>+ Agregar</button>
                </div>
                {form.items.map((item, i) => (
                  <div key={i} style={{ display:'flex', gap:6, marginBottom:6, flexWrap:'wrap' }}>
                    <input
                      className="form-input" style={{ flex:2, minWidth:120 }}
                      placeholder="Nombre del producto" value={item.nombre}
                      list={'prod-list-' + i}
                      onChange={e => {
                        const p = menu.find(m => m.nombre === e.target.value)
                        editarItem(i, 'nombre', e.target.value)
                        if (p) {
                          editarItem(i, 'precio', p.precio)
                          editarItem(i, 'emoji', p.emoji)
                        }
                      }}
                    />
                    <datalist id={'prod-list-' + i}>
                      {menu.map(p => <option key={p._id} value={p.nombre} />)}
                    </datalist>
                    <input className="form-input" style={{ width:60 }} type="number" min="1"
                      placeholder="Cant" value={item.cantidad}
                      onChange={e => editarItem(i, 'cantidad', e.target.value)} />
                    <input className="form-input" style={{ width:80 }} type="number" step="0.5"
                      placeholder="Precio" value={item.precio}
                      onChange={e => editarItem(i, 'precio', e.target.value)} />
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => quitarItem(i)}>✕</button>
                  </div>
                ))}
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Costo de envío S/</label>
                  <input className="form-input" type="number" step="0.5" value={form.costoEnvio}
                    onChange={e => setForm({ ...form, costoEnvio: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Método de pago</label>
                  <select className="form-select" value={form.metodoPago}
                    onChange={e => setForm({ ...form, metodoPago: e.target.value })}>
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="yape">📱 Yape</option>
                    <option value="plin">📱 Plin</option>
                    <option value="tarjeta">💳 Tarjeta</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nota</label>
                <input className="form-input" placeholder="Instrucciones especiales..." value={form.nota}
                  onChange={e => setForm({ ...form, nota: e.target.value })} />
              </div>

              <div style={{ textAlign:'right', fontFamily:'var(--font-display)', fontSize:20, fontWeight:800, marginBottom:12 }}>
                Total: S/ {totalForm.toFixed(2)}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear Pedido</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
