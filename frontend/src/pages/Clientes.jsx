import { useEffect, useState } from 'react'
import api from '../utils/api'

const TIPO_BADGE = { dni:'badge-info', ruc:'badge-primary', ce:'badge-warning', pasaporte:'badge-warning' }

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal]       = useState(false)
  const [detalle, setDetalle]   = useState(null)
  const [form, setForm]         = useState({ tipoDoc:'dni', numDoc:'', nombre:'', razonSocial:'', direccion:'', telefono:'', celular:'', email:'', cumpleanos:'', aceptaPromo:true })
  const [consultando, setConsultando] = useState(false)
  const [msgApi, setMsgApi]     = useState('')

  const cargar = (q = '') => {
    const params = q ? `?q=${q}` : ''
    api.get('/clientes' + params).then(r => setClientes(r.data)).catch(() => {})
  }

  useEffect(() => { cargar() }, [])

  useEffect(() => {
    const t = setTimeout(() => cargar(busqueda), 400)
    return () => clearTimeout(t)
  }, [busqueda])

  // Consultar RUC/DNI automáticamente al escribir
  const consultarDoc = async (num) => {
    const limpio = num.replace(/\D/g, '')
    setForm(f => ({ ...f, numDoc: limpio }))
    if (limpio.length !== 8 && limpio.length !== 11) return
    setConsultando(true)
    setMsgApi('')
    try {
      const { data } = await api.get('/clientes/consultar/' + limpio)
      setForm(f => ({
        ...f,
        tipoDoc:     data.tipoDoc     || f.tipoDoc,
        nombre:      data.nombre      || f.nombre,
        razonSocial: data.razonSocial || f.razonSocial,
        direccion:   data.direccion   || f.direccion,
        telefono:    data.telefono    || f.telefono,
      }))
      if (data.fuenteLocal) setMsgApi('Cliente encontrado en tu base de datos.')
      else if (data.apiError) setMsgApi(data.mensaje)
      else setMsgApi('Datos cargados automáticamente desde SUNAT/RENIEC.')
    } catch {
      setMsgApi('No se pudo consultar. Completa los datos manualmente.')
    } finally {
      setConsultando(false)
    }
  }

  const guardar = async (e) => {
    e.preventDefault()
    try {
      await api.post('/clientes', form)
      setModal(false)
      resetForm()
      cargar()
    } catch (err) { alert(err.response?.data?.error || 'Error') }
  }

  const resetForm = () => {
    setForm({ tipoDoc:'dni', numDoc:'', nombre:'', razonSocial:'', direccion:'', telefono:'', celular:'', email:'', cumpleanos:'', aceptaPromo:true })
    setMsgApi('')
  }

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar cliente?')) return
    await api.delete('/clientes/' + id)
    cargar()
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Clientes</div>
          <div className="page-sub">{clientes.length} registrados</div>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setModal(true) }}>
          + Nuevo Cliente
        </button>
      </div>

      {/* Buscador */}
      <div style={{ marginBottom:16 }}>
        <input className="form-input" style={{ maxWidth:340 }}
          placeholder="Buscar por nombre, DNI, RUC o celular..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>

      {/* Tabla */}
      <div className="card">
        {!clientes.length ? (
          <div style={{ textAlign:'center', padding:40, color:'var(--gray-400)' }}>
            <div style={{ fontSize:40 }}>👥</div>
            <div style={{ marginTop:10, fontWeight:600 }}>Sin clientes aún</div>
            <div style={{ fontSize:13, marginTop:4 }}>Los clientes se agregan al cobrar o manualmente</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Nombre / Razón social</th>
                  <th>Celular</th>
                  <th>Compras</th>
                  <th>Total gastado</th>
                  <th>Última visita</th>
                  <th>Promo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(c => (
                  <tr key={c._id} style={{ cursor:'pointer' }} onClick={() => setDetalle(c)}>
                    <td>
                      <span className={'badge ' + (TIPO_BADGE[c.tipoDoc] || 'badge-info')} style={{ marginRight:6 }}>
                        {c.tipoDoc?.toUpperCase()}
                      </span>
                      <span style={{ fontFamily:'monospace', fontSize:13 }}>{c.numDoc}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight:600 }}>{c.nombre}</div>
                      {c.razonSocial && c.razonSocial !== c.nombre && (
                        <div style={{ fontSize:11, color:'var(--gray-500)' }}>{c.razonSocial}</div>
                      )}
                    </td>
                    <td style={{ fontSize:13 }}>{c.celular || c.telefono || '—'}</td>
                    <td style={{ textAlign:'center', fontWeight:700 }}>{c.totalCompras}</td>
                    <td style={{ fontWeight:700, color:'var(--accent)' }}>
                      S/ {(c.montoAcumulado || 0).toFixed(2)}
                    </td>
                    <td style={{ fontSize:12, color:'var(--gray-500)' }}>
                      {c.ultimaVisita ? new Date(c.ultimaVisita).toLocaleDateString('es-PE') : '—'}
                    </td>
                    <td style={{ textAlign:'center', fontSize:16 }}>
                      {c.aceptaPromo ? '✅' : '❌'}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <button className="btn btn-danger btn-sm" onClick={() => eliminar(c._id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL NUEVO CLIENTE */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" style={{ maxWidth:520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">Nuevo Cliente</div>
            <form onSubmit={guardar}>

              {/* Tipo + Número documento */}
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Tipo documento</label>
                  <select className="form-select" value={form.tipoDoc}
                    onChange={e => setForm(f => ({ ...f, tipoDoc: e.target.value }))}>
                    <option value="dni">DNI</option>
                    <option value="ruc">RUC</option>
                    <option value="ce">Carné Extranjería</option>
                    <option value="pasaporte">Pasaporte</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Número {consultando && <span style={{ color:'var(--info)', fontSize:11 }}>consultando...</span>}
                  </label>
                  <input className="form-input"
                    placeholder={form.tipoDoc === 'ruc' ? '20123456789' : '12345678'}
                    value={form.numDoc}
                    onChange={e => consultarDoc(e.target.value)}
                    maxLength={11} />
                </div>
              </div>

              {/* Mensaje API */}
              {msgApi && (
                <div style={{ background: msgApi.includes('error') || msgApi.includes('No se pudo') ? '#FFF8E1' : '#E8F5E9', color: msgApi.includes('error') || msgApi.includes('No se pudo') ? '#E65100' : 'var(--success)', borderRadius:'var(--radius-sm)', padding:'8px 12px', fontSize:12, marginBottom:12, fontWeight:600 }}>
                  {msgApi}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Nombre completo / Razón social *</label>
                <input className="form-input" value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
              </div>

              <div className="form-group">
                <label className="form-label">Dirección</label>
                <input className="form-input" value={form.direccion}
                  onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Celular (WhatsApp)</label>
                  <input className="form-input" placeholder="987654321" value={form.celular}
                    onChange={e => setForm(f => ({ ...f, celular: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono fijo</label>
                  <input className="form-input" value={form.telefono}
                    onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Cumpleaños (MM-DD)</label>
                  <input className="form-input" placeholder="03-25" maxLength={5} value={form.cumpleanos}
                    onChange={e => setForm(f => ({ ...f, cumpleanos: e.target.value }))} />
                </div>
              </div>

              <label style={{ display:'flex', alignItems:'center', gap:10, fontSize:14, cursor:'pointer', marginBottom:14 }}>
                <input type="checkbox" checked={form.aceptaPromo}
                  onChange={e => setForm(f => ({ ...f, aceptaPromo: e.target.checked }))} />
                Acepta recibir promociones por WhatsApp
              </label>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE CLIENTE */}
      {detalle && (
        <div className="modal-overlay" onClick={() => setDetalle(null)}>
          <div className="modal" style={{ maxWidth:460 }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
              <div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:800 }}>{detalle.nombre}</div>
                <div style={{ fontSize:13, color:'var(--gray-500)' }}>{detalle.tipoDoc?.toUpperCase()}: {detalle.numDoc}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setDetalle(null)}>✕</button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              {[
                { label:'Total compras',  val: detalle.totalCompras,          fmt: v => v + ' pedidos' },
                { label:'Total gastado',  val: detalle.montoAcumulado,        fmt: v => 'S/ ' + (v||0).toFixed(2) },
                { label:'Última visita',  val: detalle.ultimaVisita,          fmt: v => v ? new Date(v).toLocaleDateString('es-PE') : 'Nunca' },
                { label:'Acepta promo',   val: detalle.aceptaPromo,           fmt: v => v ? 'Sí' : 'No' },
              ].map((item, i) => (
                <div key={i} style={{ background:'var(--gray-50)', borderRadius:'var(--radius-sm)', padding:'10px 12px' }}>
                  <div style={{ fontSize:11, color:'var(--gray-500)', marginBottom:3 }}>{item.label}</div>
                  <div style={{ fontWeight:700, fontSize:15 }}>{item.fmt(item.val)}</div>
                </div>
              ))}
            </div>

            {[
              { label:'Dirección',        val: detalle.direccion },
              { label:'Celular',          val: detalle.celular },
              { label:'Teléfono',         val: detalle.telefono },
              { label:'Email',            val: detalle.email },
              { label:'Cumpleaños',       val: detalle.cumpleanos },
            ].filter(r => r.val).map((row, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--gray-100)', fontSize:13 }}>
                <span style={{ color:'var(--gray-500)' }}>{row.label}</span>
                <span style={{ fontWeight:600 }}>{row.val}</span>
              </div>
            ))}

            {detalle.celular && detalle.aceptaPromo && (
              <a href={`https://wa.me/51${detalle.celular.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                style={{ display:'block', marginTop:16, textAlign:'center', background:'#25D366', color:'white', borderRadius:'var(--radius-sm)', padding:'10px', fontWeight:700, textDecoration:'none' }}>
                Abrir WhatsApp
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
