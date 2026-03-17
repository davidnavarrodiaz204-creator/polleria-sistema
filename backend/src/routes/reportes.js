const router = require('express').Router();
const Pedido = require('../models/Pedido');
const Delivery = require('../models/Delivery');
const Egreso = require('../models/Egreso');
const Mesa = require('../models/Mesa');
const Cliente = require('../models/Cliente');
const { auth } = require('../middleware/auth');

const hoy = () => new Date().toISOString().split('T')[0];

// ── Resumen del día ────────────────────────────────────────────────────────────
router.get('/resumen', auth, async (_req, res) => {
  try {
    const inicio = new Date(hoy());
    const fin    = new Date(hoy()); fin.setDate(fin.getDate() + 1);

    const [pedidosHoy, deliveryHoy, egresosHoy, mesas, totalClientes] = await Promise.all([
      Pedido.find({ creadoEn: { $gte: inicio, $lt: fin } }),
      Delivery.find({ creadoEn: { $gte: inicio, $lt: fin } }),
      Egreso.find({ fecha: hoy() }),
      Mesa.find({ activa: true }),
      Cliente.countDocuments({ activo: true }),
    ]);

    const ventasHoy    = [...pedidosHoy, ...deliveryHoy].reduce((s, p) => s + (p.total || 0), 0);
    const egresosTotal = egresosHoy.reduce((s, e) => s + e.monto, 0);

    // Ventas por método de pago
    const porMetodo = {};
    pedidosHoy.filter(p => p.pagado).forEach(p => {
      const m = p.metodoPago || 'efectivo';
      porMetodo[m] = (porMetodo[m] || 0) + p.total;
    });

    // Top productos
    const conteo = {};
    pedidosHoy.forEach(p => p.items.forEach(item => {
      conteo[item.nombre] = (conteo[item.nombre] || 0) + item.cantidad;
    }));
    const topProductos = Object.entries(conteo)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }));

    res.json({
      ventasHoy,
      pedidosHoy: pedidosHoy.length + deliveryHoy.length,
      mesasActivas: mesas.filter(m => m.estado !== 'libre').length,
      mesasTotal: mesas.length,
      deliveryActivo: deliveryHoy.filter(d => !['entregado','cancelado'].includes(d.estado)).length,
      egresosHoy: egresosTotal,
      utilidadHoy: ventasHoy - egresosTotal,
      totalClientes,
      porMetodo,
      topProductos,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Ventas por rango de fechas ─────────────────────────────────────────────────
router.get('/ventas', auth, async (req, res) => {
  try {
    const { desde, hasta, periodo = 'semana' } = req.query;

    let fechaDesde, fechaHasta;
    const ahora = new Date();

    if (desde && hasta) {
      fechaDesde = new Date(desde);
      fechaHasta = new Date(hasta); fechaHasta.setDate(fechaHasta.getDate() + 1);
    } else if (periodo === 'semana') {
      fechaDesde = new Date(ahora); fechaDesde.setDate(ahora.getDate() - 7);
      fechaHasta = new Date(ahora); fechaHasta.setDate(ahora.getDate() + 1);
    } else if (periodo === 'mes') {
      fechaDesde = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      fechaHasta = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
    } else {
      fechaDesde = new Date(ahora.getFullYear(), 0, 1);
      fechaHasta = new Date(ahora.getFullYear() + 1, 0, 1);
    }

    const pedidos = await Pedido.find({ creadoEn: { $gte: fechaDesde, $lt: fechaHasta } });
    const egresos = await Egreso.find({
      fecha: { $gte: fechaDesde.toISOString().split('T')[0], $lte: fechaHasta.toISOString().split('T')[0] }
    });

    // Agrupar por día
    const porDia = {};
    pedidos.forEach(p => {
      const dia = new Date(p.creadoEn).toISOString().split('T')[0];
      if (!porDia[dia]) porDia[dia] = { ventas: 0, pedidos: 0, egresos: 0 };
      porDia[dia].ventas  += p.total || 0;
      porDia[dia].pedidos += 1;
    });
    egresos.forEach(e => {
      if (!porDia[e.fecha]) porDia[e.fecha] = { ventas: 0, pedidos: 0, egresos: 0 };
      porDia[e.fecha].egresos += e.monto;
    });

    const diasOrdenados = Object.entries(porDia)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([fecha, data]) => ({ fecha, ...data, utilidad: data.ventas - data.egresos }));

    const totalVentas   = pedidos.reduce((s, p) => s + (p.total || 0), 0);
    const totalEgresos  = egresos.reduce((s, e) => s + e.monto, 0);
    const totalPedidos  = pedidos.length;

    // Por categoría de producto
    const porCategoria = {};
    pedidos.forEach(p => p.items.forEach(item => {
      porCategoria[item.nombre] = (porCategoria[item.nombre] || 0) + item.precio * item.cantidad;
    }));

    res.json({
      totalVentas, totalEgresos, totalPedidos,
      utilidad: totalVentas - totalEgresos,
      porDia: diasOrdenados,
      porCategoria,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

