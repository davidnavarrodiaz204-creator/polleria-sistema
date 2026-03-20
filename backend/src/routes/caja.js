/**
 * caja.js — Rutas de caja con soporte multi-turno
 *
 * Lógica de turnos:
 *  - Un día puede tener múltiples aperturas (turno mañana, turno noche, etc.)
 *  - Solo puede haber UNA caja abierta a la vez
 *  - Al cerrar turno se imprime resumen del turno, no del día completo
 *  - Solo admin y cajero pueden operar la caja
 *
 * Autor: David Navarro Diaz
 */
const router = require('express').Router();
const Caja   = require('../models/Caja');
const Pedido = require('../models/Pedido');
const Egreso = require('../models/Egreso');
const { auth } = require('../middleware/auth');
const { emit } = require('../config/socket');

// Solo admin o cajero pueden operar caja
const soloCaja = (req, res, next) => {
  if (!['admin', 'cajero'].includes(req.usuario?.rol)) {
    return res.status(403).json({ error: 'Solo administrador o cajero pueden operar la caja' });
  }
  next();
};

const hoyPeru = () => {
  const ahora = new Date();
  ahora.setHours(ahora.getHours() - 5);
  return ahora.toISOString().split('T')[0];
};

// GET /api/caja/hoy — caja abierta en este momento
router.get('/hoy', auth, async (_req, res) => {
  try {
    const caja = await Caja.findOne({ estado: 'abierta' }).sort({ createdAt: -1 });
    res.json(caja || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/caja — historial de cajas (últimas 60)
router.get('/', auth, async (_req, res) => {
  try {
    if (!['admin', 'cajero'].includes(req.usuario?.rol)) {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    const cajas = await Caja.find().sort({ createdAt: -1 }).limit(60);
    res.json(cajas);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/caja/abrir — abrir turno de caja
router.post('/abrir', auth, soloCaja, async (req, res) => {
  try {
    // Verificar que no haya otra caja abierta
    const yaAbierta = await Caja.findOne({ estado: 'abierta' });
    if (yaAbierta) return res.json(yaAbierta); // devolver la existente sin error

    const caja = await Caja.create({
      fecha:         hoyPeru(),
      montoApertura: Number(req.body.montoApertura) || 0,
      abiertaPor:    req.usuario.nombre,
      estado:        'abierta',
    });

    emit.cajaActualizada(req.io, caja);
    res.status(201).json(caja);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/caja/cerrar — cerrar turno actual
router.post('/cerrar', auth, soloCaja, async (req, res) => {
  try {
    const caja = await Caja.findOne({ estado: 'abierta' }).sort({ createdAt: -1 });
    if (!caja) return res.status(404).json({ error: 'No hay caja abierta' });

    // Calcular ventas DESDE que se abrió este turno
    const inicio = new Date(caja.createdAt);
    const fin    = new Date();

    const pedidos = await Pedido.find({ pagado: true, creadoEn: { $gte: inicio, $lt: fin } });
    const egresos = await Egreso.find({
      createdAt: { $gte: inicio, $lt: fin }
    });

    caja.totalVentas        = pedidos.reduce((s, p) => s + p.total, 0);
    caja.totalEfectivo      = pedidos.filter(p => p.metodoPago === 'efectivo').reduce((s, p) => s + p.total, 0);
    caja.totalYape          = pedidos.filter(p => p.metodoPago === 'yape').reduce((s, p) => s + p.total, 0);
    caja.totalPlin          = pedidos.filter(p => p.metodoPago === 'plin').reduce((s, p) => s + p.total, 0);
    caja.totalTarjeta       = pedidos.filter(p => p.metodoPago === 'tarjeta').reduce((s, p) => s + p.total, 0);
    caja.totalTransferencia = pedidos.filter(p => p.metodoPago === 'transferencia').reduce((s, p) => s + p.total, 0);

    const tickets  = pedidos.filter(p => p.tipoComprobante === 'ticket');
    const boletas  = pedidos.filter(p => p.tipoComprobante === 'boleta');
    const facturas = pedidos.filter(p => p.tipoComprobante === 'factura');
    caja.totalTickets  = tickets.length;
    caja.totalBoletas  = boletas.length;
    caja.totalFacturas = facturas.length;
    caja.montoTickets  = tickets.reduce((s, p) => s + p.total, 0);
    caja.montoBoletas  = boletas.reduce((s, p) => s + p.total, 0);
    caja.montoFacturas = facturas.reduce((s, p) => s + p.total, 0);

    caja.subTotal  = Math.round((caja.totalVentas / 1.18) * 100) / 100;
    caja.totalIGV  = Math.round((caja.totalVentas - caja.subTotal) * 100) / 100;

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
