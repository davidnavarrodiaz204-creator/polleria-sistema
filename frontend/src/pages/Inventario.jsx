/**
 * Inventario.jsx — Control básico de ingredientes e insumos
 * Autor: David Navarro Diaz
 */
import { useEffect, useState } from 'react'
import api from '../utils/api'

const UNIDADES = ['kg','g','lt','ml','und','bolsa','caja','docena','atado']
const CATS     = ['Ingrediente','Bebida','Insumo','Limpieza','Descartable','Otro']

export default function Inventario() {
  const [items, setItems]       = useState([])
  const [modal, setModal]       = useState(false)
  const [modalAjuste, setModalAjuste] = useState(null)
  const [form, setForm]         = useState({ nombre:'', unidad:'kg', stockActual:0, stockMinimo:0, costo:0, categoria:'Ingrediente' })
  const [ajuste, setAjuste]     = useState({ cantidad: 0, motivo: '' })

  const cargar = () => api.get('/inventario').then(r => setItems(r.data)).catch(() => {})

  useEffect(() => { cargar() }, [])

  const guardar = async (e) => {
    e.preventDefault()
    try {
      await api.post('/inventario', form)
      setModal(false)
      setForm({ nombre:'', unidad:'kg', stockActual:0, stockMinimo:0, costo:0, categoria:'Ingrediente' })
      cargar()
    } catch (err) { alert(err.response?.data?.error || 'Error') }
  }

  const aplicarAjuste = async () => {
    if (!ajuste.cantidad) return alert('Ingresa una cantidad')
    try {
      await api.patch('/inventario/' + modalAjuste._id + '/ajustar', ajuste)
      setModalAjuste(null)
      setAjuste({ cantidad: 0, motivo: '' })
      cargar()
    } catch (err) { alert(err.response?.data?.error || 'Error') }
  }

  const eliminar = async (id) => {
    if (!confirm('¿Desactivar este ítem?')) return
    await api.delete('/inventario/' + id)
    cargar()
  }

  const alertas = items.filter(i => i.bajoMinimo)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Inventario</div>
          <div className="page-sub">{items.length} ingredientes · {alertas.length > 0 ? `⚠️ ${alertas.length} bajo mínimo` : 'Stock OK'}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Agregar ítem</button>
      </div>

      {alertas.length > 0 && (
        <div style={{ background: '#FFF3CD', border: '1px solid #FFE082', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
          ⚠️ <strong>Stock bajo mínimo:</strong> {alertas.map(a => a.nombre).join(', ')}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Ingrediente</th><th>Categoría</th><th>Stock actual</th><th>Mínimo</th><th>Costo unit.</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {!items.length ? (
                <tr><td colSpan={7} style={{ textAlign:'center', padding:32, color:'var(--gray-400)' }}>
                  Sin ingredientes. Agrega el primero.
                </td></tr>
              ) : items.map(item => (
                <tr key={item._id}>
                  <td><strong>{item.nombre}</strong></td>
                  <td><span className="badge badge-info">{item.categoria}</span></td>
                  <td>
                    <strong style={{ color: item.bajoMinimo ? 'var(--danger)' : 'var(--success)', fontSize: 15 }}>
                      {item.stockActual} {item.unidad}
                    </strong>
                  </td>
                  <td style={{ color: 'var(--gray-500)', fontSize: 13 }}>{item.stockMinimo} {item.unidad}</td>
                  <td style={{ fontSize: 13 }}>S/ {item.costo?.toFixed(2)}</td>
                  <td>
                    <span className={`badge ${item.bajoMinimo ? 'badge-danger' : 'badge-success'}`}>
                      {item.bajoMinimo ? '⚠️ Bajo' : '✅ OK'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setModalAjuste(item); setAjuste({ cantidad:0, motivo:'' }) }}>
                        Ajustar
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => eliminar(item._id)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal nuevo ítem */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">Nuevo ingrediente</div>
            <form onSubmit={guardar}>
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input className="form-input" value={form.nombre} onChange={e => setForm(f=>({...f,nombre:e.target.value}))} required />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Categoría</label>
                  <select className="form-select" value={form.categoria} onChange={e => setForm(f=>({...f,categoria:e.target.value}))}>
                    {CATS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Unidad</label>
                  <select className="form-select" value={form.unidad} onChange={e => setForm(f=>({...f,unidad:e.target.value}))}>
                    {UNIDADES.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Stock inicial</label>
                  <input type="number" className="form-input" value={form.stockActual} onChange={e => setForm(f=>({...f,stockActual:Number(e.target.value)}))} min="0" step="0.1" />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock mínimo</label>
                  <input type="number" className="form-input" value={form.stockMinimo} onChange={e => setForm(f=>({...f,stockMinimo:Number(e.target.value)}))} min="0" step="0.1" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Costo por unidad (S/)</label>
                <input type="number" className="form-input" value={form.costo} onChange={e => setForm(f=>({...f,costo:Number(e.target.value)}))} min="0" step="0.01" />
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal ajuste de stock */}
      {modalAjuste && (
        <div className="modal-overlay" onClick={() => setModalAjuste(null)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">Ajustar stock — {modalAjuste.nombre}</div>
            <div style={{ marginBottom: 12, fontSize: 14, color: 'var(--gray-600)' }}>
              Stock actual: <strong>{modalAjuste.stockActual} {modalAjuste.unidad}</strong>
            </div>
            <div className="form-group">
              <label className="form-label">Cantidad (+ para agregar, - para descontar)</label>
              <input type="number" className="form-input" value={ajuste.cantidad}
                onChange={e => setAjuste(a=>({...a, cantidad:Number(e.target.value)}))}
                step="0.1" placeholder="+5 o -2" />
            </div>
            <div className="form-group">
              <label className="form-label">Motivo</label>
              <input className="form-input" value={ajuste.motivo}
                onChange={e => setAjuste(a=>({...a, motivo:e.target.value}))}
                placeholder="Compra, merma, uso del día..." />
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
              <button className="btn btn-ghost" onClick={() => setModalAjuste(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={aplicarAjuste}>Aplicar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
