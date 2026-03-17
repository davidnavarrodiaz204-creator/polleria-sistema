const router = require('express').Router();
const Caja   = require('../models/Caja');
const Pedido = require('../models/Pedido');
const Egreso = require('../models/Egreso');
const { auth, soloAdmin } = require('../middleware/auth');
const { emit } = require('../config/socket');

// Obtener fecha de hoy en Peru (UTC-5)
const hoyPeru = () => {
  const ahora = new Date();
  ahora.setHours(ahora.getHours() - 5); // ajuste UTC-5 Peru
  return ahora.toISOString().split('T')[0];
};

// GET caja de hoy
router.get('/hoy', auth, async (_req, res) => {
  try {
    const fecha = hoyPeru();
    const caja  = await Caja.findOne({ fecha });
    res.json(caja || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET historial
router.get('/', auth, soloAdmin, async (_req, res) => {
  try {
    const cajas = await Caja.find().sort({ fecha: -1 }).limit(30);
    res.json(cajas);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST abrir caja
router.post('/abrir', auth, async (req, res) => {
  try {
    const fecha = hoyPeru();

    // Si ya hay una abierta hoy, devolverla sin error
    const existeAbierta = await Caja.findOne({ fecha, estado: 'abierta' });
    if (existeAbierta) return res.json(existeAbierta);

    // Si la de hoy está cerrada, permitir abrir una nueva
    // (en producción real se puede validar, por ahora permitimos)
    const caja = await Caja.create({
      fecha,
      montoApertura: Number(req.body.montoApertura) || 0,
      abiertaPor:    req.usuario.nombre,
      estado:        'abierta',
    });

    emit.cajaActualizada(req.io, caja);
    res.status(201).json(caja);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST cerrar caja
router.post('/cerrar', auth, async (req, res) => {
  try {
    const fecha = hoyPeru();
    const caja  = await Caja.findOne({ fecha, estado: 'abierta' });
    if (!caja) return res.status(404).json({ error: 'No hay caja abierta hoy' });

    // Calcular totales del día
    const inicio = new Date(fecha + 'T05:00:00.000Z'); // medianoche Peru
    const fin    = new Date(inicio); fin.setDate(fin.getDate() + 1);

    const pedidos = await Pedido.find({ pagado: true, creadoEn: { $gte: inicio, $lt: fin } });
    const egresos = await Egreso.find({ fecha });

    caja.totalVentas   = pedidos.reduce((s, p) => s + p.total, 0);
    caja.totalEfectivo = pedidos.filter(p => p.metodoPago === 'efectivo').reduce((s, p) => s + p.total, 0);
    caja.totalYape     = pedidos.filter(p => p.metodoPago === 'yape').reduce((s, p) => s + p.total, 0);
    caja.totalPlin     = pedidos.filter(p => p.metodoPago === 'plin').reduce((s, p) => s + p.total, 0);
    caja.totalTarjeta  = pedidos.filter(p => p.metodoPago === 'tarjeta').reduce((s, p) => s + p.total, 0);
    caja.totalEgresos  = egresos.reduce((s, e) => s + e.monto, 0);
    caja.montoCierre   = Number(req.body.montoCierre) || 0;
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
