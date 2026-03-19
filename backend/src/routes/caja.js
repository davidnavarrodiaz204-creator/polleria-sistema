const router = require('express').Router();
const Caja   = require('../models/Caja');
const Pedido = require('../models/Pedido');
const Egreso = require('../models/Egreso');
const { auth, soloAdmin } = require('../middleware/auth');
const { emit } = require('../config/socket');

// Fecha hoy en Peru UTC-5
const hoyPeru = () => {
  const ahora = new Date();
  ahora.setHours(ahora.getHours() - 5);
  return ahora.toISOString().split('T')[0];
};

// GET /api/caja/hoy
router.get('/hoy', auth, async (_req, res) => {
  try {
    const caja = await Caja.findOne({ fecha: hoyPeru() });
    res.json(caja || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/caja — historial últimos 30 días
router.get('/', auth, soloAdmin, async (_req, res) => {
  try {
    const cajas = await Caja.find().sort({ fecha: -1 }).limit(30);
    res.json(cajas);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/caja/abrir
router.post('/abrir', auth, async (req, res) => {
  try {
    const fecha = hoyPeru();
    const existeAbierta = await Caja.findOne({ fecha, estado: 'abierta' });
    if (existeAbierta) return res.json(existeAbierta);

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

// POST /api/caja/cerrar
router.post('/cerrar', auth, async (req, res) => {
  try {
    const fecha = hoyPeru();
    const caja  = await Caja.findOne({ fecha, estado: 'abierta' });
    if (!caja) return res.status(404).json({ error: 'No hay caja abierta hoy' });

    const inicio = new Date(fecha + 'T05:00:00.000Z');
    const fin    = new Date(inicio); fin.setDate(fin.getDate() + 1);

    const pedidos = await Pedido.find({ pagado: true, creadoEn: { $gte: inicio, $lt: fin } });
    const egresos = await Egreso.find({ fecha });

    // Totales por método de pago
    caja.totalVentas       = pedidos.reduce((s, p) => s + p.total, 0);
    caja.totalEfectivo     = pedidos.filter(p => p.metodoPago === 'efectivo').reduce((s, p) => s + p.total, 0);
    caja.totalYape         = pedidos.filter(p => p.metodoPago === 'yape').reduce((s, p) => s + p.total, 0);
    caja.totalPlin         = pedidos.filter(p => p.metodoPago === 'plin').reduce((s, p) => s + p.total, 0);
    caja.totalTarjeta      = pedidos.filter(p => p.metodoPago === 'tarjeta').reduce((s, p) => s + p.total, 0);
    caja.totalTransferencia = pedidos.filter(p => p.metodoPago === 'transferencia').reduce((s, p) => s + p.total, 0);

    // Totales por tipo de comprobante
    const tickets  = pedidos.filter(p => p.tipoComprobante === 'ticket');
    const boletas  = pedidos.filter(p => p.tipoComprobante === 'boleta');
    const facturas = pedidos.filter(p => p.tipoComprobante === 'factura');
    caja.totalTickets  = tickets.length;
    caja.totalBoletas  = boletas.length;
    caja.totalFacturas = facturas.length;
    caja.montoTickets  = tickets.reduce((s, p) => s + p.total, 0);
    caja.montoBoletas  = boletas.reduce((s, p) => s + p.total, 0);
    caja.montoFacturas = facturas.reduce((s, p) => s + p.total, 0);

    // IGV desglosado (18% incluido en precio)
    caja.subTotal  = Math.round((caja.totalVentas / 1.18) * 100) / 100;
    caja.totalIGV  = Math.round((caja.totalVentas - caja.subTotal) * 100) / 100;

    // Egresos y saldo
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
