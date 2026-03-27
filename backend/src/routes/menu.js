const router = require('express').Router();
const Producto = require('../models/Producto');
const { auth, soloAdmin } = require('../middleware/auth');

router.get('/', auth, async (_req, res) => {
  try {
    const productos = await Producto.find({ activo: true }).sort({ categoria: 1, orden: 1, nombre: 1 });
    res.json(productos);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, soloAdmin, async (req, res) => {
  try {
    const { nombre, precio, categoria, emoji, descripcion } = req.body;
    if (!nombre || !precio || !categoria) return res.status(400).json({ error: 'Faltan campos' });
    const prod = await Producto.create({ nombre, precio: parseFloat(precio), categoria, emoji: emoji || '🍽️', descripcion: descripcion || '' });
    res.status(201).json(prod);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, soloAdmin, async (req, res) => {
  try {
    const prod = await Producto.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!prod) return res.status(404).json({ error: 'No encontrado' });
    res.json(prod);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, soloAdmin, async (req, res) => {
  try {
    const prod = await Producto.findById(req.params.id);
    if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });

    await prod.softDelete();
    res.json({ ok: true, message: 'Producto eliminado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
