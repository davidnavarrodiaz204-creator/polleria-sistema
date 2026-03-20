/**
 * inventario.js — Control básico de ingredientes/insumos
 * Permite registrar stock, descontar por producción y alertar cuando baja.
 * Autor: David Navarro Diaz
 */
const express = require('express');
const router  = express.Router();
const mongoose = require('mongoose');
const { auth, soloAdmin } = require('../middleware/auth');

// Modelo inline (no requiere archivo separado si no existe)
const inventarioSchema = new mongoose.Schema({
  nombre:      { type: String, required: true, trim: true },
  unidad:      { type: String, default: 'kg' },   // kg, lt, und, bolsa, etc.
  stockActual: { type: Number, default: 0 },
  stockMinimo: { type: Number, default: 0 },       // alerta si baja de aquí
  costo:       { type: Number, default: 0 },       // costo por unidad
  categoria:   { type: String, default: 'Ingrediente' },
  activo:      { type: Boolean, default: true },
}, { timestamps: true });

const Inventario = mongoose.models.Inventario || mongoose.model('Inventario', inventarioSchema);

// GET /api/inventario
router.get('/', auth, async (req, res) => {
  try {
    const items = await Inventario.find({ activo: true }).sort({ nombre: 1 });
    // Marcar los que están bajo el mínimo
    const conAlertas = items.map(i => ({
      ...i.toObject(),
      bajoMinimo: i.stockActual <= i.stockMinimo
    }));
    res.json(conAlertas);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/inventario — crear ítem
router.post('/', auth, soloAdmin, async (req, res) => {
  try {
    const item = await Inventario.create(req.body);
    res.status(201).json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// PUT /api/inventario/:id — actualizar (stock, precio, etc.)
router.put('/:id', auth, soloAdmin, async (req, res) => {
  try {
    const item = await Inventario.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ error: 'No encontrado' });
    res.json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// PATCH /api/inventario/:id/ajustar — sumar o restar stock
router.patch('/:id/ajustar', auth, soloAdmin, async (req, res) => {
  try {
    const { cantidad, motivo } = req.body; // cantidad puede ser negativa
    const item = await Inventario.findByIdAndUpdate(
      req.params.id,
      { $inc: { stockActual: cantidad } },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ...item.toObject(), motivo });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// DELETE /api/inventario/:id — desactivar (no borrar)
router.delete('/:id', auth, soloAdmin, async (req, res) => {
  try {
    await Inventario.findByIdAndUpdate(req.params.id, { activo: false });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
