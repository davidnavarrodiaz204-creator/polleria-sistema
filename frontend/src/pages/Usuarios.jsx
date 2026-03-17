import { useEffect, useState } from 'react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'

const ROLES = ['admin','mozo','cocina','delivery']
const RBADGE = { admin:'badge-danger', mozo:'badge-primary', cocina:'badge-warning', delivery:'badge-info' }
const RLABEL = { admin:'👑 Admin', mozo:'🪑 Mozo', cocina:'👨‍🍳 Cocina', delivery:'🛵 Delivery' }

export default function Usuarios() {
  const { usuario: yo } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ nombre:'', usuario:'', password:'', rol:'mozo' })

  const cargar = () => api.get('/usuarios').then(r => setUsuarios(r.data))
  useEffect(() => { cargar() }, [])

  const abrirModal = (u = null) => {
    if (u) { setEditando(u); setForm({ nombre:u.nombre, usuario:u.usuario, password:'', rol:u.rol }) }
    else { setEditando(null); setForm({ nombre:'', usuario:'', password:'', rol:'mozo' }) }
    setModal(true)
  }

  const guardar = async (e) => {
    e.preventDefault()
    const datos = { ...form }
    if (editando && !datos.password) delete datos.password
    if (editando) await api.put(`/usuarios/${editando._id}`, datos)
    else await api.post('/usuarios', datos)
    setModal(false); cargar()
  }

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este usuario?')) return
    await api.delete(`/usuarios/${id}`); cargar()
  }

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">Usuarios 👥</div><div className="page-sub">{usuarios.length} miembros del equipo</div></div>
        <button className="btn btn-primary" onClick={()=>abrirModal()}>+ Nuevo Usuario</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u._id}>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:34,height:34,borderRadius:'50%',background:'var(--primary-light)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:14,color:'#5D4037',flexShrink:0}}>{u.nombre[0]}</div>
                      <strong>{u.nombre}</strong>
                    </div>
                  </td>
                  <td style={{color:'var(--gray-500)'}}>@{u.usuario}</td>
                  <td><span className={`badge ${RBADGE[u.rol]}`}>{RLABEL[u.rol]}</span></td>
                  <td><span style={{display:'flex',alignItems:'center',gap:6,fontSize:13}}><span style={{width:8,height:8,borderRadius:'50%',background:u.activo?'var(--success)':'var(--gray-400)',display:'inline-block'}}></span>{u.activo?'Activo':'Inactivo'}</span></td>
                  <td>
                    <div style={{display:'flex',gap:6}}>
                      <button className="btn btn-ghost btn-sm" onClick={()=>abrirModal(u)}>✏️ Editar</button>
                      {u._id !== yo?.id && <button className="btn btn-danger btn-sm" onClick={()=>eliminar(u._id)}>🗑️</button>}
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
            <div className="modal-title">{editando?'✏️ Editar':'➕ Nuevo'} Usuario</div>
            <form onSubmit={guardar}>
              <div className="form-group"><label className="form-label">Nombre completo *</label><input className="form-input" required value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} /></div>
              <div className="form-group"><label className="form-label">Usuario (login) *</label><input className="form-input" required value={form.usuario} onChange={e=>setForm(f=>({...f,usuario:e.target.value}))} /></div>
              <div className="form-group"><label className="form-label">{editando?'Nueva contraseña (dejar vacío para no cambiar)':'Contraseña *'}</label><input className="form-input" type="password" required={!editando} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} /></div>
              <div className="form-group"><label className="form-label">Rol</label>
                <select className="form-select" value={form.rol} onChange={e=>setForm(f=>({...f,rol:e.target.value}))}>
                  {ROLES.map(r=><option key={r} value={r}>{RLABEL[r]}</option>)}
                </select>
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
