const router = require('express').Router();
const Pedido = require('../models/Pedido');
const Delivery = require('../models/Delivery');
const Egreso = require('../models/Egreso');
const Mesa = require('../models/Mesa');
const { auth } = require('../middleware/auth');

const hoy = () => new Date().toISOString().split('T')[0];

router.get('/resumen', auth, async (_req, res) => {
  try {
    const inicio = new Date(hoy());
    const fin = new Date(hoy()); fin.setDate(fin.getDate() + 1);

    const [pedidosHoy, deliveryHoy, egresosHoy, mesas] = await Promise.all([
      Pedido.find({ creadoEn: { $gte: inicio, $lt: fin } }),
      Delivery.find({ creadoEn: { $gte: inicio, $lt: fin } }),
      Egreso.find({ fecha: hoy() }),
      Mesa.find({ activa: true }),
    ]);

    const ventasHoy = [...pedidosHoy, ...deliveryHoy].reduce((s, p) => s + (p.total || 0), 0);
    const egresosTotal = egresosHoy.reduce((s, e) => s + e.monto, 0);

    // Ventas por categoría (de los items)
    const porCategoria = {};
    pedidosHoy.forEach(p => p.items.forEach(item => {
      porCategoria[item.nombre] = (porCategoria[item.nombre] || 0) + item.precio * item.cantidad;
    }));

    // Top productos
    const conteo = {};
    pedidosHoy.forEach(p => p.items.forEach(item => {
      conteo[item.nombre] = (conteo[item.nombre] || 0) + item.cantidad;
    }));
    const topProductos = Object.entries(conteo)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }));

    res.json({
      ventasHoy,
      pedidosHoy: pedidosHoy.length + deliveryHoy.length,
      mesasActivas: mesas.filter(m => m.estado !== 'libre').length,
      mesasTotal: mesas.length,
      deliveryActivo: deliveryHoy.filter(d => !['entregado', 'cancelado'].includes(d.estado)).length,
      egresosHoy: egresosTotal,
      utilidadHoy: ventasHoy - egresosTotal,
      topProductos,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
