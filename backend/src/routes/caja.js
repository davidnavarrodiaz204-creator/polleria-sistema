const router = require('express').Router();
const Caja = require('../models/Caja');
const Pedido = require('../models/Pedido');
const Egreso = require('../models/Egreso');
const { auth, soloAdmin } = require('../middleware/auth');
const { emit } = require('../config/socket');

const hoy = () => new Date().toISOString().split('T')[0];

// GET caja de hoy
router.get('/hoy', auth, async (_req, res) => {
  try {
    const caja = await Caja.findOne({ fecha: hoy() });
    res.json(caja || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET historial de cajas
router.get('/', auth, soloAdmin, async (_req, res) => {
  try {
    const cajas = await Caja.find().sort({ fecha: -1 }).limit(30);
    res.json(cajas);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST abrir caja
router.post('/abrir', auth, async (req, res) => {
  try {
    const fecha = hoy();
    const existe = await Caja.findOne({ fecha });
    if (existe) return res.status(400).json({ error: 'Ya hay una caja abierta hoy' });

    const caja = await Caja.create({
      fecha,
      montoApertura: req.body.montoApertura || 0,
      abiertaPor: req.usuario.nombre,
      estado: 'abierta',
    });

    emit.cajaActualizada(req.io, caja);
    res.status(201).json(caja);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST cerrar caja
router.post('/cerrar', auth, async (req, res) => {
  try {
    const caja = await Caja.findOne({ fecha: hoy(), estado: 'abierta' });
    if (!caja) return res.status(404).json({ error: 'No hay caja abierta hoy' });

    // Calcular totales del día
    const inicio = new Date(hoy());
    const fin = new Date(hoy()); fin.setDate(fin.getDate() + 1);

    const pedidos = await Pedido.find({ pagado: true, creadoEn: { $gte: inicio, $lt: fin } });
    const egresos = await Egreso.find({ fecha: hoy() });

    caja.totalVentas   = pedidos.reduce((s, p) => s + p.total, 0);
    caja.totalEfectivo = pedidos.filter(p => p.metodoPago === 'efectivo').reduce((s, p) => s + p.total, 0);
    caja.totalYape     = pedidos.filter(p => p.metodoPago === 'yape').reduce((s, p) => s + p.total, 0);
    caja.totalPlin     = pedidos.filter(p => p.metodoPago === 'plin').reduce((s, p) => s + p.total, 0);
    caja.totalTarjeta  = pedidos.filter(p => p.metodoPago === 'tarjeta').reduce((s, p) => s + p.total, 0);
    caja.totalEgresos  = egresos.reduce((s, e) => s + e.monto, 0);
    caja.montoCierre   = req.body.montoCierre || 0;
    caja.saldoFinal    = caja.montoApertura + caja.totalEfectivo - caja.totalEgresos;
    caja.observaciones = req.body.observaciones || '';
    caja.cerradaPor    = req.usuario.nombre;
    caja.estado        = 'cerrada';

    await caja.save();
    emit.cajaActualizada(req.io, caja);
    res.json(caja);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
