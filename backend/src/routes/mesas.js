const router = require('express').Router();
const Mesa = require('../models/Mesa');
const { auth } = require('../middleware/auth');
const { emit } = require('../config/socket');

router.get('/', auth, async (_req, res) => {
  try {
    const mesas = await Mesa.find({ activa: true }).sort({ numero: 1 });
    res.json(mesas);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { numero, capacidad } = req.body;
    if (!numero) return res.status(400).json({ error: 'Número requerido' });
    const existe = await Mesa.findOne({ numero });
    if (existe) return res.status(400).json({ error: 'Mesa ya existe' });
    const mesa = await Mesa.create({ numero, capacidad: capacidad || 4 });
    emit.mesaActualizada(req.io, mesa);
    res.status(201).json(mesa);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const mesa = await Mesa.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!mesa) return res.status(404).json({ error: 'No encontrada' });
    emit.mesaActualizada(req.io, mesa);
    res.json(mesa);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Mesa.findByIdAndUpdate(req.params.id, { activa: false });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
