const router  = require('express').Router();
const axios   = require('axios');
const Cliente = require('../models/Cliente');
const { auth } = require('../middleware/auth');

// ── Consultar DNI o RUC en APIs públicas de Perú ─────────────────────────────
router.get('/consultar/:numDoc', auth, async (req, res) => {
  const { numDoc } = req.params;
  const limpio = numDoc.replace(/\D/g, '');

  if (limpio.length !== 8 && limpio.length !== 11) {
    return res.status(400).json({ error: 'Ingresa 8 dígitos (DNI) o 11 dígitos (RUC)' });
  }

  // Primero buscar en nuestra propia base de datos
  const existe = await Cliente.findOne({ numDoc: limpio });
  if (existe) return res.json({ ...existe.toObject(), fuenteLocal: true });

  try {
    let datos = null;

    if (limpio.length === 8) {
      // Consultar DNI — API gratuita apis.net.pe
      const { data } = await axios.get(
        `https://api.apis.net.pe/v2/reniec/dni?numero=${limpio}`,
        { timeout: 8000, headers: { Authorization: `Bearer ${process.env.APIS_PERU_TOKEN || 'apis-token-demo'}` } }
      );
      datos = {
        tipoDoc: 'dni',
        numDoc: limpio,
        nombre: `${data.nombres || ''} ${data.apellidoPa || ''} ${data.apellidoMa || ''}`.trim(),
        direccion: data.direccion || '',
        ubigeo: data.ubigeo || '',
        departamento: data.departamento || '',
      };
    } else {
      // Consultar RUC — API gratuita apis.net.pe
      const { data } = await axios.get(
        `https://api.apis.net.pe/v2/sunat/ruc?numero=${limpio}`,
        { timeout: 8000, headers: { Authorization: `Bearer ${process.env.APIS_PERU_TOKEN || 'apis-token-demo'}` } }
      );
      datos = {
        tipoDoc: 'ruc',
        numDoc: limpio,
        nombre: data.razonSocial || '',
        razonSocial: data.razonSocial || '',
        direccion: data.direccionCompleta || data.direccion || '',
        ubigeo: data.ubigeo || '',
        departamento: data.departamento || '',
        telefono: data.telefonos?.[0] || '',
      };
    }

    res.json({ ...datos, fuenteLocal: false });
  } catch (err) {
    // Si la API falla, devolver estructura vacía para que el usuario llene manualmente
    res.json({
      tipoDoc: limpio.length === 8 ? 'dni' : 'ruc',
      numDoc: limpio,
      nombre: '',
      direccion: '',
      fuenteLocal: false,
      apiError: true,
      mensaje: 'No se pudo consultar automáticamente. Completa los datos manualmente.',
    });
  }
});

// ── CRUD Clientes ─────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { q } = req.query;
    const filtro = q
      ? { $or: [
          { numDoc: { $regex: q, $options: 'i' } },
          { nombre: { $regex: q, $options: 'i' } },
          { celular: { $regex: q, $options: 'i' } },
        ]}
      : {};
    const clientes = await Cliente.find({ ...filtro, activo: true }).sort({ ultimaVisita: -1 }).limit(100);
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
    if (existe) return res.json(existe); // Devolver existente sin error
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
