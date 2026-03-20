/**
 * reservas.js — Sistema de reservas de mesa
 * Autor: David Navarro Diaz
 */
const express = require('express');
const router  = express.Router();
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');

const reservaSchema = new mongoose.Schema({
  fecha:        { type: String, required: true },  // YYYY-MM-DD
  hora:         { type: String, required: true },  // HH:MM
  nombre:       { type: String, required: true },
  celular:      { type: String, default: '' },
  personas:     { type: Number, default: 2 },
  mesaId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Mesa', default: null },
  mesaNumero:   { type: Number, default: null },
  nota:         { type: String, default: '' },
  estado:       { type: String, enum: ['pendiente','confirmada','cancelada','completada'], default: 'pendiente' },
  creadoPor:    { type: String, default: '' },
}, { timestamps: true });

const Reserva = mongoose.models.Reserva || mongoose.model('Reserva', reservaSchema);

// GET /api/reservas?fecha=YYYY-MM-DD
router.get('/', auth, async (req, res) => {
  try {
    const filtro = {};
    if (req.query.fecha) filtro.fecha = req.query.fecha;
    if (req.query.estado) filtro.estado = req.query.estado;
    const reservas = await Reserva.find(filtro).sort({ fecha: 1, hora: 1 });
    res.json(reservas);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/reservas
router.post('/', auth, async (req, res) => {
  try {
    const reserva = await Reserva.create({
      ...req.body,
      creadoPor: req.usuario.nombre
    });
    res.status(201).json(reserva);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// PUT /api/reservas/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const reserva = await Reserva.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!reserva) return res.status(404).json({ error: 'No encontrada' });
    res.json(reserva);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// DELETE /api/reservas/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await Reserva.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
