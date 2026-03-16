const router = require('express').Router();
const Egreso = require('../models/Egreso');
const { auth, soloAdmin } = require('../middleware/auth');

const hoy = () => new Date().toISOString().split('T')[0];

// GET egresos (hoy o por fecha)
router.get('/', auth, async (req, res) => {
  try {
    const fecha = req.query.fecha || hoy();
    const egresos = await Egreso.find({ fecha }).sort({ createdAt: -1 });
    res.json(egresos);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST registrar egreso
router.post('/', auth, async (req, res) => {
  try {
    const { categoria, descripcion, monto, comprobante } = req.body;
    if (!categoria || !descripcion || !monto) return res.status(400).json({ error: 'Faltan campos' });

    const egreso = await Egreso.create({
      fecha: hoy(),
      categoria,
      descripcion,
      monto: parseFloat(monto),
      comprobante: comprobante || '',
      registradoPor: req.usuario.nombre,
    });
    res.status(201).json(egreso);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE eliminar egreso
router.delete('/:id', auth, soloAdmin, async (req, res) => {
  try {
    await Egreso.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
