import { useEffect, useState } from 'react'
import api from '../utils/api'

export default function Carta() {
  const [productos, setProductos] = useState([])
  const [catActiva, setCatActiva] = useState('')
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ nombre:'', precio:'', categoria:'Pollos', emoji:'🍗', descripcion:'' })

  const cargar = () => api.get('/menu').then(r => { setProductos(r.data); if(!catActiva&&r.data[0]) setCatActiva(r.data[0].categoria) })
  useEffect(() => { cargar() }, [])

  const categorias = [...new Set(productos.map(p => p.categoria))]
  const filtrados = catActiva ? productos.filter(p => p.categoria === catActiva) : productos

  const abrirModal = (prod = null) => {
    if (prod) { setEditando(prod); setForm({ nombre:prod.nombre, precio:prod.precio, categoria:prod.categoria, emoji:prod.emoji, descripcion:prod.descripcion||'' }) }
    else { setEditando(null); setForm({ nombre:'', precio:'', categoria:catActiva||'Pollos', emoji:'🍽️', descripcion:'' }) }
    setModal(true)
  }

  const guardar = async (e) => {
    e.preventDefault()
    const datos = { ...form, precio: parseFloat(form.precio) }
    if (editando) await api.put(`/menu/${editando._id}`, datos)
    else await api.post('/menu', datos)
    setModal(false); cargar()
  }

  const eliminar = async (id) => {
    if (!confirm('¿Desactivar este producto?')) return
    await api.delete(`/menu/${id}`); cargar()
  }

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">Carta / Menú 📖</div><div className="page-sub">{productos.length} productos activos</div></div>
        <button className="btn btn-primary" onClick={()=>abrirModal()}>+ Nuevo Producto</button>
      </div>

      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
        {categorias.map(cat => (
          <button key={cat} onClick={()=>setCatActiva(cat)} className="btn"
            style={{padding:'6px 14px',borderRadius:20,border:`2px solid ${cat===catActiva?'var(--primary)':'var(--gray-300)'}`,background:cat===catActiva?'var(--primary)':'white',fontSize:13}}>
            {cat} <span style={{opacity:0.7,fontSize:11}}>({productos.filter(p=>p.categoria===cat).length})</span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Acciones</th></tr></thead>
            <tbody>
              {filtrados.map(p => (
                <tr key={p._id}>
                  <td><span style={{fontSize:20,marginRight:8}}>{p.emoji}</span><strong>{p.nombre}</strong>{p.descripcion&&<div style={{fontSize:11,color:'var(--gray-500)'}}>{p.descripcion}</div>}</td>
                  <td><span className="badge badge-primary">{p.categoria}</span></td>
                  <td><strong style={{color:'var(--accent)',fontSize:16}}>S/ {p.precio.toFixed(2)}</strong></td>
                  <td>
                    <div style={{display:'flex',gap:6}}>
                      <button className="btn btn-ghost btn-sm" onClick={()=>abrirModal(p)}>✏️ Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={()=>eliminar(p._id)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-title">{editando?'✏️ Editar':'➕ Nuevo'} Producto</div>
            <form onSubmit={guardar}>
              <div className="grid-2">
                <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">Nombre *</label><input className="form-input" required value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} /></div>
                <div className="form-group"><label className="form-label">Precio (S/) *</label><input className="form-input" type="number" step="0.50" required value={form.precio} onChange={e=>setForm(f=>({...f,precio:e.target.value}))} /></div>
                <div className="form-group"><label className="form-label">Emoji</label><input className="form-input" value={form.emoji} onChange={e=>setForm(f=>({...f,emoji:e.target.value}))} maxLength={4} /></div>
                <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">Categoría</label>
                  <input className="form-input" list="cats-list" value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))} />
                  <datalist id="cats-list">{categorias.map(c=><option key={c} value={c}/>)}</datalist>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">Descripción</label><input className="form-input" value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} /></div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
