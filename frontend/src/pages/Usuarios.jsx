import { useEffect, useState } from 'react'
import api from '../utils/api'

const ROLES = ['admin','mozo','cocina','delivery']
const ROLE_BADGE = { admin:'badge-danger', mozo:'badge-primary', cocina:'badge-warning', delivery:'badge-info' }

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nombre:'', usuario:'', password:'', rol:'mozo' })

  const cargar = () => api.get('/usuarios').then(r => setUsuarios(r.data)).catch(()=>{})
  useEffect(() => { cargar() }, [])

  const guardar = async (e) => {
    e.preventDefault()
    try {
      await api.post('/usuarios', form)
      setModal(false); setForm({ nombre:'', usuario:'', password:'', rol:'mozo' }); cargar()
    } catch (err) { alert(err.response?.data?.error || 'Error') }
  }

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar usuario?')) return
    await api.delete(`/usuarios/${id}`); cargar()
  }

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">Usuarios 👥</div><div className="page-sub">{usuarios.length} en el sistema</div></div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Nuevo Usuario</button>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u._id}>
                  <td><strong>{u.nombre}</strong></td>
                  <td style={{ color:'var(--gray-500)', fontFamily:'monospace' }}>@{u.usuario}</td>
                  <td><span className={`badge ${ROLE_BADGE[u.rol]}`}>{u.rol}</span></td>
                  <td>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:13 }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background: u.activo ? 'var(--success)':'var(--gray-400)', display:'inline-block' }}></span>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => eliminar(u._id)}>Eliminar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">👤 Nuevo Usuario</div>
            <form onSubmit={guardar}>
              <div className="form-group"><label className="form-label">Nombre completo *</label><input className="form-input" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">Nombre de usuario *</label><input className="form-input" value={form.usuario} onChange={e=>setForm({...form,usuario:e.target.value.toLowerCase().replace(/\s/g,'_')})} required /></div>
              <div className="form-group"><label className="form-label">Contraseña *</label><input className="form-input" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required minLength={4} /></div>
              <div className="form-group">
                <label className="form-label">Rol *</label>
                <select className="form-select" value={form.rol} onChange={e=>setForm({...form,rol:e.target.value})}>
                  {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                </select>
              </div>
              <div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button><button type="submit" className="btn btn-primary">Crear Usuario</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
