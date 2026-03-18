const router  = require('express').Router();
const axios   = require('axios');
const Cliente = require('../models/Cliente');
const { auth } = require('../middleware/auth');

// ── Consultar DNI o RUC ───────────────────────────────────────────────────────
router.get('/consultar/:numDoc', auth, async (req, res) => {
  const limpio = req.params.numDoc.replace(/\D/g, '');

  if (limpio.length !== 8 && limpio.length !== 11)
    return res.status(400).json({ error: 'Ingresa 8 dígitos (DNI) o 11 (RUC)' });

  // 1. Buscar primero en base de datos propia
  const existe = await Cliente.findOne({ numDoc: limpio });
  if (existe) return res.json({ ...existe.toObject(), fuenteLocal: true });

  const token = process.env.APIS_PERU_TOKEN || '';

  // 2. Si no hay token configurado, devolver vacío para llenado manual
  if (!token || token === 'apis-token-demo') {
    return res.json({
      tipoDoc: limpio.length === 8 ? 'dni' : 'ruc',
      numDoc: limpio,
      nombre: '', razonSocial: '', direccion: '',
      fuenteLocal: false, apiError: true,
      mensaje: 'Configura APIS_PERU_TOKEN en el .env para búsqueda automática. Ver README.',
    });
  }

  try {
    let datos = null;

    if (limpio.length === 8) {
      // DNI — apis.net.pe
      const { data } = await axios.get(
        `https://api.apis.net.pe/v2/reniec/dni?numero=${limpio}`,
        { timeout: 8000, headers: { Authorization: `Bearer ${token}` } }
      );
      datos = {
        tipoDoc:  'dni',
        numDoc:   limpio,
        nombre:   [data.nombres, data.apellidoPa, data.apellidoMa].filter(Boolean).join(' ').trim(),
        direccion: data.direccion || '',
      };
    } else {
      // RUC — apis.net.pe
      const { data } = await axios.get(
        `https://api.apis.net.pe/v2/sunat/ruc?numero=${limpio}`,
        { timeout: 8000, headers: { Authorization: `Bearer ${token}` } }
      );
      datos = {
        tipoDoc:     'ruc',
        numDoc:      limpio,
        nombre:      data.razonSocial || '',
        razonSocial: data.razonSocial || '',
        direccion:   data.direccionCompleta || data.direccion || '',
        telefono:    data.telefonos?.[0] || '',
        estado:      data.estado || '',
      };
    }

    res.json({ ...datos, fuenteLocal: false });

  } catch (err) {
    const status = err.response?.status;
    let mensaje = 'No se encontró. Completa los datos manualmente.';
    if (status === 401) mensaje = 'Token inválido. Revisa APIS_PERU_TOKEN en el .env';
    if (status === 422) mensaje = 'Número no encontrado en SUNAT/RENIEC.';

    res.json({
      tipoDoc: limpio.length === 8 ? 'dni' : 'ruc',
      numDoc: limpio, nombre: '', razonSocial: '', direccion: '',
      fuenteLocal: false, apiError: true, mensaje,
    });
  }
});

// ── CRUD ──────────────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { q } = req.query;
    const filtro = q ? {
      $or: [
        { numDoc:  { $regex: q, $options: 'i' } },
        { nombre:  { $regex: q, $options: 'i' } },
        { celular: { $regex: q, $options: 'i' } },
      ]
    } : {};
    const clientes = await Cliente.find({ ...filtro, activo: true })
      .sort({ ultimaVisita: -1 }).limit(100);
    res.json(clientes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const c = await Cliente.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'No encontrado' });
    res.json(c);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { numDoc } = req.body;
    if (!numDoc) return res.status(400).json({ error: 'Número de documento requerido' });
    const existe = await Cliente.findOne({ numDoc });
    if (existe) {
      // Actualizar datos si vienen nuevos
      Object.assign(existe, req.body);
      await existe.save();
      return res.json(existe);
    }
    const cliente = await Cliente.create(req.body);
    res.status(201).json(cliente);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const c = await Cliente.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!c) return res.status(404).json({ error: 'No encontrado' });
    res.json(c);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Cliente.findByIdAndUpdate(req.params.id, { activo: false });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
