// ─── CARTA ───────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import api from '../utils/api'

export function Carta() {
  const [productos, setProductos] = useState([])
  const [catActiva, setCatActiva] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nombre:'', precio:'', categoria:'', emoji:'🍽️', descripcion:'' })

  const cargar = () => api.get('/menu').then(r => { setProductos(r.data); if(!catActiva && r.data.length) setCatActiva([...new Set(r.data.map(p=>p.categoria))][0]) }).catch(()=>{})
  useEffect(() => { cargar() }, [])

  const categorias = [...new Set(productos.map(p => p.categoria))]
  const filtrados  = productos.filter(p => p.categoria === catActiva)

  const guardar = async (e) => {
    e.preventDefault()
    try {
      await api.post('/menu', { ...form, precio: parseFloat(form.precio) })
      setModal(false); setForm({ nombre:'', precio:'', categoria:'', emoji:'🍽️', descripcion:'' }); cargar()
    } catch (err) { alert(err.response?.data?.error || 'Error') }
  }

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar producto?')) return
    await api.delete(`/menu/${id}`); cargar()
  }

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">Carta / Menú 📖</div><div className="page-sub">{productos.length} productos</div></div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Nuevo Producto</button>
      </div>
      <div className="card">
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
          {categorias.map(c => (
            <button key={c} style={{ padding:'6px 14px', borderRadius:20, border:'2px solid', borderColor: c===catActiva ? 'var(--primary)':'var(--gray-300)', background: c===catActiva ? 'var(--primary)':'white', fontSize:13, fontWeight:600, cursor:'pointer' }} onClick={() => setCatActiva(c)}>{c}</button>
          ))}
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th></th></tr></thead>
            <tbody>
              {filtrados.map(p => (
                <tr key={p._id}>
                  <td><span style={{ fontSize:20, marginRight:8 }}>{p.emoji}</span><strong>{p.nombre}</strong>{p.descripcion && <div style={{ fontSize:12, color:'var(--gray-500)' }}>{p.descripcion}</div>}</td>
                  <td><span className="badge badge-primary">{p.categoria}</span></td>
                  <td><strong style={{ color:'var(--accent)', fontFamily:'var(--font-display)', fontSize:16 }}>S/ {p.precio.toFixed(2)}</strong></td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => eliminar(p._id)}>Eliminar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">🍽️ Nuevo Producto</div>
            <form onSubmit={guardar}>
              <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} required /></div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Precio S/ *</label><input className="form-input" type="number" step="0.50" value={form.precio} onChange={e=>setForm({...form,precio:e.target.value})} required /></div>
                <div className="form-group"><label className="form-label">Emoji</label><input className="form-input" value={form.emoji} maxLength={4} onChange={e=>setForm({...form,emoji:e.target.value})} /></div>
              </div>
              <div className="form-group">
                <label className="form-label">Categoría *</label>
                <input className="form-input" list="cats-list" value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})} required placeholder="Pollos, Bebidas..." />
                <datalist id="cats-list">{categorias.map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div className="form-group"><label className="form-label">Descripción</label><input className="form-input" value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})} /></div>
              <div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button><button type="submit" className="btn btn-primary">Guardar</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Carta
