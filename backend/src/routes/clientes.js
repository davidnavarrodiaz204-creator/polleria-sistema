const express = require('express');
const router = express.Router();
const Cliente = require('../models/Cliente');
const { auth: authMiddleware } = require('../middleware/auth');

// ================================================================
// CONSULTA DNI - APIs gratuitas en cascada
// ================================================================
const consultarDNI = async (dni) => {
  const token = process.env.APIS_PERU_TOKEN || '';
  const errores = [];

  // API 1: apis.net.pe v2 con Bearer token
  if (token) {
    try {
      const res = await fetch(`https://api.apis.net.pe/v2/dni?numero=${dni}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(7000)
      });
      const data = await res.json();
      console.log('[DNI API1 status]', res.status, JSON.stringify(data).slice(0,100));
      if (res.ok && data.nombres) {
        return { nombre: `${data.nombres} ${data.apellidoPaterno||''} ${data.apellidoMaterno||''}`.trim() };
      }
      errores.push('API1:' + (data.message || data.error || res.status));
    } catch (e) { errores.push('API1:' + e.message); }
  }

  // API 2: dniruc.apisperu.com con token
  if (token) {
    try {
      const res = await fetch(`https://dniruc.apisperu.com/api/v1/dni/${dni}?token=${token}`, {
        signal: AbortSignal.timeout(7000)
      });
      const data = await res.json();
      console.log('[DNI API2 status]', res.status, JSON.stringify(data).slice(0,100));
      if (res.ok && data.nombres) {
        return { nombre: `${data.nombres} ${data.apellidoPaterno||''} ${data.apellidoMaterno||''}`.trim() };
      }
      errores.push('API2:' + (data.message || data.error || res.status));
    } catch (e) { errores.push('API2:' + e.message); }
  }

  // API 3: apis.net.pe v1 sin token
  try {
    const res = await fetch(`https://api.apis.net.pe/v1/dni?numero=${dni}`, {
      headers: { 'Referer': 'https://apis.net.pe' },
      signal: AbortSignal.timeout(7000)
    });
    const data = await res.json();
    console.log('[DNI API3 status]', res.status, JSON.stringify(data).slice(0,100));
    if (res.ok && data.nombres) {
      return { nombre: `${data.nombres} ${data.apellidoPaterno||''} ${data.apellidoMaterno||''}`.trim() };
    }
    errores.push('API3:' + (data.message || data.error || res.status));
  } catch (e) { errores.push('API3:' + e.message); }

  // API 4: apiperu.dev sin token
  try {
    const res = await fetch(`https://apiperu.dev/api/dni/${dni}`, {
      signal: AbortSignal.timeout(7000)
    });
    const data = await res.json();
    console.log('[DNI API4 status]', res.status, JSON.stringify(data).slice(0,100));
    const nombre = data?.data?.nombre_completo || data?.nombre;
    if (res.ok && nombre) return { nombre };
    errores.push('API4:' + (data.message || data.error || res.status));
  } catch (e) { errores.push('API4:' + e.message); }

  console.log('[DNI] Todos los intentos fallaron:', errores.join(' | '));
  throw new Error('No se pudo consultar el DNI. Ingrese el nombre manualmente.');
};

// ================================================================
// CONSULTA RUC - APIs gratuitas en cascada (solo nombre + dirección)
// ================================================================
const consultarRUC = async (ruc) => {
  const token = process.env.APIS_PERU_TOKEN || '';
  const errores = [];

  // Extrae solo nombre y dirección de cualquier respuesta
  const extraer = (data) => {
    const d = data?.data || data;
    const nombre = d?.razonSocial || d?.nombre_o_razon_social || d?.nombre || '';
    const direccion = d?.direccion || d?.domicilioFiscal || '';
    if (!nombre) return null;
    return { nombre, direccion };
  };

  // API 1: apis.net.pe v2 con Bearer token
  if (token) {
    try {
      const res = await fetch(`https://api.apis.net.pe/v2/ruc?numero=${ruc}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(7000)
      });
      const data = await res.json();
      console.log('[RUC API1 status]', res.status, JSON.stringify(data).slice(0,150));
      const r = extraer(data);
      if (res.ok && r) return r;
      errores.push('API1:' + (data.message || data.error || res.status));
    } catch (e) { errores.push('API1:' + e.message); }
  }

  // API 2: dniruc.apisperu.com con token en query
  if (token) {
    try {
      const res = await fetch(`https://dniruc.apisperu.com/api/v1/ruc/${ruc}?token=${token}`, {
        signal: AbortSignal.timeout(7000)
      });
      const data = await res.json();
      console.log('[RUC API2 status]', res.status, JSON.stringify(data).slice(0,150));
      const r = extraer(data);
      if (res.ok && r) return r;
      errores.push('API2:' + (data.message || data.error || res.status));
    } catch (e) { errores.push('API2:' + e.message); }
  }

  // API 3: apis.net.pe v1 sin token
  try {
    const res = await fetch(`https://api.apis.net.pe/v1/ruc?numero=${ruc}`, {
      headers: { 'Referer': 'https://apis.net.pe' },
      signal: AbortSignal.timeout(7000)
    });
    const data = await res.json();
    console.log('[RUC API3 status]', res.status, JSON.stringify(data).slice(0,150));
    const r = extraer(data);
    if (res.ok && r) return r;
    errores.push('API3:' + (data.message || data.error || res.status));
  } catch (e) { errores.push('API3:' + e.message); }

  // API 4: apiperu.dev sin token
  try {
    const res = await fetch(`https://apiperu.dev/api/ruc/${ruc}`, {
      signal: AbortSignal.timeout(7000)
    });
    const data = await res.json();
    console.log('[RUC API4 status]', res.status, JSON.stringify(data).slice(0,150));
    const r = extraer(data);
    if (res.ok && r) return r;
    errores.push('API4:' + (data.message || data.error || res.status));
  } catch (e) { errores.push('API4:' + e.message); }

  console.log('[RUC] Todos los intentos fallaron:', errores.join(' | '));
  throw new Error('No se pudo consultar el RUC. Ingrese los datos manualmente.');
};

// ================================================================
// GET /api/clientes/consultar/:numero — detecta DNI (8) o RUC (11)
// ================================================================
router.get('/consultar/:numero', authMiddleware, async (req, res) => {
  try {
    const limpio = req.params.numero.replace(/\D/g, '');

    // Buscar primero en la base de datos local
    const clienteLocal = await Cliente.findOne({ numDoc: limpio });
    if (clienteLocal) {
      return res.json({
        tipoDoc:  clienteLocal.tipoDoc,
        nombre:   clienteLocal.nombre,
        direccion: clienteLocal.direccion || '',
        fuenteLocal: true
      });
    }

    if (limpio.length === 8) {
      const r = await consultarDNI(limpio);
      // DNI: solo nombre (RENIEC no da dirección gratis)
      return res.json({ tipoDoc: 'dni', nombre: r.nombre, direccion: '' });
    }

    if (limpio.length === 11) {
      const r = await consultarRUC(limpio);
      // RUC: nombre + dirección de SUNAT
      return res.json({ tipoDoc: 'ruc', nombre: r.nombre, razonSocial: r.nombre, direccion: r.direccion || '' });
    }

    res.status(400).json({ error: 'Debe tener 8 dígitos (DNI) o 11 dígitos (RUC)' });
  } catch (error) {
    res.status(503).json({ apiError: true, mensaje: error.message });
  }
});

// ================================================================
// CRUD CLIENTES
// ================================================================

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    const filtro = q
      ? { $or: [
          { nombre: { $regex: q, $options: 'i' } },
          { numDoc: { $regex: q, $options: 'i' } },
          { celular: { $regex: q, $options: 'i' } }
        ]}
      : {};
    const clientes = await Cliente.find(filtro).sort({ createdAt: -1 });
    res.json(clientes);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(cliente);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const cliente = new Cliente(req.body);
    await cliente.save();
    res.status(201).json(cliente);
  } catch (error) {
    if (error.code === 11000) res.status(400).json({ error: 'Ya existe un cliente con ese DNI/RUC' });
    else res.status(400).json({ error: error.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(cliente);
  } catch (error) { res.status(400).json({ error: error.message }); }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    await cliente.softDelete();
    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
