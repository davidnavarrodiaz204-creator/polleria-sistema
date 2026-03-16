const router = require('express').Router();
const Delivery = require('../models/Delivery');
const Pedido = require('../models/Pedido');
const { auth } = require('../middleware/auth');
const { emit } = require('../config/socket');

router.get('/', auth, async (_req, res) => {
  try {
    const deliveries = await Delivery.find().sort({ creadoEn: -1 }).limit(100);
    res.json(deliveries);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { cliente, telefono, direccion, referencia, items, nota, costoEnvio, metodoPago } = req.body;
    if (!cliente || !direccion) return res.status(400).json({ error: 'Cliente y dirección requeridos' });

    const subtotal = (items || []).reduce((s, i) => s + (i.precio * i.cantidad), 0);
    const total = subtotal + (costoEnvio || 0);

    const delivery = await Delivery.create({
      cliente, telefono, direccion, referencia,
      items: items || [],
      total, costoEnvio: costoEnvio || 0,
      nota: nota || '',
      metodoPago: metodoPago || 'efectivo',
    });

    // Crear pedido de cocina automáticamente
    if (items?.length) {
      const pedido = await Pedido.create({
        tipo: 'delivery',
        deliveryId: delivery._id,
        mozo: req.usuario.nombre,
        items, total,
        nota: nota || '',
      });
      emit.nuevoPedido(req.io, pedido);
    }

    emit.deliveryActualizado(req.io, delivery);
    emit.notificacion(req.io, {
      tipo: 'info',
      titulo: `🛵 Nuevo delivery — ${cliente}`,
      mensaje: `S/ ${total.toFixed(2)} · ${direccion}`,
    });

    res.status(201).json(delivery);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const delivery = await Delivery.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!delivery) return res.status(404).json({ error: 'No encontrado' });
    emit.deliveryActualizado(req.io, delivery);
    emit.notificacion(req.io, {
      tipo: delivery.estado === 'entregado' ? 'success' : 'info',
      titulo: `🛵 Delivery #${delivery.numero} — ${delivery.cliente}`,
      mensaje: `Estado actualizado: ${delivery.estado}`,
    });
    res.json(delivery);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Delivery.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
